(function () {
  const MODEL_COST_PER_1M = {
    'gemini-2.5-flash-preview-05-20': 0.30,
    'gemini-2.5-pro-preview-06-05':   3.50,
    'gemini-2.0-flash': 0.30,
    'gemini-2.0-flash-exp': 0.00,
    'gemini-1.5-flash': 0.15,
    'gemini-1.5-pro': 3.50,
    'gpt-4o': 7.50,
    'gpt-4o-mini': 0.30,
    'gpt-4-turbo': 15.00,
    'claude-sonnet-4-6': 4.50,
    'claude-opus-4-6': 22.50,
    'claude-opus-4-5': 22.50,
    'claude-sonnet-4-5': 4.50,
    'claude-haiku-4-5-20251001': 0.40,
    'mistral-large-latest': 3.00,
    'ministral-14b-latest': 0.40,
    'ministral-8b-latest': 0.10,
    'ministral-3b-latest': 0.04,
    'mistral-small-latest': 0.30,
    'open-mistral-nemo': 0.15,
    'llama-3.3-70b-versatile': 0.00,
    'llama-3.1-8b-instant': 0.00,
    'gemma2-9b-it': 0.00,
  };

  const FALLBACK_CHAINS = {
    gemini: [
      { provider:'gemini', model:'gemini-2.5-flash-preview-05-20', tag:'gemini', label:'Gemini 2.5 Flash' },
      { provider:'gemini', model:'gemini-2.0-flash', tag:'gemini', label:'Gemini 2.0 Flash' },
      { provider:'gemini', model:'gemini-1.5-flash', tag:'gemini', label:'Gemini 1.5 Flash' },
    ],
    openai: [
      { provider:'openai', model:'gpt-4o', tag:'openai', label:'GPT-4o' },
      { provider:'openai', model:'gpt-4o-mini', tag:'openai', label:'GPT-4o mini' },
      { provider:'openai', model:'gpt-4-turbo', tag:'openai', label:'GPT-4 Turbo' },
    ],
    anthropic: [
      { provider:'anthropic', model:'claude-sonnet-4-6', tag:'anthropic', label:'Claude Sonnet 4.6' },
      { provider:'anthropic', model:'claude-haiku-4-5-20251001', tag:'anthropic', label:'Claude Haiku 4.5' },
    ],
    mistral: [
      { provider:'openai', model:'mistral-large-latest', tag:'mistral', label:'Mistral Large' },
      { provider:'openai', model:'mistral-small-latest', tag:'mistral', label:'Mistral Small' },
      { provider:'openai', model:'open-mistral-nemo', tag:'mistral', label:'Mistral Nemo' },
    ],
    groq: [
      { provider:'openai', model:'llama-3.3-70b-versatile', tag:'groq', label:'Llama 3.3 70B' },
      { provider:'openai', model:'llama-3.1-8b-instant', tag:'groq', label:'Llama 3.1 8B' },
      { provider:'openai', model:'gemma2-9b-it', tag:'groq', label:'Gemma2 9B' },
    ],
  };

  function estimateCost(model, tokens) {
    if (!tokens || tokens <= 0) return null;
    const rate = MODEL_COST_PER_1M[model];
    if (rate === undefined) return null;
    return (tokens / 1_000_000) * rate;
  }

  function formatCost(usd) {
    if (usd === null || usd === undefined) return null;
    if (usd === 0) return '$0.00';
    if (usd < 0.000001) return '<$0.000001';
    if (usd < 0.01) return `$${usd.toFixed(5)}`;
    return `$${usd.toFixed(4)}`;
  }

  function isFallbackable(status, message) {
    if ([429, 500, 502, 503, 504, 529].includes(status)) return true;
    const msg = String(message || '').toLowerCase();
    return msg.includes('rate limit') || msg.includes('overloaded') ||
      msg.includes('capacity') || msg.includes('timeout') ||
      msg.includes('quota') || msg.includes('unavailable');
  }

  function setTypingStatus(text) {
    const el = document.getElementById('typing-indicator');
    if (!el) return;
    let label = el.querySelector('.typing-status-label');
    if (!label) {
      label = document.createElement('div');
      label.className = 'typing-status-label';
      label.style.cssText = 'font-size:0.68rem;font-family:"Space Mono",monospace;color:var(--muted);margin-top:0.4rem;';
      el.appendChild(label);
    }
    label.textContent = text;
  }

  async function callSingleModel(modelDef, key, systemInstruction, userMessage, traceLabel, multiTurnMessages) {
    const provider = modelDef.provider;
    const model = modelDef.model;
    const t0 = Date.now();

    const span = {
      id: traceSpans.length,
      label: traceLabel || 'API Call',
      model: modelDef.label || model,
      provider,
      startMs: t0,
      endMs: null,
      durationMs: null,
      status: 'pending',
      isFallback: false,
      tokens: null,
      error: null,
    };
    if (!traceSessionStart) traceSessionStart = t0;
    traceSpans.push(span);
    renderTraceLive();

    const finalize = (status, tokens, error) => {
      span.endMs = Date.now();
      span.durationMs = span.endMs - span.startMs;
      span.status = status;
      span.tokens = tokens || null;
      span.cost = tokens ? estimateCost(modelDef.model, tokens) : null;
      span.error = error || null;
      renderTraceLive();
    };

    try {
      if (typeof window.agentsparkGenerateRequest !== 'function') {
        throw new Error('API client not initialized');
      }

      const levelData = typeof t === 'function' ? t('levels').find((l) => l.id === currentLevel) : null;
      const agentCount = parseInt((levelData?.agentCount || '3').toString().split('-')[0], 10) || 3;

      const data = await window.agentsparkGenerateRequest({
        topic: currentTopic,
        level: currentLevel,
        agentCount,
        modelProvider: provider,
        modelTag: modelDef.tag || provider,
        modelId: model,
        systemInstruction,
        userMessage,
        multiTurnMessages: Array.isArray(multiTurnMessages) ? multiTurnMessages : null,
        clientApiKey: key || null,
      });

      const tokens = data.usage?.totalTokens || null;
      const result = data.text || '';
      finalize('ok', tokens, null);
      return result;
    } catch (err) {
      if (span.status === 'pending') finalize('error', null, err.message);
      throw err;
    }
  }

  async function callGemini(systemInstruction, userMessage, traceLabel, multiTurnMessages) {
    const key = apiKey || document.getElementById('apiKeyInput')?.value?.trim() || '';
    const chain = FALLBACK_CHAINS[selectedModel.tag] || [];
    const primary = { ...selectedModel };
    const rest = chain.filter((m) => m.model !== primary.model);
    const attempts = [primary, ...rest];

    let lastError = null;
    for (let i = 0; i < attempts.length; i++) {
      const attemptModel = attempts[i];
      const spanLabel = traceLabel
        ? (i > 0 ? `${traceLabel} (fallback)` : traceLabel)
        : (i > 0 ? `Fallback #${i}` : 'API Call');

      if (i > 0) {
        setTypingStatus(`⚠ ${attempts[i - 1].label || attempts[i - 1].model} failed — trying ${attemptModel.label || attemptModel.model}…`);
        await new Promise((r) => setTimeout(r, 600));
      }

      try {
        const result = await callSingleModel(attemptModel, key, systemInstruction, userMessage, spanLabel, multiTurnMessages);
        if (i > 0) {
          const span = traceSpans[traceSpans.length - 1];
          if (span) { span.status = 'fallback'; span.isFallback = true; }
          renderTraceLive();
          const modelName = attemptModel.label || attemptModel.model;
          setTimeout(() => showNotif(
            lang === 'en' ? `↩ Fell back to ${modelName}` : `↩ Przełączono na ${modelName}`
          ), 300);
          const badgeEl = document.getElementById('headerModelBadge');
          if (badgeEl) badgeEl.textContent = attemptModel.model + ' (fallback)';
        }
        setTypingStatus('');
        return result;
      } catch (err) {
        lastError = err;
        if (!isFallbackable(err.status, err.message)) {
          console.warn(`[AgentSpark] Non-fallbackable error on ${attemptModel.model}:`, err.message);
          break;
        }
        console.warn(`[AgentSpark] Fallback triggered (${attemptModel.model}): ${err.message}`);
      }
    }

    setTypingStatus('');
    throw lastError || new Error('All models failed');
  }

  window.callGemini = callGemini;
  window._formatCost = formatCost;
})();

