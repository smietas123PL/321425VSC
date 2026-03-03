// ─── ROUTES/GENERATE.JS ──────────────────────────────────────────────────
// Fixed C-03: Added `requireAuth` — unauthenticated callers now get 401.
// Fixed H-03: All provider fetch() calls wrapped with AbortController + 60s timeout.
// Fixed H-06: Server-side length caps on userMessage / multiTurnMessages.
// Fixed M-04: Explicit logging + error response when provider returns non-JSON.

import express from 'express';
import fetch from 'isomorphic-fetch';
import { generateLimiter } from '../middleware/rateLimiter.js';
import { sanitizeString } from '../middleware/validation.js';
import { verifyHmac } from '../middleware/hmac.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../db/models.js';

const router = express.Router();

// H-06: Input length limits
const MAX_USER_MESSAGE_CHARS = 32_000;
const MAX_MULTI_TURN_ITEMS = 50;
const MAX_MULTI_TURN_TOTAL_CHARS = 100_000;

// H-03: Fetch with abort controller and timeout
async function fetchWithTimeout(url, options, timeoutMs = 60_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error(`Provider request timed out after ${timeoutMs / 1000}s`);
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeMode(mode) {
  const m = String(mode || 'hybrid').toLowerCase();
  return ['env', 'byok', 'hybrid'].includes(m) ? m : 'hybrid';
}

function normalizeProviderTag({ modelTag, modelProvider }) {
  const tag = String(modelTag || '').toLowerCase();
  if (['gemini', 'anthropic', 'openai', 'mistral', 'groq'].includes(tag)) return tag;

  const provider = String(modelProvider || '').toLowerCase();
  if (['gemini', 'anthropic', 'openai', 'mistral', 'groq'].includes(provider)) return provider;
  return '';
}

function getServerKey(providerTag) {
  if (providerTag === 'gemini') return process.env.GEMINI_API_KEY || '';
  if (providerTag === 'anthropic') return process.env.ANTHROPIC_API_KEY || '';
  if (providerTag === 'mistral') return process.env.MISTRAL_API_KEY || '';
  if (providerTag === 'groq') return process.env.GROQ_API_KEY || '';
  if (providerTag === 'openai') return process.env.OPENAI_API_KEY || '';
  return '';
}

function resolveApiKey({ providerTag, clientApiKey }) {
  const mode = normalizeMode(process.env.KEY_MODE);
  const serverKey = String(getServerKey(providerTag) || '').trim();
  const userKey = String(clientApiKey || '').trim();

  if (mode === 'env') {
    if (!serverKey) throw new Error(`Missing server key for provider: ${providerTag}`);
    return { apiKey: serverKey, keySource: 'env' };
  }

  if (mode === 'byok') {
    if (!userKey) throw new Error('BYOK required but missing clientApiKey');
    return { apiKey: userKey, keySource: 'byok' };
  }

  // hybrid: prefer server key, fallback to BYOK
  if (serverKey) return { apiKey: serverKey, keySource: 'env' };
  if (userKey) return { apiKey: userKey, keySource: 'byok' };
  throw new Error(`No API key available for provider: ${providerTag}`);
}

function toOpenAiMessages(systemInstruction, userMessage, multiTurnMessages) {
  const msgs = Array.isArray(multiTurnMessages) && multiTurnMessages.length
    ? multiTurnMessages
    : [{ role: 'user', content: userMessage }];

  const out = [];
  if (systemInstruction) out.push({ role: 'system', content: systemInstruction });
  for (const msg of msgs) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    out.push({ role, content: String(msg.content || '') });
  }
  return out;
}

// M-04: Safe JSON parse that returns explicit error details
async function safeParseJson(response) {
  const text = await response.text();
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    console.error('[generate] Provider returned non-JSON body. Status:', response.status, 'Preview:', text.slice(0, 200));
    return { ok: false, data: {}, parseError: true, rawPreview: text.slice(0, 200) };
  }
}

async function proxyGenerate({ providerTag, modelId, apiKey, systemInstruction, userMessage, multiTurnMessages }) {
  if (providerTag === 'gemini') {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      contents: Array.isArray(multiTurnMessages) && multiTurnMessages.length
        ? multiTurnMessages.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(msg.content || '') }],
        }))
        : [{ role: 'user', parts: [{ text: String(userMessage || '') }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
    };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: String(systemInstruction) }] };
    }

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const { ok: parsed, data, parseError } = await safeParseJson(response);
    if (parseError) return { ok: false, status: 502, error: 'Gemini returned malformed response' };
    if (!response.ok) {
      const msg = data.error?.message || `Gemini error ${response.status}`;
      return { ok: false, status: response.status, error: msg };
    }
    return {
      ok: true,
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      tokens: data.usageMetadata?.totalTokenCount || null,
    };
  }

  if (providerTag === 'anthropic') {
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        system: systemInstruction || undefined,
        messages: Array.isArray(multiTurnMessages) && multiTurnMessages.length
          ? multiTurnMessages.map((msg) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: String(msg.content || ''),
          }))
          : [{ role: 'user', content: String(userMessage || '') }],
        max_tokens: 4096,
      }),
    });

    const { ok: parsed, data, parseError } = await safeParseJson(response);
    if (parseError) return { ok: false, status: 502, error: 'Anthropic returned malformed response' };
    if (!response.ok) {
      const msg = data.error?.message || `Anthropic error ${response.status}`;
      return { ok: false, status: response.status, error: msg };
    }
    const usage = data.usage || {};
    return {
      ok: true,
      text: data.content?.[0]?.text || '',
      tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0) || null,
    };
  }

  // OpenAI-compatible: openai / mistral / groq
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  if (providerTag === 'mistral') endpoint = 'https://api.mistral.ai/v1/chat/completions';
  if (providerTag === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: toOpenAiMessages(systemInstruction, userMessage, multiTurnMessages),
      temperature: 0.8,
      max_tokens: 4096,
    }),
  });

  const { ok: parsed, data, parseError } = await safeParseJson(response);
  if (parseError) return { ok: false, status: 502, error: 'Provider returned malformed response' };
  if (!response.ok) {
    const msg = data.error?.message || `Provider error ${response.status}`;
    return { ok: false, status: response.status, error: msg };
  }
  return {
    ok: true,
    text: data.choices?.[0]?.message?.content || '',
    tokens: data.usage?.total_tokens || null,
  };
}

async function handleGenerate(req, res) {
  try {
    const {
      topic,
      level,
      agentCount,
      modelProvider,
      modelId,
      modelTag,
      systemInstruction,
      userMessage,
      multiTurnMessages,
      clientApiKey,
    } = req.body;

    // Validate required fields
    if (!modelId || (!userMessage && (!Array.isArray(multiTurnMessages) || !multiTurnMessages.length))) {
      return res.status(400).json({
        error: 'Missing required fields: modelId and prompt payload',
      });
    }

    if (agentCount && agentCount > 100) {
      return res.status(400).json({ error: 'Maximum 100 agents allowed' });
    }

    // H-06: Enforce server-side length caps
    if (userMessage && String(userMessage).length > MAX_USER_MESSAGE_CHARS) {
      return res.status(400).json({ error: `userMessage exceeds maximum length of ${MAX_USER_MESSAGE_CHARS} characters` });
    }
    if (Array.isArray(multiTurnMessages)) {
      if (multiTurnMessages.length > MAX_MULTI_TURN_ITEMS) {
        return res.status(400).json({ error: `multiTurnMessages exceeds maximum of ${MAX_MULTI_TURN_ITEMS} items` });
      }
      const totalChars = multiTurnMessages.reduce((sum, m) => sum + String(m.content || '').length, 0);
      if (totalChars > MAX_MULTI_TURN_TOTAL_CHARS) {
        return res.status(400).json({ error: `multiTurnMessages total content exceeds ${MAX_MULTI_TURN_TOTAL_CHARS} characters` });
      }
    }

    const providerTag = normalizeProviderTag({ modelTag, modelProvider });
    if (!providerTag) {
      return res.status(400).json({ error: 'Unsupported provider/tag' });
    }

    const cleanTopic = sanitizeString(topic || '');
    const { apiKey, keySource } = resolveApiKey({ providerTag, clientApiKey });

    // Log generation attempt
    await logAudit(req.user?.id, 'GENERATE_AGENTS', 'agents', {
      topic: cleanTopic,
      level,
      agentCount,
      model: `${providerTag}/${modelId}`,
      keySource,
    }, req.ip);

    const proxied = await proxyGenerate({
      providerTag,
      modelId,
      apiKey,
      systemInstruction: String(systemInstruction || '').slice(0, 32_000),
      userMessage: String(userMessage || ''),
      multiTurnMessages: Array.isArray(multiTurnMessages) ? multiTurnMessages : null,
    });

    if (!proxied.ok) {
      await logAudit(req.user?.id, 'GENERATE_ERROR', 'agents', {
        model: `${providerTag}/${modelId}`,
        keySource,
        error: proxied.error,
      }, req.ip);
      return res.status(proxied.status || 500).json({
        error: proxied.error || 'Provider request failed',
      });
    }

    res.json({
      success: true,
      text: proxied.text,
      usage: { totalTokens: proxied.tokens || null },
      provider: providerTag,
      model: modelId,
      keySource,
    });
  } catch (error) {
    console.error('Generate error:', error);
    await logAudit(req.user?.id, 'GENERATE_ERROR', 'agents', {
      error: error.message,
    }, req.ip);

    res.status(error.status || 500).json({
      error: 'Failed to generate agents',
    });
  }
}

// POST /api/v1/generate
// C-03: requireAuth added — unauthenticated callers get 401 before handleGenerate
router.post('/', generateLimiter, verifyHmac, requireAuth, handleGenerate);

// Backward compatibility for old route shape: /api/v1/generate/generate
router.post('/generate', generateLimiter, verifyHmac, requireAuth, handleGenerate);

export default router;
