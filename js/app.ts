import { state } from './core/state';
﻿import * as Sentry from '@sentry/browser';

// ─── SENTRY — conditional init ────────────────────────────
// Only initialize if a real DSN is provided via window.__AGENTSPARK_CONFIG__
// Never init with the placeholder 'examplePublicKey' DSN.
(function initSentry() {
  const config = (window as any).__AGENTSPARK_CONFIG__ || {};
  const dsn: string | undefined = config.SENTRY_DSN;

  const isPlaceholder = !dsn ||
    dsn.includes('examplePublicKey') ||
    dsn.includes('o0.ingest.sentry.io/0') ||
    dsn.trim() === '';

  if (isPlaceholder) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Sentry] No valid DSN configured — error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.2,          // reduce from 1.0 to avoid high quota usage
    replaysSessionSampleRate: 0.05, // 5% of sessions
    replaysOnErrorSampleRate: 1.0,
    environment: (window as any).__AGENTSPARK_CONFIG__?.ENV || 'production',
    beforeSend(event) {
      // Strip API keys from breadcrumbs / request data before sending
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['x-api-key'];
      }
      return event;
    },
  });
})();


// ─── MODEL SELECTION ──────────────────────────────────────
const MODEL_KEY_HINTS: Record<string, { label: string, hint: string, placeholder: string }> = {
  gemini: { label: 'Gemini API Key', hint: 'Key: Google AI Studio → makersuite.google.com', placeholder: 'AIza...' },
  openai: { label: 'OpenAI API Key', hint: 'Key: platform.openai.com/api-keys', placeholder: 'sk-...' },
  anthropic: { label: 'Anthropic API Key', hint: 'Key: console.anthropic.com/settings/keys', placeholder: 'sk-ant-...' },
  mistral: { label: 'Mistral API Key', hint: 'Key: console.mistral.ai/api-keys', placeholder: 'your-mistral-key' },
  groq: { label: 'Groq API Key', hint: 'Key: console.groq.com/keys', placeholder: 'gsk_...' },
};

function onModelChange() {
  const sel = (document.getElementById('modelSelect') as HTMLSelectElement);
  if (!sel) return;
  const parts = sel.value.split('|');
  const label = sel.options[sel.selectedIndex]?.text || parts[1];
  state.selectedModel = { provider: parts[0], model: parts[1], endpoint: parts[2], tag: parts[3], label } as any;

  const info = MODEL_KEY_HINTS[state.selectedModel.tag] || MODEL_KEY_HINTS.gemini;
  const labelEl = (document.getElementById('apiKeyLabel') as HTMLElement);
  const hintEl = (document.getElementById('modelHint') as HTMLElement);
  const inputEl = (document.getElementById('apiKeySetupInput') as HTMLInputElement);
  const headerInputEl = (document.getElementById('apiKeyInput') as HTMLInputElement);

  if (labelEl) labelEl.textContent = info.label;
  if (hintEl) hintEl.innerHTML = `${info.hint}<br/><span style="color:var(--muted)">${tr('Stored only for this session', 'Przechowywany tylko w tej sesji')}</span>`;
  if (inputEl) inputEl.placeholder = info.placeholder;
  if (headerInputEl) headerInputEl.placeholder = info.label;

  // Reset key when switching provider
  state.apiKey = '';
  if (inputEl) inputEl.value = '';
  const status = (document.getElementById('apiKeySetupStatus') as HTMLElement);
  if (status) { status.textContent = ''; status.className = 'api-key-status'; }
}

// ─── API KEY ──────────────────────────────────────────────
function syncApiKey(val: string) {
  state.apiKey = val.trim();
  const headerInput = (document.getElementById('apiKeyInput') as HTMLInputElement);
  if (headerInput) headerInput.value = state.apiKey;
  if (state.apiKey.length > 10) {
    sessionStorage.setItem('agentspark-api-key', state.apiKey);
    localStorage.removeItem('agentspark-api-key');
    const demoCta = (document.getElementById('demo-cta') as HTMLElement);
    if (demoCta) demoCta.style.display = 'none';
    _resetApiKeyInactivityTimer();
  } else {
    sessionStorage.removeItem('agentspark-api-key');
    _clearApiKeyInactivityTimer();
  }
  checkApiKey();
}

let _apiKeyInactivityTimeout: ReturnType<typeof setTimeout> | null = null;
function _clearApiKeyInactivityTimer() {
  if (_apiKeyInactivityTimeout) {
    clearTimeout(_apiKeyInactivityTimeout);
    _apiKeyInactivityTimeout = null;
  }
}
function _resetApiKeyInactivityTimer() {
  _clearApiKeyInactivityTimer();
  // Clear API key after 15 minutes of inactivity
  _apiKeyInactivityTimeout = setTimeout(() => {
    state.apiKey = '';
    sessionStorage.removeItem('agentspark-api-key');
    showNotif(tr('⏳ Session expired. API Key cleared for security.', '⏳ Sesja wygasła. Klucz API został wyczyszczony.'));
    checkApiKey();
  }, 15 * 60 * 1000);
}

// Reset timer on user activity
document.addEventListener('mousemove', () => { if (state.apiKey.length > 10) _resetApiKeyInactivityTimer(); }, { passive: true });
document.addEventListener('keydown', () => { if (state.apiKey.length > 10) _resetApiKeyInactivityTimer(); }, { passive: true });

function checkApiKey() {
  const val = state.apiKey || (document.getElementById('apiKeySetupInput') as HTMLInputElement)?.value?.trim() || '';
  state.apiKey = val;
  const status = (document.getElementById('apiKeySetupStatus') as HTMLElement);
  if (val.length > 10) {
    if (status) { status.textContent = '✓ Key set'; status.className = 'api-key-status ok'; }
    _updateApiKeyDot('ready');
  } else {
    if (status) { status.textContent = ''; status.className = 'api-key-status'; }
    _updateApiKeyDot('');
  }
}

// ─── TOPIC SCREEN ─────────────────────────────────────────
function renderLevelGrid() {
  const grid = (document.getElementById('level-grid') as HTMLElement);
  if (!grid) return;
  grid.innerHTML = '';
  const label = (document.getElementById('level-section-label') as HTMLElement);
  if (label) label.textContent = state.lang === 'en' ? 'COMPLEXITY LEVEL' : 'POZIOM ZŁOŻONOŚCI';

  t('levels').forEach((level: any) => {
    const div = document.createElement('div');
    div.className = 'level-card' + (state.currentLevel === level.id ? ' selected' : '');
    div.style.borderColor = state.currentLevel === level.id ? level.color : '';
    div.style.boxShadow = state.currentLevel === level.id ? `0 0 20px ${level.color}33` : '';
    div.innerHTML = `
      <span class="level-emoji">${level.emoji}</span>
      <div class="level-name" style="color:${level.color}">${level.name}</div>
      <div class="level-tagline">${level.tagline}</div>
      <div class="level-agents" style="color:${level.color};border-color:${level.color}33;background:${level.color}11">
        ${level.agentCount} ${state.lang === 'en' ? 'agents' : 'agentów'}
      </div>
    `;
    div.title = level.desc;
    div.tabIndex = 0;
    div.setAttribute('role', 'radio');
    div.setAttribute('aria-checked', state.currentLevel === level.id ? 'true' : 'false');
    div.onclick = () => {
      state.currentLevel = level.id;
      state.MAX_QUESTIONS = level.questions;
      renderLevelGrid();
    };
    div.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
    grid.appendChild(div);
  });
}

let activeTopicCat = 'all';

function renderTopicScreen() {
  renderLevelGrid();
  (document.getElementById('badge-text') as HTMLElement).textContent = t('badge');
  (document.getElementById('hero-title') as HTMLElement).innerHTML = t('heroTitle');
  (document.getElementById('hero-sub') as HTMLElement).textContent = t('heroSub');
  (document.getElementById('or-text') as HTMLElement).textContent = t('orText');
  (document.getElementById('start-btn') as HTMLElement).textContent = t('startBtn');

  // Render category filters as iOS segmented control
  const filtersEl = (document.getElementById('template-filters') as HTMLElement);
  filtersEl.innerHTML = '';
  const seg = document.createElement('div');
  seg.className = 'ios-segmented';
  // Limit to first 5 to fit in segmented control
  const cats = t('topicCats').slice(0, 5);
  cats.forEach((cat: any) => {
    const btn = document.createElement('button');
    btn.className = 'ios-seg-btn' + (activeTopicCat === cat.id ? ' active' : '');
    btn.textContent = cat.label;
    btn.onclick = () => {
      activeTopicCat = cat.id;
      renderTopicScreen();
    };
    seg.appendChild(btn);
  });
  filtersEl.appendChild(seg);

  // Render topic cards
  const grid = (document.getElementById('topic-grid') as HTMLElement);
  grid.innerHTML = '';
  t('topics').forEach((topic: any) => {
    const div = document.createElement('div');
    div.className = 'topic-card' + (activeTopicCat !== 'all' && topic.cat !== activeTopicCat ? ' hidden' : '');
    div.innerHTML = `
      <div class="time-badge">${topic.time}</div>
      <div class="icon">${topic.icon}</div>
      <div class="label">${topic.label}</div>
      <div class="sub">${topic.sub}</div>
      <div class="agents-preview">⚡ ${topic.agents}</div>
    `;
    div.onclick = () => { (document.getElementById('customTopic') as HTMLInputElement).value = topic.label; startWithTopic(); };
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
    grid.appendChild(div);
  });
}

function startWithTopic() {
  const val = (document.getElementById('apiKeySetupInput') as HTMLInputElement).value.trim();
  state.apiKey = val;
  if (!state.apiKey || state.apiKey.length < 10) {
    showNotif(
      tr(
        'ℹ No BYOK provided — backend server key will be used if configured',
        'ℹ Nie podano BYOK — backend użyje klucza serwerowego, jeśli skonfigurowany'
      )
    );
  }
  const topic = (document.getElementById('customTopic') as HTMLInputElement).value.trim();
  if (!topic) {
    showNotif(state.lang === 'en' ? '⚠ Please select or enter a topic' : '⚠ Wybierz lub wpisz temat', true);
    return;
  }
  state.currentTopic = topic;
  startChat();
}

// ─── CHAT SCREEN ──────────────────────────────────────────
// --- INTERVIEW FLOW MOVED TO js/features/interview.js ---

function getSystemPrompt() {
  const levelData = t('levels').find((l: any) => l.id === state.currentLevel) || t('levels')[0];
  return `You are AgentSpark, an expert AI system designer. Your job is to interview the user about their app idea using CLOSED questions with multiple choice answers.

Language: ${state.lang === 'en' ? 'English' : 'Polish'}
App topic: ${state.currentTopic}
Complexity level: ${levelData.name} — ${levelData.tagline}
Agent count to generate: ${levelData.agentCount}
Focus areas for this level: ${levelData.focus}

INTERVIEW STRUCTURE — ${state.MAX_QUESTIONS} questions total, split into 3 adaptive sections:

SECTION 1 — BUSINESS (first ${Math.ceil(state.MAX_QUESTIONS * 0.3)} questions):
Focus: target users, monetization model, core value proposition, market.
Example topics: who uses the app, how it makes money, what problem it solves, main competitors.

SECTION 2 — FRONTEND (next ${Math.ceil(state.MAX_QUESTIONS * 0.35)} questions):
Focus: UI paradigm, navigation, key user flows, device targets, design priorities.
Example topics: onboarding flow, main screens, mobile vs web, key interactions.

SECTION 3 — BACKEND (remaining questions):
Focus: data storage, auth, external APIs, scalability, infrastructure.
Example topics: authentication method, data model, third-party integrations, hosting preferences.

ADAPTIVE RULES — CRITICAL:
- Each question MUST reference or build on previous answers. Never ask in a vacuum.
- If user chose "mobile-first" → ask about offline mode or push notifications next.
- If user chose "subscription model" → ask about billing provider and free tier strategy.
- If user chose "social login" → ask about user profile data needs.
- Questions must form a coherent decision tree that leads to a buildable specification.
- Calibrate depth: ${levelData.name} level — ${levelData.focus}
- For Spark: friendly, no jargon. For Flame: balanced. For Fire: technical. For Inferno: enterprise-deep.
- Always track what has been decided and reference it explicitly in the next question.

RESPONSE FORMAT — for EVERY question respond with ONLY this JSON, no extra text:
{
  "section": "Business" | "Frontend" | "Backend",
  "question": "Your question here — referencing prior choices where relevant?",
  "options": [
    { "label": "A", "text": "Option A text", "impact": "1 sentence: concrete consequence for the app under 15 words" },
    { "label": "B", "text": "Option B text", "impact": "1 sentence: concrete consequence for the app under 15 words" },
    { "label": "C", "text": "Option C text", "impact": "1 sentence: concrete consequence for the app under 15 words" },
    { "label": "D", "text": "Option D text", "impact": "1 sentence: concrete consequence for the app under 15 words" }
  ]
}

After exactly ${state.MAX_QUESTIONS} questions respond with ONLY:
{ "complete": true, "summary": "Coherent 3-4 sentence spec summary covering business model, frontend approach, and backend architecture based on all answers." }

IMPORTANT: Pure JSON only. No markdown. No text outside JSON. Make every question feel like the natural next step after the previous answer.

GENERATION PHASE (when you receive [GENERATE]):
Respond with a JSON object ONLY, no markdown, no explanation. Format:
{
  "agents": [
    {
      "id": "slug-name",
      "name": "Agent Name",
      "emoji": "🤖",
      "type": "technical",
      "role": "ROLE_LABEL",
      "description": "What this agent does",
      "agentMd": "# Agent: Name\\n\\n## Identity\\n...\\n\\n## Goal\\n...\\n\\n## Personality\\n...\\n\\n## Context\\n...",
      "skillMd": "# Skill: Name\\n\\n## Capabilities\\n...\\n\\n## Instructions\\n...\\n\\n## Tools\\n...\\n\\n## Output Format\\n..."
    }
  ],
  "teamConfig": "# Team Configuration\\n\\n## Architecture\\n...\\n\\n## Agent Connections\\n...\\n\\n## Orchestration Mode\\n...\\n\\n## Workflow\\n..."
}

AGENT TYPES — you MUST generate both types:
- "technical" agents: builders who directly help code and implement the app
- "business" agents: strategists who provide context, validation and guidance

Distribute agent types based on level:
- Spark: 2 technical, 1 business
- Flame: 2 technical, 2 business
- Fire: 3 technical, 2 business
- Inferno: 4 technical, 2 business

Make agent files detailed and professional. Each agent should be genuinely useful for the specific app described.`;
}

function selectOption(label: string, text: string) {
  // Mark all choice cards in the last choices-msg
  const msgs = document.querySelectorAll('.choices-msg');
  const last = msgs[msgs.length - 1];
  if (last) {
    last.querySelectorAll('.choice-wrap').forEach(w => {
      const card = w.querySelector('.choice-card');
      if (card) {
        if ((card as HTMLElement).dataset.label === label) {
          w.classList.add('selected');
          card.classList.add('selected');
        } else {
          card.classList.add('disabled');
        }
      }
    });
  }
  setTimeout(() => submitAnswer(label + ') ' + text), 400);
}

async function submitAnswer(answer: string) {
  clearOptions();
  addMessage('user', answer);
  state.chatHistory.push({ role: 'user', text: answer });
  state.questionCount++;

  if (state.conversationState === 'interview') {
    addTypingIndicator();
    try {
      const history = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
      const prompt = `${history}\n\nThis was answer ${state.questionCount} of ${state.MAX_QUESTIONS}. Ask next question or finalize.`;
      const reply = await callGemini(getSystemPrompt(), prompt, `🎤 Interview · Q${state.questionCount} of ${state.MAX_QUESTIONS}`, []);
      removeTypingIndicator();

      // Parse JSON response
      let parsed = null;
      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (e) { /* fallback below */ }

      if (parsed && parsed.complete) {
        // Interview complete
        if (parsed.summary) addMessage('ai', parsed.summary);
        state.chatHistory.push({ role: 'ai', text: parsed.summary || 'Interview complete.' });
        state.conversationState = 'generating';
        renderProgressSteps(1);
        clearOptions();
        setTimeout(generateAgents, 1200);
      } else if (parsed && parsed.question && parsed.options) {
        // Valid question JSON — show question as AI message, options as cards
        addMessage('ai', parsed.question);
        state.chatHistory.push({ role: 'ai', text: parsed.question });
        renderOptions(parsed);
      } else {
        // Fallback: show raw reply and try legacy parse
        addMessage('ai', reply);
        state.chatHistory.push({ role: 'ai', text: reply });
        if (reply.includes('[INTERVIEW_COMPLETE]') || state.questionCount >= state.MAX_QUESTIONS) {
          state.conversationState = 'generating';
          renderProgressSteps(1);
          clearOptions();
          setTimeout(generateAgents, 1200);
        } else {
          renderOptionsLegacy(reply);
        }
      }
    } catch (err: any) {
      removeTypingIndicator();
      addMessage('ai', `Error: ${err.message}`);
    }
  }
}

function _buildChoiceCard(label: string, optText: string, impact: string | null) {
  const wrap = document.createElement('div');
  wrap.className = 'choice-wrap';

  const card = document.createElement('button');
  card.className = 'choice-card';
  card.dataset.label = label;

  const labelEl = document.createElement('span');
  labelEl.className = 'choice-label';
  labelEl.textContent = label;

  const textEl = document.createElement('span');
  textEl.className = 'choice-text';
  textEl.textContent = optText;

  card.appendChild(labelEl);
  card.appendChild(textEl);

  if (impact) {
    const infoBtn = document.createElement('button');
    infoBtn.className = 'choice-info-btn';
    infoBtn.title = 'Show details';
    infoBtn.textContent = 'ℹ️';
    const impactEl = document.createElement('div');
    impactEl.className = 'choice-impact';
    impactEl.textContent = impact;
    infoBtn.onclick = (e) => {
      e.stopPropagation();
      impactEl.classList.toggle('visible');
    };
    card.appendChild(infoBtn);
    wrap.appendChild(card);
    wrap.appendChild(impactEl);
  } else {
    wrap.appendChild(card);
  }

  card.onclick = () => selectOption(label, optText);
  return wrap;
}

function renderOptions(parsed: any) {
  // parsed is a JSON object: { question, options: [{label, text, impact}] }
  if (!parsed || !parsed.options) return;
  const panel = (document.getElementById('question-panel') as HTMLElement);
  const panelText = (document.getElementById('question-panel-text') as HTMLElement);
  const panelChoices = (document.getElementById('question-panel-choices') as HTMLElement);
  if (!panel || !panelText || !panelChoices) return;

  // Show section badge if present
  let sectionBadge = panel.querySelector('.question-section-badge');
  if (!sectionBadge) {
    sectionBadge = document.createElement('div');
    sectionBadge.className = 'question-section-badge';
    panel.insertBefore(sectionBadge, panel.firstChild);
  }
  const sectionIcons: Record<string, string> = { Business: '💼', Frontend: '🎨', Backend: '⚙️' };
  if (parsed.section) {
    (sectionBadge as HTMLElement).textContent = (sectionIcons[parsed.section] || '') + ' ' + parsed.section;
    (sectionBadge as HTMLElement).style.display = 'inline-block';
  } else {
    (sectionBadge as HTMLElement).style.display = 'none';
  }

  panelText.textContent = parsed.question || '';
  panelChoices.innerHTML = '';
  parsed.options.forEach((opt: any) => {
    panelChoices.appendChild(_buildChoiceCard(opt.label, opt.text, opt.impact || null));
  });
  panel.style.display = 'flex';

  const chatEl = (document.getElementById('chat-messages') as HTMLElement);
  if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
}

function renderOptionsLegacy(text: string) {
  // Fallback for non-JSON AI responses
  const matches = [...text.matchAll(/([A-D])\)\s*(.+?)(?=\n[A-D]\)|$)/gs)];
  if (matches.length === 0) return;
  const panel = (document.getElementById('question-panel') as HTMLElement);
  const panelText = (document.getElementById('question-panel-text') as HTMLElement);
  const panelChoices = (document.getElementById('question-panel-choices') as HTMLElement);
  if (!panel) return;
  panelText.textContent = '';
  panelChoices.innerHTML = '';
  matches.forEach(m => {
    const label = m[1];
    const full = m[2].trim().replace(/\n/g, ' ');
    const parts = full.split(/\s*\|\s*IMPACT:\s*/i);
    panelChoices.appendChild(_buildChoiceCard(label, parts[0].trim(), parts[1] ? parts[1].trim() : null));
  });
  panel.style.display = 'flex';
}

function clearOptions() {
  const panel = (document.getElementById('question-panel') as HTMLElement);
  if (panel) panel.style.display = 'none';
  const panelChoices = (document.getElementById('question-panel-choices') as HTMLElement);
  if (panelChoices) panelChoices.innerHTML = '';
}

async function generateScoring(history: string) {
  const lvl = t('levels').find((l: any) => l.id === state.currentLevel);
  const scoringPrompt = `You are a project complexity analyst. Based on this interview about the app "${state.currentTopic}", generate a project scoring report.

Interview:
${history}

Chosen level: ${lvl ? lvl.name : state.currentLevel}

Respond ONLY with a JSON object, no markdown:
{
  "overallScore": 72,
  "overallLabel": "Medium-High Complexity",
  "metrics": [
    { "label": "Technical Complexity", "value": 80, "color": "#f2b90d" },
    { "label": "Business Complexity", "value": 60, "color": "#e05a1a" },
    { "label": "Integration Needs", "value": 70, "color": "#c49a0a" },
    { "label": "Scalability Demand", "value": 55, "color": "#7cc42a" }
  ],
  "risks": ["Risk 1 in 10 words max", "Risk 2", "Risk 3"],
  "levelMatch": "ok",
  "levelSuggestion": "Your chosen level matches the project complexity well.",
  "suggestedLevel": "${state.currentLevel}"
}

levelMatch must be: "ok", "upgrade", or "downgrade".
suggestedLevel must be one of: iskra, plomien, pozar, inferno.
Keep risks under 12 words each. Be specific to this project.
Language: ${state.lang === 'en' ? 'English' : 'Polish'}`;

  try {
    const raw = await callGemini('You are a project analyst. Return only JSON.', scoringPrompt, '📊 Scoring · Complexity analysis', []);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (e) {
    console.warn('Scoring failed:', e);
    return null;
  }
}

function renderScoring(data: any) {
  if (!data) return;
  const panel = (document.getElementById('scoring-panel') as HTMLElement);
  panel.style.display = 'block';

  const scoreColor = data.overallScore >= 75 ? 'var(--accent2)' : data.overallScore >= 50 ? '#f59e0b' : 'var(--success)';
  const isWarn = data.levelMatch !== 'ok';
  const suggestedLvl = t('levels').find((l: any) => l.id === data.suggestedLevel);

  const _metricInfo: Record<string, any> = {
    'Technical Complexity': { low: '0–40: Simple tech stack, mostly standard tools.', mid: '40–70: Custom logic, APIs or real-time features needed.', high: '70–100: Complex architecture, microservices or AI.' },
    'Business Complexity': { low: '0–40: Straightforward model, few stakeholders.', mid: '40–70: Multiple user roles or revenue streams.', high: '70–100: Complex ops, compliance or multi-market.' },
    'Integration Needs': { low: '0–40: Few or no external services required.', mid: '40–70: Several APIs like payments or auth needed.', high: '70–100: Heavy integrations, real-time data sync.' },
    'Scalability Demand': { low: '0–40: Small user base, no scaling pressure.', mid: '40–70: Growth expected, some infrastructure planning.', high: '70–100: High traffic, distributed systems required.' },
  };
  const metricsHTML = (data.metrics || []).map((m: any) => {
    const info = _metricInfo[m.label] || {};
    const tier = m.value < 40 ? info.low : m.value < 70 ? info.mid : info.high;
    const tipId = 'tip-' + m.label.replace(/\s+/g, '-');
    const infoBtn = tier ? '<button class="metric-info-btn" onclick="document.getElementById(\'' + tipId + '\').classList.toggle(\'visible\')" title="What does this mean?">\u2139\ufe0f</button>' : '';
    const tipDiv = tier ? '<div class="metric-tip" id="' + tipId + '">' + tier + '</div>' : '';
    return '<div class="score-metric">'
      + '<div class="score-metric-label">' + m.label + infoBtn + '</div>'
      + tipDiv
      + '<div class="score-metric-bar"><div class="score-metric-fill" style="width:0%;background:' + m.color + '" data-target="' + m.value + '"></div></div>'
      + '<div class="score-metric-value">' + m.value + '/100</div>'
      + '</div>';
  }).join('');

  const risksHTML = (data.risks || []).map((r: any) => `<div class="risk-item">${r}</div>`).join('');
  const suggestionIcon = data.levelMatch === 'upgrade' ? '⬆' : data.levelMatch === 'downgrade' ? '⬇' : '✓';

  panel.innerHTML = `
    <div class="scoring-header">
      <h3>${state.lang === 'en' ? 'PROJECT SCORING' : 'OCENA PROJEKTU'}</h3>
      <div class="score-badge">
        <div class="score-number" style="color:${scoreColor}">${data.overallScore}</div>
        <div class="score-label"><strong>${data.overallLabel}</strong>${state.lang === 'en' ? 'out of 100' : 'na 100'}</div>
      </div>
    </div>
    <div class="scoring-grid">${metricsHTML}</div>
    ${risksHTML ? `<div class="scoring-risks"><h4>${state.lang === 'en' ? '⚠ POTENTIAL RISKS' : '⚠ POTENCJALNE RYZYKA'}</h4>${risksHTML}</div>` : ''}
    <div class="level-suggestion ${isWarn ? 'warn' : ''}">
      <span class="ls-icon">${suggestionIcon}</span>
      <span>${data.levelSuggestion}${suggestedLvl && isWarn ? ' <strong>→ ' + suggestedLvl.name + '</strong>' : ''}</span>
    </div>
  `;

  // Single-frame rAF to trigger CSS transition after DOM paint
  requestAnimationFrame(() => {
    if (!(document.getElementById('screen-results') as HTMLElement).classList.contains('active')) return;
    panel.querySelectorAll('.score-metric-fill').forEach((bar: any) => {
      setTimeout(() => { bar.style.width = (bar.dataset.target || 0) + '%'; }, 100);
    });
  });
}

async function generateAgents() {
  if (window._isGeneratingTeam) return;
  window._isGeneratingTeam = true;
  const startBtn = (document.getElementById('start-btn') as HTMLButtonElement);
  const regenBtns = Array.from(document.querySelectorAll('button[onclick*="regenerateTeam"]')) as HTMLButtonElement[];
  if (startBtn) startBtn.disabled = true;
  regenBtns.forEach((b: HTMLButtonElement) => { b.disabled = true; });
  addTypingIndicator();
  if (typeof showLoader === 'function') showLoader(state.lang === 'en' ? 'Generating team...' : 'Generowanie zespołu...', true);
  const history = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
  const prompt = `Here is the complete interview:\n${history}\n\n[GENERATE]\nGenerate the agent team JSON now based on the interview.`;

  try {
    const levelData = t('levels').find((l: any) => l.id === state.currentLevel) || t('levels')[0];
    const raw = await callGemini(getSystemPrompt(), prompt, `⚡ Generate Team · ${levelData.agentCount} agents · ${state.currentLevel}`, []);
    removeTypingIndicator();
    if (typeof hideLoader === 'function') hideLoader();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse agent data');
    const data = JSON.parse(jsonMatch[0]);

    state.generatedAgents = data.agents || [];
    state.generatedFiles = {} as Record<string, string>;

    state.generatedAgents.forEach((a: any) => {
      state.generatedFiles[`agent-${a.id}.md`] = a.agentMd || `# Agent: ${a.name}\n\n**Role:** ${a.role || ''}\n\n${a.description || ''}`;
      state.generatedFiles[`skill-${a.id}.md`] = a.skillMd || `# Skill: ${a.name}\n\n## Capabilities\n\n${a.description || ''}`;
    });
    state.generatedFiles['team-config.md'] = data.teamConfig || `# Team Configuration\n\n**Project:** ${state.currentTopic}\n\n## Agents\n\n${state.generatedAgents.map(a => `- **${a.name}** (${a.role || a.id})`).join('\n')}`;
    state.generatedFiles['README.md'] = generateReadme();
    trackEvent('team_generated', {
      success: true,
      agents: state.generatedAgents.length,
      level: state.currentLevel
    });

    window._scoringData = undefined;
    const historyForScoring = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
    generateScoring(historyForScoring).then(scoreData => {
      window._scoringData = scoreData;
    });

    renderProgressSteps(3);
    addMessage('ai', state.lang === 'en'
      ? `✅ Done! I've designed ${state.generatedAgents.length} specialized agents for your "${state.currentTopic}" app. Your files are ready — switching to results view now!`
      : `✅ Gotowe! Zaprojektowałem ${state.generatedAgents.length} wyspecjalizowanych agentów dla Twojej aplikacji "${state.currentTopic}". Pliki są gotowe — przechodzę do widoku wyników!`
    );

    setTimeout(() => {
      // Seed v1 "Origin" snapshot
      state.versionHistory = [] as any[];
      state.versionHistory.push({
        id: Date.now(),
        label: state.lang === 'en' ? `Original team — ${state.currentTopic}` : `Oryginalny zespół — ${state.currentTopic}`,
        ts: new Date(),
        agents: JSON.parse(JSON.stringify(state.generatedAgents)),
        files: JSON.parse(JSON.stringify(state.generatedFiles)),
        diff: { added: [], removed: [], changed: [] },
        removedNames: {},
        agentNames: Object.fromEntries(state.generatedAgents.map((a: any) => [a.id, a.name])),
        vNum: 1,
        isOrigin: true,
      });
      showResults();
    }, 1800);
  } catch (err: any) {
    removeTypingIndicator();
    if (typeof hideLoader === 'function') hideLoader();
    addMessage('ai', `Generation error: ${err.message}. Please try again.`);
    trackEvent('team_generated', {
      success: false,
      reason: String(err?.message || 'generation_error').slice(0, 120)
    });
  } finally {
    window._isGeneratingTeam = false;
    if (startBtn) startBtn.disabled = false;
    regenBtns.forEach((b: HTMLButtonElement) => { b.disabled = false; });
  }
}

function generateReadme() {
  const technical = (state.generatedAgents as any[]).filter(a => a.type === 'technical');
  const business = (state.generatedAgents as any[]).filter(a => a.type !== 'technical');
  const techList = technical.map(a => `- **${a.name}** [TECHNICAL] (${a.role}): ${a.description}`).join('\n');
  const bizList = business.map(a => `- **${a.name}** [BUSINESS] (${a.role}): ${a.description}`).join('\n');
  const lvl = t('levels').find((l: any) => l.id === state.currentLevel);
  return `# AgentSpark — Generated Team\n\n**Project:** ${state.currentTopic}\n**Level:** ${lvl ? lvl.name : state.currentLevel}\n**Generated:** ${new Date().toLocaleString()}\n**Language:** ${state.lang.toUpperCase()}\n\n## ⚙️ Technical Agents\n\n${techList || 'none'}\n\n## 💼 Business Agents\n\n${bizList || 'none'}\n\n## Files\n\n${Object.keys(state.generatedFiles).filter(f => f !== 'README.md').map(f => `- \`${f}\``).join('\n')}\n\n## How to use\n\nSee instructions inside the app or visit agentspark docs\n`;
}


// ─── REFINE MODE ─────────────────────────────────────────────
let refineSnapshots: any[] = [];      // legacy — kept for revertLastRefine compat
var versionHistory: any[] = [];      // rich version objects: { id, label, ts, agents, files, diff }
let selectedRefineAction: any = null;
let versionPanelOpen = false;

// ─── TRACE STATE ──────────────────────────────────────────
let traceSpans: any[] = [];           // all recorded API spans
let tracePanelOpen = false;
let traceSessionStart: any = null;  // epoch ms of first span in current session

function openRefine() {
  const panel = (document.getElementById('refine-panel') as HTMLElement);
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  (document.getElementById('refine-title') as HTMLElement).textContent = t('refineTitle');
  (document.getElementById('refine-sub') as HTMLElement).textContent = t('refineSub');
  (document.getElementById('refine-input') as HTMLInputElement).placeholder = t('refinePlaceholder');
  (document.getElementById('refine-submit-label') as HTMLElement).textContent = t('refineApply');

  // Always start at step 1
  const s1 = (document.getElementById('refine-step1') as HTMLElement);
  const s2 = (document.getElementById('refine-step2') as HTMLElement);
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  const applyBtn = (document.getElementById('refine-apply-btn') as HTMLElement);
  if (applyBtn) applyBtn.style.display = 'none';
  (document.getElementById('refine-history') as HTMLElement).innerHTML = '';
  state._pendingRefineData = null;

  const chips = (document.getElementById('refine-action-chips') as HTMLElement);
  chips.innerHTML = '';
  t('refineActions').forEach((action: any) => {
    const chip = document.createElement('button');
    chip.className = 'refine-chip' + (selectedRefineAction === action.id ? ' active' : '');
    chip.dataset.id = action.id;
    chip.innerHTML = `<span>${action.emoji}</span><span>${action.label}</span>`;
    chip.title = action.desc;
    chip.onclick = () => {
      selectedRefineAction = action.id;
      chips.querySelectorAll('.refine-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const ta = (document.getElementById('refine-input') as HTMLInputElement);
      if (!ta.value.trim()) {
        const hints: Record<string, string> = {
          improve: state.lang === 'en' ? 'Improve overall agent descriptions and add more specific skills...' : 'Ulepsz opisy agentów i dodaj bardziej szczegółowe umiejętności...',
          add: state.lang === 'en' ? 'Add a [type] agent that handles [responsibility]...' : 'Dodaj agenta [typ] który zajmuje się [odpowiedzialność]...',
          remove: state.lang === 'en' ? 'Remove the [agent name] agent and redistribute its responsibilities...' : 'Usuń agenta [nazwa] i redystrybuuj jego obowiązki...',
          connections: state.lang === 'en' ? 'Change the connection so that [agent A] sends results directly to [agent B]...' : 'Zmień połączenie tak żeby [agent A] wysyłał wyniki bezpośrednio do [agent B]...',
        };
        ta.value = '';
        ta.placeholder = hints[action.id] || t('refinePlaceholder');
      }
      ta.focus();
    };
    chips.appendChild(chip);
  });

  updateRefineCounter();
}

function closeRefine() {
  (document.getElementById('refine-panel') as HTMLElement).style.display = 'none';
  selectedRefineAction = null;
  state._pendingRefineData = null;
  // Reset to step 1
  const s1 = (document.getElementById('refine-step1') as HTMLElement);
  const s2 = (document.getElementById('refine-step2') as HTMLElement);
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
  const applyBtn = (document.getElementById('refine-apply-btn') as HTMLElement);
  if (applyBtn) applyBtn.style.display = 'none';
  if (state.isRefining) {
    state.isRefining = false;
    (document.getElementById('refine-submit-btn') as HTMLButtonElement).disabled = false;
    removeRefineThinking();
  }
}

function updateRefineCounter() {
  const count = refineSnapshots.length;
  const counter = (document.getElementById('refine-counter') as HTMLElement);
  const revertBtn = (document.getElementById('refine-revert-btn') as HTMLElement);
  // ── FIX: was missing quotes around 'ę' causing SyntaxError ──
  if (state.lang === 'pl') {
    const suffix = count === 1 ? 'ę' : count > 1 && count < 5 ? 'e' : 'i';
    counter.textContent = count > 0 ? `Wykonano ${count} rewizj${suffix}` : '';
  } else {
    counter.textContent = count > 0 ? `${count} revision${count > 1 ? 's' : ''} made` : '';
  }
  revertBtn.style.display = count > 0 ? 'block' : 'none';
}

function addRefineMessage(role: string, html: string) {
  const history = (document.getElementById('refine-history') as HTMLElement);
  const div = document.createElement('div');
  div.className = `refine-msg ${role}`;
  div.innerHTML = `
    <div class="refine-msg-sender">${role === 'ai' ? '⚡ AgentSpark' : (state.lang === 'en' ? 'You' : 'Ty')}</div>
    <div class="refine-bubble">${html}</div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function addRefineThinking() {
  const history = (document.getElementById('refine-history') as HTMLElement);
  const div = document.createElement('div');
  div.className = 'refine-msg ai';
  div.id = 'refine-thinking-indicator';
  div.innerHTML = `
    <div class="refine-msg-sender">⚡ AgentSpark</div>
    <div class="refine-bubble">
      <div class="refine-thinking">
        <span>${t('refineThinking')}</span>
        <span class="thinking-dots"><span></span><span></span><span></span></span>
      </div>
    </div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function removeRefineThinking() {
  const el = (document.getElementById('refine-thinking-indicator') as HTMLElement);
  if (el) el.remove();
}

function getRefineSystemPrompt() {
  const lvl = t('levels').find((l: any) => l.id === state.currentLevel);
  const currentTeamJSON = JSON.stringify(state.generatedAgents.map((a: any) => ({
    id: a.id, name: a.name, type: a.type, role: a.role, description: a.description
  })), null, 2);

  return `You are AgentSpark, an expert AI system designer in REFINE mode.
Language: ${state.lang === 'en' ? 'English' : 'Polish'}
App topic: ${state.currentTopic}
Complexity level: ${lvl ? lvl.name : state.currentLevel}

CURRENT TEAM:
${currentTeamJSON}

The user wants to modify their agent team. Apply their requested changes and return the complete updated team as JSON.

RESPONSE FORMAT — two parts:
1. A brief human-readable summary of what changed (1-3 sentences), using these tags for changes:
   - New agent: <span class="refine-diff-added">+AgentName</span>
   - Removed: <span class="refine-diff-removed">-AgentName</span>  
   - Modified: <span class="refine-diff-changed">~AgentName</span>

2. Then the full updated JSON (same format as original generation):
[UPDATED_TEAM]
{
  "agents": [...complete updated agents array with all fields: id, name, emoji, type, role, description, agentMd, skillMd...],
  "teamConfig": "...updated team config md..."
}

RULES:
- Always return the COMPLETE agents array, not just changed agents
- Keep unchanged agents exactly as they are
- New agents must follow same structure (id, name, emoji, type, role, description, agentMd, skillMd)
- type must be "technical" or "business"
- agentMd and skillMd must be full detailed markdown, not placeholders
- The [UPDATED_TEAM] marker must appear on its own line`;
}

// Pending refine data (step 2 buffer)
let _pendingRefineData: any = null;

async function submitRefine() {
  const input = (document.getElementById('refine-input') as HTMLInputElement);
  const text = input.value.trim();
  if (!text || state.isRefining) return;

  const actionCtx = selectedRefineAction ? '[Action: ' + selectedRefineAction + '] ' : '';
  const fullRequest = actionCtx + text;

  state.isRefining = true;
  (document.getElementById('refine-submit-btn') as HTMLButtonElement).disabled = true;

  // Switch to step 2
  (document.getElementById('refine-step1') as HTMLElement).style.display = 'none';
  (document.getElementById('refine-step2') as HTMLElement).style.display = 'block';

  const histEl = (document.getElementById('refine-history') as HTMLElement);
  histEl.innerHTML = '';
  addRefineMessage('user', text);
  addRefineThinking();

  try {
    const history = state.refineHistory.map(m => (m.role === 'user' ? 'User' : 'AI') + ': ' + m.text).join('\n');
    const prompt = history
      ? 'Previous context:\n' + history + '\n\nNew request: ' + fullRequest
      : 'Request: ' + fullRequest;

    const refineActionEmoji: Record<string, string> = { improve: '⚡', add: '➕', remove: '🗑', connections: '🔗' };
    const refineEmoji = refineActionEmoji[selectedRefineAction] || '✏️';
    const refineVer = state.versionHistory.length + 1;
    const raw = await callGemini(getRefineSystemPrompt(), prompt, refineEmoji + ' Refine · v' + refineVer + (selectedRefineAction ? ' · ' + selectedRefineAction : ''), []);
    removeRefineThinking();
    if (typeof hideLoader === 'function') hideLoader();

    const markerIdx = raw.indexOf('[UPDATED_TEAM]');
    let summary = '', jsonPart = '';
    if (markerIdx !== -1) {
      summary = raw.slice(0, markerIdx).trim();
      jsonPart = raw.slice(markerIdx + '[UPDATED_TEAM]'.length).trim();
    } else {
      const jm = raw.match(/\{[\s\S]*"agents"[\s\S]*\}/);
      if (jm) {
        jsonPart = jm[0];
        summary = raw.slice(0, raw.indexOf(jm[0])).trim() || (state.lang === 'en' ? 'Team updated.' : 'Zespół zaktualizowany.');
      } else {
        throw new Error(state.lang === 'en' ? 'Could not parse updated team.' : 'Nie udało się przetworzyć zaktualizowanego zespołu.');
      }
    }

    const jm2 = jsonPart.match(/\{[\s\S]*\}/);
    if (!jm2) throw new Error('No JSON in response');
    const data = JSON.parse(jm2[0]);
    if (!data.agents || !Array.isArray(data.agents)) throw new Error('Invalid agents data');

    const prevIds = new Set(state.generatedAgents.map(a => a.id));
    const newIds = new Set(data.agents.map((a: any) => a.id));
    const addedIds = [...newIds].filter(id => !prevIds.has(id));
    const removedIds = [...prevIds].filter(id => !newIds.has(id));
    const changedIds = [...newIds].filter(id => prevIds.has(id) && JSON.stringify(data.agents.find((a: any) => a.id === id)) !== JSON.stringify(state.generatedAgents.find((a: any) => a.id === id)));
    const removedNames = Object.fromEntries(removedIds.map(id => [id, state.generatedAgents.find((a: any) => a.id === id)?.name || id]));

    const diffBadges = [
      ...addedIds.map(id => '<span class="refine-diff-added">+' + (data.agents.find((a: any) => a.id === id)?.name || id) + '</span>'),
      ...removedIds.map(id => '<span class="refine-diff-removed">-' + removedNames[id] + '</span>'),
      ...changedIds.map(id => '<span class="refine-diff-changed">~' + (data.agents.find((a: any) => a.id === id)?.name || id) + '</span>'),
    ].join(' ');

    addRefineMessage('ai', (summary || '') + (diffBadges ? '<br/><br/>' + diffBadges : ''));
    state._pendingRefineData = { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary };

    const applyBtn = (document.getElementById('refine-apply-btn') as HTMLElement);
    if (applyBtn) {
      applyBtn.style.display = 'inline-flex';
      (document.getElementById('refine-apply-label') as HTMLElement).textContent = t('refineApply');
    }
    updateRefineCounter();

  } catch (err: any) {
    removeRefineThinking();
    if (typeof hideLoader === 'function') hideLoader();
    addRefineMessage('ai', '<span style="color:var(--accent2)">⚠ ' + err.message + '</span>');
    showNotif(state.lang === 'en' ? '⚠ Refine failed.' : '⚠ Błąd generowania.', true);
    state._pendingRefineData = null;
  }

  state.isRefining = false;
  (document.getElementById('refine-submit-btn') as HTMLButtonElement).disabled = false;
}

function applyRefinement() {
  if (!state._pendingRefineData) return;
  const { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary } = state._pendingRefineData;
  state._pendingRefineData = null;

  refineSnapshots.push(JSON.parse(JSON.stringify({ agents: state.generatedAgents, files: state.generatedFiles })));

  state.generatedAgents = data.agents;
  data.agents.forEach((a: any) => {
    state.generatedFiles['agent-' + a.id + '.md'] = a.agentMd || '# Agent: ' + a.name + '\n\n**Role:** ' + (a.role || '') + '\n\n' + (a.description || '');
    state.generatedFiles['skill-' + a.id + '.md'] = a.skillMd || '# Skill: ' + a.name + '\n\n## Capabilities\n\n' + (a.description || '');
  });
  removedIds.forEach((id: string) => {
    delete state.generatedFiles['agent-' + id + '.md'];
    delete state.generatedFiles['skill-' + id + '.md'];
  });
  if (data.teamConfig) state.generatedFiles['team-config.md'] = data.teamConfig;
  state.generatedFiles['README.md'] = generateReadme();

  state.refineHistory.push({ role: 'user', text: fullRequest });
  state.refineHistory.push({ role: 'ai', text: summary });

  const vNum = state.versionHistory.length + 2;
  state.versionHistory.push({
    id: Date.now(),
    label: text.length > 60 ? text.slice(0, 57) + '…' : text,
    ts: new Date(),
    agents: JSON.parse(JSON.stringify(state.generatedAgents)),
    files: JSON.parse(JSON.stringify(state.generatedFiles)),
    diff: { added: addedIds, removed: removedIds, changed: changedIds },
    removedNames,
    agentNames: Object.fromEntries(data.agents.map((a: any) => [a.id, a.name])),
    vNum,
  });
  renderVersionPanel();
  closeRefine();
  showResults(true);
  (window as any).scheduleAutoSave();

  setTimeout(() => {
    addedIds.forEach((id: string) => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if (c) c.classList.add('just-added'); });
    changedIds.forEach((id: string) => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if (c) c.classList.add('just-updated'); });
  }, 150);
  setTimeout(() => buildGraphFromAgents(state.generatedAgents as any[]), 300);
  showNotif(state.lang === 'en' ? '✓ Team updated!' : '✓ Zespół zaktualizowany!');
  const revertBtn = (document.getElementById('refine-revert-btn') as HTMLElement);
  if (revertBtn) revertBtn.style.display = 'inline-flex';
}

function backToRefineStep1() {
  state._pendingRefineData = null;
  (document.getElementById('refine-step1') as HTMLElement).style.display = 'block';
  (document.getElementById('refine-step2') as HTMLElement).style.display = 'none';
  const applyBtn = (document.getElementById('refine-apply-btn') as HTMLElement);
  if (applyBtn) applyBtn.style.display = 'none';
  (document.getElementById('refine-history') as HTMLElement).innerHTML = '';
  (document.getElementById('refine-input') as HTMLInputElement).focus();
}

function revertLastRefine() {
  if (!refineSnapshots.length) return;
  const snap = refineSnapshots.pop();
  state.generatedAgents = snap.agents;
  state.generatedFiles = snap.files;
  state.refineHistory = state.refineHistory.slice(0, -2);
  updateRefineCounter();
  showResults(true);
  buildGraphFromAgents(state.generatedAgents);
  addRefineMessage('ai', state.lang === 'en' ? '↩ Reverted to previous version.' : '↩ Przywrócono poprzednią wersję.');
  showNotif(state.lang === 'en' ? '↩ Reverted.' : '↩ Przywrócono.');
}

// ─── CHAT HELPERS ─────────────────────────────────────────
function sanitizeRichText(input: string) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['a', 'b', 'strong', 'i', 'em', 'code', 'pre', 'br', 'p', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3'],
      ADD_ATTR: ['target']
    });
  }
  return String(input || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addMessage(role: string, text: string) {
  const container = (document.getElementById('chat-messages') as HTMLElement);
  const cleanText = text.replace('[INTERVIEW_COMPLETE]', '').trim();
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = role === 'ai' ? '⚡ AgentSpark' : (state.lang === 'en' ? 'You' : 'Ty');
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  // User messages are plain text; AI messages pass through strict HTML sanitizer.
  if (role === 'user') {
    bubble.textContent = cleanText;
  } else {
    const sanitized = sanitizeRichText(cleanText);
    bubble.innerHTML = sanitized;
  }
  div.appendChild(sender);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
  removeTypingIndicator();
  const container = (document.getElementById('chat-messages') as HTMLElement);
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-sender">⚡ AgentSpark</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const el = (document.getElementById('typing-indicator') as HTMLElement);
  if (el) el.remove();
}

// ─── PROGRESS ─────────────────────────────────────────────
function renderProgressSteps(activeIndex: number) {
  const container = (document.getElementById('progress-steps') as HTMLElement);
  container.innerHTML = '';
  t('progressSteps').forEach((label: string, i: number) => {
    const div = document.createElement('div');
    div.className = `step ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}`;
    div.innerHTML = `<div class="step-num">${i < activeIndex ? '✓' : i + 1}</div><span>${label}</span>`;
    container.appendChild(div);
  });
  // iOS progress bar update
  const iosBar = (document.getElementById('ios-progress-bar') as HTMLElement);
  if (iosBar) {
    const steps = t('progressSteps');
    iosBar.innerHTML = steps.map((_: any, i: number) =>
      `<div class="ios-progress-segment ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}"></div>`
    ).join('');
  }
  // iOS step counter label
  const stepLabel = (document.getElementById('ios-chat-step-label') as HTMLElement);
  if (stepLabel) stepLabel.textContent = `${activeIndex + 1}/${t('progressSteps').length}`;
}

// ─── AI MODELS & ORCHESTRATION ─────────────────────────────
// moved to js/core/generation-client.js

// ─── UTILS ────────────────────────────────────────────────
// ─── COLLAPSIBLE API SETUP ────────────────────────────────
let _apiSetupOpen = true; // open by default until key entered

function toggleApiSetup(forceState?: boolean) {
  const body = (document.getElementById('api-setup-body') as HTMLElement);
  const chevron = (document.getElementById('api-setup-chevron') as HTMLElement);
  if (!body) return;
  if (forceState !== undefined) {
    _apiSetupOpen = forceState;
  } else {
    _apiSetupOpen = !_apiSetupOpen;
  }
  body.classList.toggle('open', _apiSetupOpen);
  if (chevron) chevron.classList.toggle('open', _apiSetupOpen);
}

function _updateApiKeyDot(status: string) {
  // status: 'ready' | 'error' | ''
  const dot = (document.getElementById('api-key-dot') as HTMLElement);
  const label = (document.getElementById('api-setup-toggle-label') as HTMLElement);
  if (!dot) return;
  dot.className = 'api-key-dot' + (status ? ' ' + status : '');
  if (status === 'ready' && label) {
    const sel = (document.getElementById('modelSelect') as HTMLSelectElement);
    const modelText = sel ? sel.options[sel.selectedIndex]?.text : 'AI Model';
    label.textContent = modelText + ' · Ready';
    // Auto-collapse when key is valid
    toggleApiSetup(false);
  } else if (label) {
    label.textContent = 'AI Model & API Key';
  }
}

// ─── SKELETON LOADING ─────────────────────────────────────
function _renderSkeletonCards(count = 4) {
  const grid = (document.getElementById('agents-grid') as HTMLElement);
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <span class="skeleton skeleton-avatar"></span>
      <span class="skeleton skeleton-line w65"></span>
      <span class="skeleton skeleton-line w40"></span>
      <span class="skeleton skeleton-line w100" style="margin-top:1rem;height:11px;"></span>
      <span class="skeleton skeleton-line w90" style="height:11px;"></span>
      <span class="skeleton skeleton-line w75" style="height:11px;"></span>
      <div class="skeleton-chips">
        <span class="skeleton skeleton-chip"></span>
        <span class="skeleton skeleton-chip" style="width:80px;"></span>
      </div>
    `;
    grid.appendChild(card);
  }
}

function _showGeneratingState(stepIndex: number) {
  // stepIndex 0=interviewing, 1=generating, 2=writing files, 3=done
  const steps = [
    state.lang === 'en' ? 'Analyzing your requirements…' : 'Analizuję wymagania…',
    state.lang === 'en' ? 'Designing agent team…' : 'Projektuję zespół agentów…',
    state.lang === 'en' ? 'Writing configuration files…' : 'Zapisuję pliki konfiguracyjne…',
    state.lang === 'en' ? 'Finalizing…' : 'Finalizuję…',
  ];
  const grid = (document.getElementById('agents-grid') as HTMLElement);
  if (!grid) return;
  const overlay = document.createElement('div');
  overlay.className = 'generating-overlay';
  overlay.id = 'generating-overlay';
  const stepsHtml = steps.map((s, i) => `
    <div class="gen-step ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}">
      <span class="gen-step-dot"></span>
      <span>${i < stepIndex ? '✓ ' : ''}${s}</span>
    </div>
  `).join('');
  overlay.innerHTML = `
    <div class="generating-spinner"></div>
    <div class="generating-label">${state.lang === 'en' ? 'Building your AI team…' : 'Buduję Twój zespół AI…'}</div>
    <div class="generating-steps">${stepsHtml}</div>
  `;
  grid.innerHTML = '';
  grid.appendChild(overlay);
}

// ─── FAB (Floating Action Button) visibility ──────────────
// --- NAVIGATION MOVED TO js/ui/screens.js ---

function openSettingsSheet() {
  // Build settings as iOS action sheet
  let sheet = (document.getElementById('ios-settings-sheet') as HTMLElement);
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'ios-settings-sheet';
    sheet.className = 'ios-sheet-overlay';
    sheet.innerHTML = `
      <div class="ios-sheet" style="max-height:80vh;">
        <div class="ios-sheet-handle"></div>
        <div class="ios-sheet-header">
          <span class="ios-sheet-title" id="settings-sheet-title">Settings</span>
          <button class="ios-sheet-close" onclick="(document.getElementById('ios-settings-sheet') as HTMLElement).classList.remove('open')">✕</button>
        </div>
        <div class="ios-sheet-body">
          <div class="ios-section-label" style="margin-bottom:0.5rem;" id="settings-appearance-label">Appearance</div>
          <div class="ios-list-group">
            <div class="ios-list-item" onclick="_toggleThemeCore()">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🌙</div>
              <div style="flex:1"><div class="ios-list-label" id="settings-theme-label">Dark Mode</div></div>
              <span class="ios-list-chevron">›</span>
            </div>
          </div>
          <div class="ios-section-label" style="margin-bottom:0.5rem;" id="settings-language-label">Language</div>
          <div class="ios-list-group">
            <div class="ios-list-item" onclick="setLang('en');(document.getElementById('ios-settings-sheet') as HTMLElement).classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🇬🇧</div>
              <div style="flex:1"><div class="ios-list-label">English</div></div>
              <span id="settings-state.lang-en" style="color:var(--accent);font-size:0.9rem;">✓</span>
            </div>
            <div class="ios-list-item" onclick="setLang('pl');(document.getElementById('ios-settings-sheet') as HTMLElement).classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🇵🇱</div>
              <div style="flex:1"><div class="ios-list-label">Polski</div></div>
              <span id="settings-state.lang-pl" style="color:var(--accent);font-size:0.9rem;display:none;">✓</span>
            </div>
          </div>
          <div class="ios-section-label" style="margin-bottom:0.5rem;" id="settings-about-label">About</div>
          <div class="ios-list-group">
            <div class="ios-list-item">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">⚡</div>
              <div style="flex:1">
                <div class="ios-list-label">AgentSpark</div>
                <div class="ios-list-sub">v1.1.0 — AI Agent Team Generator</div>
              </div>
            </div>
            <div class="ios-list-item" onclick="openImportModal();(document.getElementById('ios-settings-sheet') as HTMLElement).classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">📥</div>
              <div style="flex:1"><div class="ios-list-label" id="settings-import-label">Import Project</div></div>
              <span class="ios-list-chevron">›</span>
            </div>
          </div>
        </div>
      </div>
    `;
    sheet.addEventListener('click', e => { if (e.target === sheet) sheet.classList.remove('open'); });
    document.body.appendChild(sheet);
  }
  // Update language indicators
  const isEn = state.lang === 'en';
  const langEn = (document.getElementById('settings-state.lang-en') as HTMLElement);
  const langPl = (document.getElementById('settings-state.lang-pl') as HTMLElement);
  if (langEn) langEn.style.display = isEn ? '' : 'none';
  if (langPl) langPl.style.display = !isEn ? '' : 'none';
  // Update theme label
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const themeLabel = (document.getElementById('settings-theme-label') as HTMLElement);
  if (themeLabel) themeLabel.textContent = isDark
    ? tr('Switch to Light Mode', 'Przelacz na jasny motyw')
    : tr('Switch to Dark Mode', 'Przelacz na ciemny motyw');
  const titleEl = (document.getElementById('settings-sheet-title') as HTMLElement);
  const appearanceEl = (document.getElementById('settings-appearance-label') as HTMLElement);
  const languageEl = (document.getElementById('settings-language-label') as HTMLElement);
  const aboutEl = (document.getElementById('settings-about-label') as HTMLElement);
  const importEl = (document.getElementById('settings-import-label') as HTMLElement);
  const aboutSubEl = sheet.querySelector('.ios-list-sub');
  if (titleEl) titleEl.textContent = tr('Settings', 'Ustawienia');
  if (appearanceEl) appearanceEl.textContent = tr('Appearance', 'Wyglad');
  if (languageEl) languageEl.textContent = tr('Language', 'Jezyk');
  if (aboutEl) aboutEl.textContent = tr('About', 'O aplikacji');
  if (importEl) importEl.textContent = tr('Import Project', 'Importuj projekt');
  if (aboutSubEl) aboutSubEl.textContent = tr('v1.1.0 — AI Agent Team Generator', 'v1.1.0 — Generator zespolu agentow AI');
  sheet.classList.add('open');
}

// ─── SIDEBAR TOGGLE (#5) ──────────────────────────────────
let _sidebarCollapsed = false;
function toggleChatSidebar() {
  _sidebarCollapsed = !_sidebarCollapsed;
  const layout = (document.querySelector('.chat-layout') as HTMLElement);
  const btn = (document.getElementById('sidebar-toggle-btn') as HTMLElement);
  if (layout) layout.classList.toggle('sidebar-collapsed', _sidebarCollapsed);
  if (btn) btn.textContent = _sidebarCollapsed ? '◀' : '▶';
  localStorage.setItem('agentspark-sidebar-collapsed', _sidebarCollapsed ? '1' : '0');
}
// Restore sidebar state on load
(function () {
  window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('agentspark-sidebar-collapsed') === '1') {
      _sidebarCollapsed = true;
      const layout = (document.querySelector('.chat-layout') as HTMLElement);
      const btn = (document.getElementById('sidebar-toggle-btn') as HTMLElement);
      if (layout) layout.classList.add('sidebar-collapsed');
      if (btn) btn.textContent = '◀';
    }
  });
})();

function renderResults() {
  // Alias used when loading a project — renders the results screen UI
  showResults(false);
}

async function restart() {
  // If there's unsaved work and a project in progress, offer to save
  if (state.generatedAgents.length && state.currentProjectId === null) {
    const save = await uiConfirm(
      'Save current project before starting over?',
      'Zapisać bieżący projekt przed rozpoczęciem od nowa?',
      'Save Project',
      'Zapis projektu'
    );
    if (save) { saveCurrentProject(false); }
  }
  state.currentProjectId = null;
  state.chatHistory = [] as any[];
  state.generatedAgents = [] as any[];
  state.generatedFiles = {} as Record<string, string>;
  state.refineHistory = [] as any[];
  refineSnapshots = [];
  state.versionHistory = [] as any[];
  versionPanelOpen = false;
  state.traceSpans = [];
  tracePanelOpen = false;
  traceSessionStart = null;
  state.isRefining = false;
  selectedRefineAction = null;
  state.questionCount = 0;
  state.conversationState = 'interview';
  state.currentModalFile = '';
  state.mdBrowserActiveFile = '';
  (document.getElementById('chat-messages') as HTMLElement).innerHTML = '';
  clearOptions();
  if ((document.getElementById('refine-history') as HTMLElement)) (document.getElementById('refine-history') as HTMLElement).innerHTML = '';
  (document.getElementById('refine-panel') as HTMLElement).style.display = 'none';
  (document.getElementById('version-panel') as HTMLElement).style.display = 'none';
  state.currentLevel = 'iskra';
  state.MAX_QUESTIONS = 4;
  if (graphAnimFrame) { cancelAnimationFrame(graphAnimFrame); graphAnimFrame = null; }
  graphNodes = []; graphEdges = [];
  (document.getElementById('scoring-panel') as HTMLElement).style.display = 'none';
  (document.getElementById('trace-panel') as HTMLElement).style.display = 'none';
  (document.getElementById('graph-section') as HTMLElement).style.display = 'none';
  const gc = (document.querySelector('.graph-container') as HTMLElement);
  if (gc) { const leg = gc.querySelector('.graph-legend'); if (leg) leg.remove(); }
  (document.getElementById('instructions-section') as HTMLElement).style.display = 'none';
  (document.getElementById('apiKeyHeader') as HTMLElement).style.display = 'none';
  showScreen('topic');
}

let notifTimeout: any;
function showNotif(msg: string, isError = false) {
  // Remove any existing toast with fade-out
  const old = (document.querySelector('.notif') as HTMLElement);
  if (old) {
    old.classList.add('hiding');
    setTimeout(() => old.remove(), 260);
  }

  const div = document.createElement('div');
  div.className = 'notif' + (isError ? ' error' : '');

  // Icon prefix for context
  const icon = isError ? '⚠ ' : '';
  div.textContent = icon + msg;

  // Color tint for success vs error
  if (isError) {
    div.style.color = 'var(--accent2)';
  } else if (msg.startsWith('✓') || msg.startsWith('↩')) {
    div.style.color = 'var(--success)';
  } else {
    div.style.color = 'var(--text)';
  }

  document.body.appendChild(div);

  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    div.classList.add('hiding');
    setTimeout(() => div.remove(), 260);
  }, 3200);
}

// ─── TRACE VIEWER ─────────────────────────────────────────

function toggleTracePanel() {
  tracePanelOpen = !tracePanelOpen;
  (document.getElementById('trace-body') as HTMLElement).classList.toggle('open', tracePanelOpen);
  (document.getElementById('trace-toggle-icon') as HTMLElement).classList.toggle('open', tracePanelOpen);
}

function renderTraceLive() {
  const panel = (document.getElementById('trace-panel') as HTMLElement);
  if (!panel) return;

  if (!state.traceSpans.length) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  // Count badge
  const doneCount = state.traceSpans.filter(s => s.status !== 'pending').length;
  (document.getElementById('trace-span-count') as HTMLElement).textContent = state.traceSpans.length.toString();

  // Summary pills
  const pills = (document.getElementById('trace-summary-pills') as HTMLElement);
  const totalMs = state.traceSpans.reduce((n, s) => n + (s.durationMs || 0), 0);
  const totalTok = state.traceSpans.reduce((n, s) => n + (s.tokens || 0), 0);
  const totalCost = state.traceSpans.reduce((n, s) => n + (s.cost || 0), 0);
  const hasCostData = state.traceSpans.some(s => s.cost !== null && s.cost !== undefined);
  const hasFallback = state.traceSpans.some(s => s.isFallback);
  const hasError = state.traceSpans.some(s => s.status === 'error');
  const hasPending = state.traceSpans.some(s => s.status === 'pending');
  pills.innerHTML = `
    <span class="trace-pill ${hasError ? 'error' : hasFallback ? 'warn' : 'ok'}">
      ${hasError ? '⚠ error' : hasFallback ? '↩ fallback' : '✓ ok'}
    </span>
    <span class="trace-pill">${(totalMs / 1000).toFixed(1)}s total</span>
    ${totalTok ? `<span class="trace-pill">${totalTok.toLocaleString()} tokens</span>` : ''}
    ${hasCostData && totalCost > 0 ? `<span class="trace-pill" style="color:var(--success);border-color:rgba(124,196,42,0.3);background:rgba(124,196,42,0.07);" title="Estimated API cost for this session">~${_formatCost(totalCost)}</span>` : ''}
    ${hasPending ? `<span class="trace-pill">⏳ running…</span>` : ''}
  `;

  // Span rows
  const spansEl = (document.getElementById('trace-spans') as HTMLElement);

  // Calculate timeline scale
  const sessionStart = traceSessionStart || (state.traceSpans[0]?.startMs || Date.now());
  const sessionEnd = Math.max(...traceSpans.map(s => s.endMs || Date.now()));
  const sessionRange = Math.max(sessionEnd - sessionStart, 1);

  spansEl.innerHTML = '';
  state.traceSpans.forEach(s => {
    const left = ((s.startMs - sessionStart) / sessionRange) * 100;
    const width = s.durationMs
      ? Math.max((s.durationMs / sessionRange) * 100, 1.5)
      : Math.max(((Date.now() - s.startMs) / sessionRange) * 100, 3);

    const fillClass = s.status === 'ok' ? 'fill-ok'
      : s.status === 'fallback' ? 'fill-fallback'
        : s.status === 'error' ? 'fill-error'
          : 'fill-pending';

    const badgeClass = s.status === 'ok' ? 'badge-ok'
      : s.status === 'fallback' ? 'badge-fallback'
        : s.status === 'error' ? 'badge-error'
          : 'badge-pending';

    const badgeText = s.status === 'ok' ? 'OK'
      : s.status === 'fallback' ? '↩ FALLBACK'
        : s.status === 'error' ? 'ERROR'
          : '…';

    const durText = s.durationMs
      ? s.durationMs >= 1000 ? `${(s.durationMs / 1000).toFixed(1)}s` : `${s.durationMs}ms`
      : '…';

    const tokenText = s.tokens ? s.tokens.toLocaleString() : '–';

    // ── Improved label parsing (#9) ───────────────────────
    const rawLabel = s.label || 'API Call';
    let phase = rawLabel, detail = '';
    const dotSep = rawLabel.indexOf(' · ');
    const colonSep = rawLabel.indexOf(': ');
    if (dotSep !== -1) {
      phase = rawLabel.slice(0, dotSep);
      detail = rawLabel.slice(dotSep + 3);
    } else if (colonSep !== -1) {
      phase = rawLabel.slice(0, colonSep);
      detail = rawLabel.slice(colonSep + 2);
    }

    // Shorten model name if too long
    const modelDisplay = s.model || '';
    const modelShort = modelDisplay.length > 22 ? modelDisplay.slice(0, 20) + '…' : modelDisplay;

    // Relative start time for tooltip
    const relSec = ((s.startMs - sessionStart) / 1000).toFixed(2);
    const absTime = new Date(s.startMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Tooltip
    const tooltipLines = [
      `Step: ${rawLabel}`,
      `Model: ${modelDisplay}`,
      `Started: ${absTime} (+${relSec}s into session)`,
      s.durationMs ? `Duration: ${durText}` : 'Duration: pending…',
      s.tokens ? `Tokens: ${s.tokens.toLocaleString()}` : '',
      s.cost !== null && s.cost !== undefined ? `Est. cost: ${_formatCost(s.cost)}` : '',
      s.isFallback ? `↩ Fell back from primary model` : '',
      s.error ? `Error: ${s.error}` : '',
    ].filter(Boolean).join('\n');

    const row = document.createElement('div');
    row.className = 'trace-span';
    row.title = tooltipLines;
    row.innerHTML = `
      <div class="span-name">
        <div class="span-label" title="${phase}">${phase}</div>
        ${detail ? `<div class="span-detail">${_escHtml(detail)}</div>` : ''}
        <div class="span-model" title="${modelDisplay}">${modelShort}</div>
      </div>
      <div class="span-bar-col">
        <div class="span-bar-track">
          <div class="span-bar-fill ${fillClass}" style="margin-left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></div>
        </div>
      </div>
      <div class="span-duration">${durText}</div>
      <div class="span-tokens" title="${s.cost !== null && s.cost !== undefined ? 'Est. cost: ' + _formatCost(s.cost) : ''}">${tokenText}${s.cost !== null && s.cost !== undefined && s.tokens ? `<span style="display:block;font-size:0.6rem;color:var(--success);margin-top:1px;">${_formatCost(s.cost)}</span>` : ''}</div>
      <div class="span-status"><span class="span-badge ${badgeClass}">${badgeText}</span></div>
    `;
    spansEl.appendChild(row);
  });

  // Footer stats — improved (#9)
  const footerEl = (document.getElementById('trace-footer') as HTMLElement);
  const calls = state.traceSpans.length;
  const errors = state.traceSpans.filter(s => s.status === 'error').length;
  const fallbacks = state.traceSpans.filter(s => s.isFallback).length;
  const phases = [...new Set(state.traceSpans.map(s => {
    const raw = s.label || '';
    const dot = raw.indexOf(' · ');
    return dot !== -1 ? raw.slice(0, dot) : raw.split(':')[0];
  }))];
  const avgDur = calls ? Math.round(totalMs / calls) : 0;
  footerEl.innerHTML = `
    <span><strong>${calls}</strong> ${state.lang === 'en' ? (calls === 1 ? 'call' : 'calls') : 'wywołań'}</span>
    <span><strong>${(totalMs / 1000).toFixed(1)}s</strong> ${state.lang === 'en' ? 'total' : 'łącznie'}</span>
    ${totalTok ? `<span title="${state.lang === 'en' ? 'Total tokens consumed' : 'Łączna liczba tokenów'}"><strong>${totalTok.toLocaleString()}</strong> tok</span>` : ''}
    ${hasCostData && totalCost > 0 ? `<span style="color:var(--success);font-weight:700;" title="${state.lang === 'en' ? 'Estimated total API cost for this session (based on public pricing)' : 'Szacowany koszt API sesji'}">~${_formatCost(totalCost)}</span>` : ''}
    ${hasCostData && totalCost === 0 ? `<span style="color:var(--success);" title="Free tier model">free</span>` : ''}
    ${calls > 1 ? `<span style="color:var(--muted)">~${avgDur >= 1000 ? (avgDur / 1000).toFixed(1) + 's' : avgDur + 'ms'} ${state.lang === 'en' ? 'avg/call' : 'śr/call'}</span>` : ''}
    ${fallbacks ? `<span title="${state.lang === 'en' ? 'Model fallbacks used' : 'Użyte fallbacki modelu'}">↩ <strong>${fallbacks}</strong> ${state.lang === 'en' ? 'fallback' : 'fallback'}</span>` : ''}
    ${errors ? `<span style="color:var(--accent2)" title="${state.lang === 'en' ? 'Failed calls' : 'Nieudane wywołania'}">⚠ <strong>${errors}</strong> ${state.lang === 'en' ? 'error' : 'błąd'}</span>` : ''}
    <span style="margin-left:auto;color:var(--muted);font-size:0.68rem;" title="${state.lang === 'en' ? 'Session start time' : 'Czas startu sesji'}">${new Date(sessionStart).toLocaleTimeString()}</span>
  `;
}

// ─── VERSION HISTORY ──────────────────────────────────────

function renderVersionPanel() {
  const panel = (document.getElementById('version-panel') as HTMLElement);
  const timeline = (document.getElementById('version-timeline') as HTMLElement);
  const badge = (document.getElementById('version-count-badge') as HTMLElement);
  const icon = (document.getElementById('version-toggle-icon') as HTMLElement);

  const total = state.versionHistory.length;
  if (total === 0) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  badge.textContent = total.toString();
  icon.className = 'version-toggle-icon' + (versionPanelOpen ? ' open' : '');
  timeline.className = 'version-timeline' + (versionPanelOpen ? ' open' : '');

  timeline.innerHTML = '';

  // Show newest first
  const reversed = [...versionHistory].reverse();

  reversed.forEach((v, ri) => {
    const isCurrentIdx = ri === 0;
    const origIdx = state.versionHistory.indexOf(v);           // index in state.versionHistory array

    const entry = document.createElement('div');
    entry.className = 'version-entry' + (isCurrentIdx ? ' current' : '') + (v.isOrigin ? ' origin' : '');

    // Diff tags
    const diffHtml = [
      ...v.diff.added.map((id: string) =>
        `<span class="diff-tag diff-added">+${v.agentNames?.[id] || id}</span>`),
      ...v.diff.removed.map((id: string) =>
        `<span class="diff-tag diff-removed">−${v.removedNames?.[id] || id}</span>`),
      ...v.diff.changed.map((id: string) =>
        `<span class="diff-tag diff-changed">~${v.agentNames?.[id] || id}</span>`),
    ].join('');

    // Agent list preview
    const agentPreview = v.agents.map((a: any) => a.name).join(', ');

    // Time label
    const timeLabel = formatVersionTime(v.ts);

    // Actions: can't restore current, can't diff origin
    const restoreBtn = !isCurrentIdx
      ? `<button class="version-btn restore-btn" onclick="restoreVersion(${origIdx})">↩ ${state.lang === 'en' ? 'Restore' : 'Przywróć'}</button>`
      : `<span class="version-current-tag">CURRENT</span>`;

    const diffBtn = origIdx > 0
      ? `<button class="version-btn diff-btn" onclick="showDiffModal(${origIdx})">🔍 ${state.lang === 'en' ? 'Diff' : 'Porównaj'}</button>`
      : '';

    const downloadBtn = `<button class="version-btn" onclick="downloadVersionZip(${origIdx})">⬇ ZIP</button>`;

    entry.innerHTML = `
      <div class="version-dot-col">
        <div class="version-dot">${v.isOrigin ? '●' : 'v' + v.vNum}</div>
      </div>
      <div class="version-card">
        <div class="version-card-top">
          <div class="version-label">${escapeHtml(v.label)}</div>
          <div class="version-time">${timeLabel}</div>
        </div>
        ${diffHtml ? `<div class="version-diff">${diffHtml}</div>` : ''}
        <div class="version-agents">⚡ ${agentPreview}</div>
        <div class="version-actions">
          ${restoreBtn}
          ${diffBtn}
          ${downloadBtn}
        </div>
      </div>
    `;
    timeline.appendChild(entry);
  });
}

function toggleVersionPanel() {
  versionPanelOpen = !versionPanelOpen;
  renderVersionPanel();
}

function formatVersionTime(ts: any) {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return state.lang === 'en' ? 'just now' : 'przed chwilą';
  if (diffM < 60) return `${diffM}m ${state.lang === 'en' ? 'ago' : 'temu'}`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ${state.lang === 'en' ? 'ago' : 'temu'}`;
  return d.toLocaleDateString();
}

function restoreVersion(idx: number) {
  if (idx < 0 || idx >= state.versionHistory.length) return;
  const v = state.versionHistory[idx];

  // Save current state as new version before restoring
  const alreadySaved = state.versionHistory[state.versionHistory.length - 1];
  // Don't double-save if idx is already last
  if (idx !== state.versionHistory.length - 1) {
    state.versionHistory.push({
      id: Date.now(),
      label: state.lang === 'en' ? `Restored v${v.vNum}` : `Przywrócono v${v.vNum}`,
      ts: new Date(),
      agents: JSON.parse(JSON.stringify(v.agents)),
      files: JSON.parse(JSON.stringify(v.files)),
      diff: { added: [], removed: [], changed: [] },
      removedNames: {},
      agentNames: Object.fromEntries(v.agents.map((a: any) => [a.id, a.name])),
      vNum: state.versionHistory.length + 1,
    });
  }

  state.generatedAgents = JSON.parse(JSON.stringify(v.agents));
  state.generatedFiles = JSON.parse(JSON.stringify(v.files));

  showResults(true);
  buildGraphFromAgents(state.generatedAgents);
  renderVersionPanel();

  showNotif(state.lang === 'en'
    ? `↩ Restored to v${v.vNum}: "${v.label}"`
    : `↩ Przywrócono v${v.vNum}: "${v.label}"`);
}

async function downloadVersionZip(idx: number) {
  if (typeof JSZip === 'undefined') { showNotif('JSZip not loaded', true); return; }
  const v = state.versionHistory[idx];
  if (!v) return;
  const zip = new JSZip();
  Object.entries(v.files).forEach(([name, content]) => zip.file(name, content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agentspark-v${v.vNum}-${state.currentTopic.toLowerCase().replace(/\s+/g, '-')}.zip`;
  a.click();
  showNotif(`✓ v${v.vNum} ZIP downloaded`);
}

function showDiffModal(idx: number) {
  if (idx < 1 || idx >= state.versionHistory.length) return;
  const vNew = state.versionHistory[idx];
  const vOld = state.versionHistory[idx - 1];

  const modal = (document.getElementById('diff-modal') as HTMLElement);
  const title = (document.getElementById('diff-modal-title') as HTMLElement);
  const body = (document.getElementById('diff-modal-body') as HTMLElement);

  title.textContent = state.lang === 'en'
    ? `🔍 v${vOld.vNum} → v${vNew.vNum}: "${vNew.label}"`
    : `🔍 v${vOld.vNum} → v${vNew.vNum}: "${vNew.label}"`;

  const { added, removed, changed } = vNew.diff;

  let html = '';

  if (added.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:var(--success)">➕ ${state.lang === 'en' ? 'Added Agents' : 'Dodani Agenci'} (${added.length})</div>
      ${added.map((id: string) => {
      const a = vNew.agents.find((ag: any) => ag.id === id);
      if (!a) return '';
      return `<div class="diff-agent-row row-added">
          <span class="row-icon">${a.emoji || '🤖'}</span>
          <div><div class="diff-agent-name">${a.name}</div><div class="diff-agent-role">${a.role || ''}</div></div>
        </div>`;
    }).join('')}
    </div>`;
  }

  if (removed.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:var(--accent2)">🗑 ${state.lang === 'en' ? 'Removed Agents' : 'Usunięci Agenci'} (${removed.length})</div>
      ${removed.map((id: string) => {
      const a = vOld.agents.find((ag: any) => ag.id === id);
      if (!a) return '';
      return `<div class="diff-agent-row row-removed">
          <span class="row-icon">${a.emoji || '🤖'}</span>
          <div><div class="diff-agent-name">${a.name}</div><div class="diff-agent-role">${a.role || ''}</div></div>
        </div>`;
    }).join('')}
    </div>`;
  }

  if (changed.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:#ffd580">✏ ${state.lang === 'en' ? 'Modified Agents' : 'Zmodyfikowani Agenci'} (${changed.length})</div>
      ${changed.map((id: string) => {
      const aNew = vNew.agents.find((ag: any) => ag.id === id);
      const aOld = vOld.agents.find((ag: any) => ag.id === id);
      if (!aNew) return '';
      const descChanged = aOld && aOld.description !== aNew.description;
      const roleChanged = aOld && aOld.role !== aNew.role;
      return `<div class="diff-agent-row row-changed">
          <span class="row-icon">${aNew.emoji || '🤖'}</span>
          <div style="flex:1">
            <div class="diff-agent-name">${aNew.name}</div>
            ${roleChanged ? `<div class="diff-agent-role" style="color:#ffd580">Role: ${aOld.role} → ${aNew.role}</div>` : ''}
            ${descChanged ? `<div style="font-size:0.7rem;color:var(--muted);margin-top:0.25rem;line-height:1.4;">${aNew.description.slice(0, 120)}${aNew.description.length > 120 ? '…' : ''}</div>` : ''}
          </div>
        </div>`;
    }).join('')}
    </div>`;
  }

  if (!added.length && !removed.length && !changed.length) {
    html = `<div style="padding:2rem;text-align:center;color:var(--muted);font-family:'Space Mono',monospace;font-size:0.82rem;">
      ${state.lang === 'en' ? 'No structural changes — metadata or descriptions updated.' : 'Brak zmian strukturalnych — zaktualizowano metadane lub opisy.'}
    </div>`;
  }

  // Agent count summary
  html = `<div style="display:flex;gap:1.5rem;padding:0 0 1.25rem;font-family:'Space Mono',monospace;font-size:0.72rem;color:var(--muted);border-bottom:1px solid var(--border);margin-bottom:1.25rem;">
    <span>${state.lang === 'en' ? 'Before' : 'Przed'}: <strong style="color:var(--text)">${vOld.agents.length} ${state.lang === 'en' ? 'agents' : 'agentów'}</strong></span>
    <span>→</span>
    <span>${state.lang === 'en' ? 'After' : 'Po'}: <strong style="color:var(--text)">${vNew.agents.length} ${state.lang === 'en' ? 'agents' : 'agentów'}</strong></span>
    <span style="margin-left:auto;">${state.lang === 'en' ? 'Change' : 'Zmiana'}: ${vNew.agents.length - vOld.agents.length > 0 ? '+' : ''}${vNew.agents.length - vOld.agents.length}</span>
  </div>` + html;

  body.innerHTML = html;
  modal.classList.add('open');
}

function closeDiffModal() {
  (document.getElementById('diff-modal') as HTMLElement).classList.remove('open');
}

// ─── FRAMEWORK EXPORT ─────────────────────────────────────

const FRAMEWORKS = [
  {
    id: 'claude', label: 'Claude Projects', badge: 'No-code', logo: '🟠', pip: null,
    desc: 'One-click system prompts for Claude.ai Projects. No coding required — paste and go.',
    url: 'https://claude.ai/projects'
  },
  {
    id: 'crewai', label: 'CrewAI', badge: 'Python', logo: '🤝', pip: 'pip install crewai crewai-tools',
    desc: 'Role-based agents with tasks and tools. Best for sequential and hierarchical workflows.',
    url: 'https://docs.crewai.com'
  },
  {
    id: 'langgraph', label: 'LangGraph', badge: 'Python', logo: '🔗', pip: 'pip install langgraph langchain-openai',
    desc: 'Stateful multi-agent graphs with cycles and branching. Best for complex conditional flows.',
    url: 'https://langchain-ai.github.io/langgraph'
  },
  {
    id: 'autogen', label: 'AutoGen', badge: 'Python', logo: '🔄', pip: 'pip install pyautogen',
    desc: 'Conversational multi-agent framework with human-in-the-loop support. Best for agentic chat.',
    url: 'https://microsoft.github.io/autogen'
  },
  {
    id: 'swarm', label: 'Swarm', badge: 'Python', logo: '🐝', pip: 'pip install git+https://github.com/openai/swarm.git',
    desc: 'Lightweight OpenAI Swarm with handoffs between agents. Best for simple agent routing.',
    url: 'https://github.com/openai/swarm'
  },
];

let activeFwTab = 'claude';

// ═══════════════════════════════════════════════════════════
// ─── IMPORT PROJECT (#4) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════

let _importParsed: any = null; // holds parsed payload ready to confirm

// ── Open / close ──────────────────────────────────────────
function openImportModal() {
  resetImportModal();
  // Reset gist import section
  const gistInput = (document.getElementById('gist-import-input') as HTMLInputElement);
  if (gistInput) gistInput.value = '';
  (window as any)._clearGistImportError();
  const gistLabel = (document.getElementById('gist-import-label') as HTMLElement);
  if (gistLabel) gistLabel.textContent = tr('Load ->', 'Wczytaj ->');
  (document.getElementById('import-modal') as HTMLElement).classList.add('open');
}
function closeImportModal() {
  (document.getElementById('import-modal') as HTMLElement).classList.remove('open');
  _importParsed = null;
}

// ── Drag & drop ───────────────────────────────────────────
function handleImportDrop(e: any) {
  e.preventDefault();
  (document.getElementById('import-dropzone') as HTMLElement).classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) _processImportFile(file);
}
function handleImportFileSelect(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (file) _processImportFile(file);
  input.value = ''; // reset so same file can be re-selected
}

// ── Core parser ───────────────────────────────────────────
async function _processImportFile(file: File) {
  _clearImportError();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  try {
    if (ext === 'json') {
      const text = await file.text();
      await _parseImportJson(text, file.name);
    } else if (ext === 'zip') {
      await _parseImportZip(file);
    } else {
      _showImportError(tr(
        `Unsupported file type ".${ext}". Please use .json or .zip`,
        `Nieobslugiwany typ pliku ".${ext}". Uzyj .json lub .zip`
      ));
    }
  } catch (e: any) {
    _showImportError(tr('Failed to read file: ', 'Nie udalo sie odczytac pliku: ') + e.message);
  }
}

async function _parseImportJson(text: string, filename: string) {
  let data;
  try { data = JSON.parse(text); }
  catch (e: any) { _showImportError(tr('Invalid JSON: ', 'Nieprawidlowy JSON: ') + e.message); return; }

  // Support multiple JSON shapes:
  // 1) AgentSpark share payload  { v, agents, files, topic, level, state.lang }
  // 2) AgentSpark project record { id, name, agents, files, topic, ... }
  // 3) Raw agents array           [ { id, name, ... }, ... ]
  let payload;
  if (Array.isArray(data) && data[0]?.id && data[0]?.name) {
    // Raw agents array
    payload = { agents: data, topic: tr('Imported', 'Zaimportowane'), level: 'iskra', files: {} };
  } else if (data.agents?.length) {
    payload = data;
  } else {
    _showImportError(tr(
      'No agents found in this JSON file. Make sure it\'s an AgentSpark export.',
      'W tym pliku JSON nie znaleziono agentow. Upewnij sie, ze to eksport AgentSpark.'
    ));
    return;
  }
  _importParsed = { ...payload, _sourceFile: filename };
  _showImportPreview(payload, filename);
}

async function _parseImportZip(file: File) {
  if (typeof JSZip === 'undefined') {
    _showImportError(tr('JSZip library not loaded — cannot read ZIP files.', 'Biblioteka JSZip nie jest zaladowana — nie mozna odczytac pliku ZIP.')); return;
  }
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (e: any) {
    _showImportError(tr('Cannot open ZIP: ', 'Nie mozna otworzyc ZIP: ') + e.message); return;
  }

  // Strategy 1: look for agentspark.json manifest (lossless)
  const manifestFile = zip.file('agentspark.json');
  if (manifestFile) {
    const text = await manifestFile.async('text');
    await _parseImportJson(text, file.name + ' → agentspark.json');
    return;
  }

  // Strategy 2: look for any .json in the zip
  const jsonFiles = Object.keys(zip.files).filter(n => n.endsWith('.json') && !zip.files[n].dir);
  for (const jf of jsonFiles) {
    const text = await zip.file(jf).async('text');
    try {
      const data = JSON.parse(text);
      if (data.agents?.length) {
        _importParsed = { ...data, _sourceFile: file.name };
        _showImportPreview(data, file.name);
        return;
      }
    } catch (e) { /* try next */ }
  }

  // Strategy 3: reconstruct from .md files (generic zip without manifest)
  const mdFiles: Record<string, string> = {};
  const mdNames = Object.keys(zip.files).filter(n => n.endsWith('.md') && !zip.files[n].dir);
  for (const mf of mdNames) {
    mdFiles[mf] = await zip.file(mf).async('text');
  }
  if (!mdNames.length) {
    _showImportError(tr('No recognizable AgentSpark files found in this ZIP.', 'W tym ZIP nie znaleziono rozpoznawalnych plikow AgentSpark.')); return;
  }
  const reconstructed = _reconstructFromMdFiles(mdFiles, file.name);
  if (!reconstructed.agents.length) {
    _showImportError(tr('Could not reconstruct agents from .md files in this ZIP.', 'Nie udalo sie odtworzyc agentow z plikow .md w tym ZIP.')); return;
  }
  _importParsed = { ...reconstructed, _sourceFile: file.name };
  _showImportPreview(reconstructed, file.name);
}

// Reconstruct minimal agent list from agent-*.md files
function _reconstructFromMdFiles(mdFiles: Record<string, string>, zipName: string) {
  const agents: any[] = [];
  const files = { ...mdFiles };
  let topic = tr('Imported from ZIP', 'Zaimportowano z ZIP');

  // Try to get topic from README.md
  if (mdFiles['README.md']) {
    const m = mdFiles['README.md'].match(/\*\*Project:\*\*\s*(.+)/);
    if (m) topic = m[1].trim();
  }

  // Parse agent-*.md files
  Object.entries(mdFiles).forEach(([name, content]) => {
    if (!name.startsWith('agent-') || !name.endsWith('.md')) return;
    const idSlug = name.replace(/^agent-/, '').replace(/\.md$/, '');
    const nameMatch = content.match(/^#\s+Agent:\s+(.+)/m);
    const roleMatch = content.match(/\*\*Role:\*\*\s*(.+)/m);
    const emojiMatch = content.match(/^##\s+Identity[\s\S]*?([^\w\s])/m);
    const descMatch = content.match(/^##\s+Goal\s*\n+([\s\S]+?)(?:\n##|$)/m);
    agents.push({
      id: idSlug,
      name: nameMatch?.[1]?.trim() || idSlug,
      emoji: emojiMatch?.[1] || '🤖',
      type: 'technical',
      role: roleMatch?.[1]?.trim() || 'Agent',
      description: descMatch?.[1]?.trim().slice(0, 200) || '',
      agentMd: content,
      skillMd: mdFiles[`skill-${idSlug}.md`] || '',
    });
  });

  return { agents, files, topic, level: 'iskra', lang: 'en' };
}

// ── Preview ───────────────────────────────────────────────
function _showImportPreview(payload: any, filename: string) {
  const agents = payload.agents || [];
  const tech = agents.filter((a: any) => a.type === 'technical');
  const biz = agents.filter((a: any) => a.type !== 'technical');
  const fileCount = Object.keys(payload.files || {}).length;

  const preview = (document.getElementById('import-preview') as HTMLElement);
  const content = (document.getElementById('import-preview-content') as HTMLElement);
  const dropzone = (document.getElementById('import-dropzone') as HTMLElement);

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1.5rem;margin-bottom:0.75rem;">
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('FILE', 'PLIK')}</span><br/><strong style="font-size:0.85rem;">${_escHtml(filename)}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('TOPIC', 'TEMAT')}</span><br/><strong style="font-size:0.85rem;">${_escHtml(payload.topic || '—')}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('LEVEL', 'POZIOM')}</span><br/><strong style="font-size:0.85rem;">${payload.level || '—'}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('FILES', 'PLIKI')}</span><br/><strong style="font-size:0.85rem;">${fileCount} .md ${tr('files', 'plikow')}</strong></div>
    </div>
    <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.4rem;">${tr('AGENTS', 'AGENCI')} (${agents.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
      ${agents.map((a: any) => `<span style="font-size:0.75rem;padding:0.2rem 0.55rem;border-radius:5px;
        background:${a.type === 'technical' ? 'rgba(124,58,255,0.12)' : 'rgba(255,107,53,0.12)'};
        border:1px solid ${a.type === 'technical' ? 'rgba(196,147,10,0.3)' : 'rgba(255,107,53,0.3)'};
        color:${a.type === 'technical' ? 'var(--accent3)' : 'var(--accent2)'}">${a.emoji || '🤖'} ${_escHtml(a.name)}</span>`).join('')}
    </div>
    ${!agents.length ? `<div style="color:var(--accent2);">⚠ ${tr('No agents detected', 'Nie wykryto agentow')}</div>` : ''}
  `;

  preview.style.display = 'block';
  dropzone.style.opacity = '0.5';
  dropzone.style.pointerEvents = 'none';
}

// ── Confirm import ────────────────────────────────────────
async function confirmImport() {
  if (!_importParsed) return;
  const p = _importParsed;
  const saveToDb = (document.getElementById('import-save-checkbox') as HTMLInputElement)?.checked !== false;

  // Restore state — same pattern as loadProject / share restore
  state.currentTopic = p.topic || tr('Imported Project', 'Zaimportowany projekt');
  state.currentLevel = p.level || 'iskra';
  if (p.lang) { state.lang = p.lang; setLang(state.lang); }
  state.generatedAgents = JSON.parse(JSON.stringify(p.agents || []));
  state.generatedFiles = JSON.parse(JSON.stringify(p.files || {}));

  // Regenerate missing files
  if (!state.generatedFiles['README.md'] && state.generatedAgents.length) {
    state.generatedFiles['README.md'] = generateReadme();
  }
  state.generatedAgents.forEach(a => {
    if (!state.generatedFiles[`agent-${a.id}.md`] && a.agentMd)
      state.generatedFiles[`agent-${a.id}.md`] = a.agentMd;
    if (!state.generatedFiles[`skill-${a.id}.md`] && a.skillMd)
      state.generatedFiles[`skill-${a.id}.md`] = a.skillMd;
  });

  // Bootstrap version history
  state.versionHistory = [{
    id: Date.now(),
    label: state.lang === 'en' ? `Imported: ${state.currentTopic}` : `Zaimportowany: ${state.currentTopic}`,
    ts: new Date(),
    agents: JSON.parse(JSON.stringify(state.generatedAgents)),
    files: JSON.parse(JSON.stringify(state.generatedFiles)),
    diff: { added: [], removed: [], changed: [] },
    removedNames: {},
    agentNames: Object.fromEntries(state.generatedAgents.map(a => [a.id, a.name])),
    vNum: 1,
    isOrigin: true,
  }];

  // Reset project ID — will be assigned fresh by save
  state.currentProjectId = null;

  closeImportModal();
  showScreen('results');
  (document.getElementById('apiKeyHeader') as HTMLElement).style.display = 'flex';
  showResults(false);

  // Save to IndexedDB if requested
  if (saveToDb) {
    await saveCurrentProject(true);
  }

  showNotif(state.lang === 'en'
    ? `✓ Imported "${state.currentTopic}" — ${state.generatedAgents.length} agents`
    : `✓ Zaimportowano "${state.currentTopic}" — ${state.generatedAgents.length} agentów`
  );
}

// ── Reset modal ───────────────────────────────────────────
function resetImportModal() {
  _importParsed = null;
  const preview = (document.getElementById('import-preview') as HTMLElement);
  const error = (document.getElementById('import-error') as HTMLElement);
  const dropzone = (document.getElementById('import-dropzone') as HTMLElement);
  if (preview) preview.style.display = 'none';
  if (error) error.style.display = 'none';
  if (dropzone) { dropzone.style.opacity = ''; dropzone.style.pointerEvents = ''; }
}

function _showImportError(msg: string) {
  const el = (document.getElementById('import-error') as HTMLElement);
  if (!el) return;
  el.textContent = `⚠ ${msg}`;
  el.style.display = 'block';
}
function _clearImportError() {
  const el = (document.getElementById('import-error') as HTMLElement);
  if (el) el.style.display = 'none';
}

// ─── PROMPT EXPORT (#7) ──────────────────────────────────
let _activePromptTab = 'interview';

const PROMPT_TAB_DESCS = {
  interview: 'System prompt used during the AI interview phase — guides question format, depth calibration, and IMPACT notes.',
  generate: 'System prompt used to generate your agent team JSON from interview answers.',
  refine: 'System prompt used when refining / editing an existing team.'
};

function openPromptExport() {
  _activePromptTab = 'interview';
  _renderPromptTab('interview');
  (document.getElementById('prompt-export-modal') as HTMLElement).classList.add('open');
}

function closePromptExport() {
  (document.getElementById('prompt-export-modal') as HTMLElement).classList.remove('open');
}

function switchPromptTab(tab: string) {
  _activePromptTab = tab;
  document.querySelectorAll('.prompt-tab-btn').forEach(b => b.classList.remove('active'));
  (document.getElementById('ptab-' + tab) as HTMLElement)?.classList.add('active');
  _renderPromptTab(tab);
}

function _getPromptForTab(tab: string) {
  if (tab === 'interview') return getSystemPrompt();
  if (tab === 'generate') return getSystemPrompt() + '\n\n--- GENERATION PHASE TRIGGER ---\nWhen user sends [GENERATE], respond with the JSON agent team.';
  if (tab === 'refine') return getRefineSystemPrompt();
  return '';
}

function _renderPromptTab(tab: string) {
  const ta = (document.getElementById('prompt-export-textarea') as HTMLTextAreaElement);
  const desc = (document.getElementById('prompt-tab-desc') as HTMLElement);
  if (ta) ta.value = _getPromptForTab(tab);
  if (desc) desc.textContent = PROMPT_TAB_DESCS[tab as keyof typeof PROMPT_TAB_DESCS] || '';
  // reset copy feedback
  const fb = (document.getElementById('copy-prompt-feedback') as HTMLElement);
  if (fb) { fb.textContent = ''; fb.style.opacity = '0'; }
}

async function copyPromptToClipboard() {
  const ta = (document.getElementById('prompt-export-textarea') as HTMLTextAreaElement);
  const fb = (document.getElementById('copy-prompt-feedback') as HTMLElement);
  const btn = (document.getElementById('copy-prompt-btn') as HTMLElement);
  if (!ta) return;
  try {
    await navigator.clipboard.writeText(ta.value);
    if (fb) { fb.textContent = tr('✓ Copied!', '✓ Skopiowano!'); fb.style.opacity = '1'; setTimeout(() => { fb.style.opacity = '0'; }, 2000); }
    if (btn) { const orig = btn.textContent; btn.textContent = tr('✓ Copied!', '✓ Skopiowano!'); setTimeout(() => { btn.textContent = orig; }, 1500); }
  } catch (e) {
    ta.select();
    document.execCommand('copy');
    if (fb) { fb.textContent = tr('✓ Copied!', '✓ Skopiowano!'); fb.style.opacity = '1'; setTimeout(() => { fb.style.opacity = '0'; }, 2000); }
  }
}

function downloadPromptTxt() {
  const content = _getPromptForTab(_activePromptTab);
  const topicSlug = (state.currentTopic || 'agentspark').toLowerCase().replace(/\s+/g, '-');
  const filename = `prompt-${_activePromptTab}-${topicSlug}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function openFrameworkExport() {
  if (!state.generatedAgents.length) {
    showNotif(state.lang === 'en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  renderFwModal();
  (document.getElementById('fw-modal') as HTMLElement).classList.add('open');
}

function closeFwModal() {
  (document.getElementById('fw-modal') as HTMLElement).classList.remove('open');
}

function renderFwModal() {
  const tabsEl = (document.getElementById('fw-tabs') as HTMLElement);
  const bodyEl = (document.getElementById('fw-body') as HTMLElement);
  tabsEl.innerHTML = '';
  bodyEl.innerHTML = '';

  FRAMEWORKS.forEach(fw => {
    // Tab
    const tab = document.createElement('button');
    tab.className = 'fw-tab' + (activeFwTab === fw.id ? ' active' : '');
    tab.innerHTML = `${fw.logo} ${fw.label} <span class="fw-badge">${fw.badge}</span>`;
    tab.onclick = () => { activeFwTab = fw.id; renderFwModal(); };
    tabsEl.appendChild(tab);

    // Pane
    const pane = document.createElement('div');
    pane.className = 'fw-pane' + (activeFwTab === fw.id ? ' active' : '');

    if (fw.id === 'claude') {
      pane.innerHTML = renderClaudeProjectsPane();
    } else {
      const code = generateFrameworkCode(fw.id);
      pane.innerHTML = `
        <div class="fw-info">
          <div class="fw-info-text">
            <div class="fw-info-title">${fw.logo} ${fw.label}</div>
            <div class="fw-info-desc">${fw.desc} <a href="${fw.url}" target="_blank" style="color:var(--accent);text-decoration:none;">Docs ↗</a></div>
          </div>
        </div>
        <div class="fw-code-wrap">
          <pre id="fw-code-${fw.id}">${escapeHtml(code)}</pre>
        </div>
        <div class="fw-footer-row">
          <div class="fw-pip">$ ${fw.pip}</div>
          <button class="modal-download-btn" onclick="copyFwCode('${fw.id}')">📋 ${state.lang === 'en' ? 'Copy' : 'Kopiuj'}</button>
          <button class="modal-download-btn" onclick="downloadFwCode('${fw.id}')">⬇ ${state.lang === 'en' ? 'Download .py' : 'Pobierz .py'}</button>
        </div>
      `;
    }
    bodyEl.appendChild(pane);
  });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyFwCode(fwId: string) {
  const code = generateFrameworkCode(fwId);
  navigator.clipboard.writeText(code).then(() => {
    showNotif(state.lang === 'en' ? '✓ Code copied to clipboard!' : '✓ Kod skopiowany!');
  }).catch(() => {
    showNotif(state.lang === 'en' ? '⚠ Copy failed — select manually' : '⚠ Kopiowanie nieudane', true);
  });
}

function downloadFwCode(fwId: string) {
  if (fwId === 'claude') { downloadAllClaudePrompts(); return; }
  const code = generateFrameworkCode(fwId);
  const slug = state.currentTopic.toLowerCase().replace(/\s+/g, '_');
  const filename = `${fwId}_${slug}.py`;
  const blob = new Blob([code], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  showNotif(`✓ ${filename} downloaded`);
}

// ── Code generators ────────────────────────────────────────

function generateFrameworkCode(fwId: string) {
  switch (fwId) {
    case 'claude': return genClaudeProjects();
    case 'crewai': return genCrewAI();
    case 'langgraph': return genLangGraph();
    case 'autogen': return genAutoGen();
    case 'swarm': return genSwarm();
    default: return '# Unknown framework';
  }
}

function agentVarName(agent: any) {
  return agent.id.replace(/-/g, '_') + '_agent';
}
function taskVarName(agent: any) {
  return agent.id.replace(/-/g, '_') + '_task';
}

// ── Claude Projects renderer ───────────────────────────────

function renderClaudeProjectsPane() {
  const agents = state.generatedAgents as any[];
  const cards = agents.map((a, i) => {
    const prompt = genClaudeAgentPrompt(a);
    const safeId = `claude-agent-${i}`;
    return `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:0.75rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;gap:0.5rem;flex-wrap:wrap;">
        <div style="font-weight:700;font-size:0.95rem;">${a.emoji || '🤖'} ${a.name}</div>
        <div style="display:flex;gap:0.4rem;">
          <button class="modal-download-btn" onclick="copyClaudePrompt(${i})" style="font-size:0.72rem;padding:0.25rem 0.6rem;">📋 Copy prompt</button>
          <button class="modal-download-btn" onclick="downloadClaudePrompt(${i})" style="font-size:0.72rem;padding:0.25rem 0.6rem;">⬇ .md</button>
          <a href="https://claude.ai/projects" target="_blank" class="modal-download-btn" style="font-size:0.72rem;padding:0.25rem 0.6rem;text-decoration:none;">🟠 Open Claude</a>
        </div>
      </div>
      <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.6rem;">${a.role || a.type || ''} · ${a.description ? a.description.slice(0, 90) + '…' : ''}</div>
      <details style="margin-top:0.25rem;">
        <summary style="cursor:pointer;font-size:0.75rem;color:var(--accent);font-family:'Space Mono',monospace;letter-spacing:0.05em;user-select:none;">VIEW PROMPT</summary>
        <pre id="${safeId}" style="margin-top:0.6rem;font-size:0.7rem;line-height:1.5;max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0.75rem;">${escapeHtml(prompt)}</pre>
      </details>
    </div>`;
  }).join('');

  const steps = `
    <div style="background:rgba(242,185,13,0.05);border:1px solid rgba(242,185,13,0.2);border-radius:10px;padding:1rem;margin-bottom:1rem;">
      <div style="font-size:0.72rem;font-family:'Space Mono',monospace;color:var(--accent);letter-spacing:0.08em;margin-bottom:0.6rem;">HOW TO USE</div>
      <ol style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:0.35rem;">
        <li style="font-size:0.82rem;color:var(--muted);">Go to <a href="https://claude.ai/projects" target="_blank" style="color:var(--accent);">claude.ai/projects</a> and click <strong>New Project</strong></li>
        <li style="font-size:0.82rem;color:var(--muted);">Give the project the agent's name (e.g. "<strong>${agents[0]?.name || 'Agent'}</strong>")</li>
        <li style="font-size:0.82rem;color:var(--muted);">Open <strong>Project Instructions</strong> and paste the copied prompt</li>
        <li style="font-size:0.82rem;color:var(--muted);">Repeat for each agent — one Project per agent</li>
        <li style="font-size:0.82rem;color:var(--muted);">Start chatting — each Project is your dedicated specialist</li>
      </ol>
    </div>`;

  const downloadAllBtn = `
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
      <button class="btn-primary" style="flex:1;font-size:0.85rem;" onclick="downloadAllClaudePrompts()">⬇ Download All Prompts (.zip)</button>
      <button class="btn-secondary" style="font-size:0.85rem;" onclick="copyClaudeTeamSummary()">📋 Team Summary</button>
    </div>`;

  return steps + downloadAllBtn + cards;
}

function genClaudeAgentPrompt(agent: any) {
  return `# ${agent.emoji || '🤖'} ${agent.name}

## Role
${agent.role || agent.type || 'Specialist'}

## About You
${agent.description || ''}

## Your Expertise
${agent.skillMd ? agent.skillMd.replace(/^# Skill:.*\n/, '').trim() : (agent.skills ? agent.skills.join(', ') : 'See description above')}

## Personality & Communication Style
Be concise, professional, and focused. Stay within your area of expertise. When a question falls outside your scope, say so clearly and suggest which team member is better suited.

## Team Context
You are part of a ${state.generatedAgents.length}-agent team working on: **${state.currentTopic}**
${state.generatedAgents.filter(a => a.id !== agent.id).map(a => `- ${a.emoji || '🤖'} **${a.name}** — ${a.role || a.type}`).join('\n')}

Always keep your team context in mind. If the user needs help from a colleague, recommend them by name.`;
}

function genClaudeProjects() {
  // Returns combined text for copy/download all
  return state.generatedAgents.map(a =>
    `${'='.repeat(60)}\n# ${a.emoji || '🤖'} ${a.name}\n${'='.repeat(60)}\n\n${genClaudeAgentPrompt(a)}\n`
  ).join('\n\n');
}

function copyClaudePrompt(agentIndex: number) {
  const agent = state.generatedAgents[agentIndex];
  if (!agent) return;
  navigator.clipboard.writeText(genClaudeAgentPrompt(agent)).then(() => {
    showNotif(`✓ ${agent.name} prompt copied — paste into Claude Project Instructions`);
  }).catch(() => showNotif('⚠ Copy failed — use the View Prompt section', true));
}

function downloadClaudePrompt(agentIndex: number) {
  const agent = state.generatedAgents[agentIndex];
  if (!agent) return;
  const content = genClaudeAgentPrompt(agent);
  const slug = agent.name.toLowerCase().replace(/\s+/g, '-');
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `claude-project-${slug}.md`;
  a.click();
  showNotif(`✓ claude-project-${slug}.md downloaded`);
}

async function downloadAllClaudePrompts() {
  if (typeof JSZip === 'undefined') {
    // Fallback: download as single combined file
    const content = genClaudeProjects();
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `claude-projects-${state.currentTopic.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    showNotif('✓ All prompts downloaded as single file');
    return;
  }
  const zip = new JSZip();
  state.generatedAgents.forEach(agent => {
    const slug = agent.name.toLowerCase().replace(/\s+/g, '-');
    zip.file(`claude-project-${slug}.md`, genClaudeAgentPrompt(agent));
  });
  // Add team summary
  zip.file('team-summary.md', genClaudeTeamSummaryText());
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `claude-projects-${state.currentTopic.toLowerCase().replace(/\s+/g, '-')}.zip`;
  a.click();
  showNotif(`✓ ${state.generatedAgents.length} Claude Project prompts downloaded`);
}

function genClaudeTeamSummaryText() {
  return `# ${state.currentTopic} — Claude Projects Setup

## Your AI Team (${state.generatedAgents.length} agents)

${state.generatedAgents.map(a => `### ${a.emoji || '🤖'} ${a.name}
- **Role:** ${a.role || a.type || 'Specialist'}
- **Description:** ${a.description || ''}
- **Claude Project file:** claude-project-${a.name.toLowerCase().replace(/\s+/g, '-')}.md`).join('\n\n')}

## Setup Instructions

1. Go to **claude.ai/projects** and create a new Project for each agent above
2. Name each Project after the agent
3. Paste the corresponding prompt file content into **Project Instructions**
4. Optionally upload relevant documents to each Project's knowledge base
5. Start a conversation with each agent in their dedicated Project

## Usage Tips

- Talk to each agent in their own Project for best results
- You can copy outputs from one Project and paste into another as context
- Use the agent's name when referring to teammates in conversation
`;
}

function copyClaudeTeamSummary() {
  navigator.clipboard.writeText(genClaudeTeamSummaryText()).then(() => {
    showNotif('✓ Team summary copied!');
  }).catch(() => showNotif('⚠ Copy failed', true));
}

function genCrewAI() {
  const topic = state.currentTopic;
  const agents = state.generatedAgents;
  const agentDefs = agents.map(a => `
${agentVarName(a)} = Agent(
    role="${a.role || a.name}",
    goal="${a.description.split('.')[0]}.",
    backstory="""${a.description}""",
    verbose=True,
    allow_delegation=${a.type === 'technical' ? 'False' : 'True'},
    tools=[],  # Add your tools here
)`).join('\n');

  const taskDefs = agents.map((a, i) => {
    const next = agents[i + 1];
    return `
${taskVarName(a)} = Task(
    description="""
    Topic: ${topic}
    Agent: ${a.name} — ${a.role || ''}
    ${a.description}
    """,
    expected_output="Detailed output from ${a.name} covering its responsibilities.",
    agent=${agentVarName(a)},${next ? `\n    context=[],  # Will receive output from previous tasks` : ''}
)`;
  }).join('\n');

  const agentList = agents.map(a => `    ${agentVarName(a)},`).join('\n');
  const taskList = agents.map(a => `    ${taskVarName(a)},`).join('\n');

  return `"""
AgentSpark → CrewAI Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://docs.crewai.com
"""

from crewai import Agent, Task, Crew, Process
# from crewai_tools import SerperDevTool, FileReadTool  # uncomment to add tools

# ── Agents ────────────────────────────────────────────────
${agentDefs}

# ── Tasks ─────────────────────────────────────────────────
${taskDefs}

# ── Crew ──────────────────────────────────────────────────
crew = Crew(
    agents=[
${agentList}
    ],
    tasks=[
${taskList}
    ],
    process=Process.sequential,  # or Process.hierarchical
    verbose=True,
)

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    result = crew.kickoff()
    print("\\n=== CREW RESULT ===")
    print(result)
`;
}

function genLangGraph() {
  const topic = state.currentTopic;
  const agents = state.generatedAgents;

  const stateFields = agents.map(a =>
    `    ${a.id.replace(/-/g, '_')}_output: str`
  ).join('\n');

  const nodeDefs = agents.map(a => {
    const varName = a.id.replace(/-/g, '_');
    return `
def ${varName}_node(state: AgentState) -> AgentState:
    """${a.name}: ${a.description.split('.')[0]}."""
    response = llm.invoke([
        SystemMessage(content="""You are ${a.name}, ${a.role || a.description.split('.')[0]}.
Topic: ${topic}
Task: ${a.description}"""),
        HumanMessage(content=state.get("user_input", "Start the workflow.")),
    ])
    state["${varName}_output"] = response.content
    state["messages"].append(AIMessage(content=f"[${a.name}] " + response.content))
    return state`;
  }).join('\n');

  const addNodes = agents.map(a =>
    `workflow.add_node("${a.id}", ${a.id.replace(/-/g, '_')}_node)`
  ).join('\n');

  const addEdges = agents.map((a, i) => {
    if (i === 0) return `workflow.set_entry_point("${a.id}")`;
    return `workflow.add_edge("${agents[i - 1].id}", "${a.id}")`;
  }).join('\n');

  const lastId = agents[agents.length - 1]?.id || 'end';

  return `"""
AgentSpark → LangGraph Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://langchain-ai.github.io/langgraph
"""

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import operator

# ── State ─────────────────────────────────────────────────
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    user_input: str
${stateFields}

# ── LLM ───────────────────────────────────────────────────
llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

# ── Agent Nodes ───────────────────────────────────────────
${nodeDefs}

# ── Graph ─────────────────────────────────────────────────
workflow = StateGraph(AgentState)

${addNodes}

${addEdges}
workflow.add_edge("${lastId}", END)

app = workflow.compile()

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    result = app.invoke({
        "messages": [],
        "user_input": "Build the ${topic} application.",
${agents.map(a => `        "${a.id.replace(/-/g, '_')}_output": ""`).join(',\n')}
    })
    print("\\n=== FINAL STATE ===")
    for key, val in result.items():
        if val and key != "messages":
            print(f"\\n[{key}]\\n{val}")
`;
}

function genAutoGen() {
  const topic = state.currentTopic;
  const agents = state.generatedAgents;

  const agentDefs = agents.map(a => `
${a.id.replace(/-/g, '_')} = AssistantAgent(
    name="${a.name.replace(/\s+/g, '_')}",
    system_message="""You are ${a.name}.
Role: ${a.role || a.name}
Responsibilities: ${a.description}
Topic: ${topic}

When you complete your part, summarize your output clearly and pass to the next agent.""",
    llm_config=llm_config,
)`).join('\n');

  const groupChatAgents = agents.map(a => `    ${a.id.replace(/-/g, '_')},`).join('\n');

  return `"""
AgentSpark → AutoGen Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://microsoft.github.io/autogen
"""

import autogen

# ── LLM Config ────────────────────────────────────────────
llm_config = {
    "config_list": [{"model": "gpt-4o", "api_key": "YOUR_OPENAI_API_KEY"}],
    "temperature": 0.7,
    "timeout": 120,
}

# ── Human Proxy ───────────────────────────────────────────
user_proxy = autogen.UserProxyAgent(
    name="UserProxy",
    human_input_mode="NEVER",  # Set to "ALWAYS" for interactive mode
    max_consecutive_auto_reply=10,
    is_termination_msg=lambda x: "TASK_COMPLETE" in x.get("content", ""),
    code_execution_config={"work_dir": "workspace", "use_docker": False},
)

# ── Agents ────────────────────────────────────────────────
${agentDefs}

# ── Group Chat ────────────────────────────────────────────
groupchat = autogen.GroupChat(
    agents=[
        user_proxy,
${groupChatAgents}
    ],
    messages=[],
    max_round=20,
    speaker_selection_method="round_robin",  # or "auto"
)

manager = autogen.GroupChatManager(
    groupchat=groupchat,
    llm_config=llm_config,
)

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    user_proxy.initiate_chat(
        manager,
        message=f"""
        Build the ${topic} application.
        Each agent should complete their responsibilities and hand off to the next.
        Finish with TASK_COMPLETE when all work is done.
        """,
    )
`;
}

function genSwarm() {
  const topic = state.currentTopic;
  const agents = state.generatedAgents;

  const agentDefs = agents.map((a, i) => {
    const nextAgent = agents[i + 1];
    const handoff = nextAgent
      ? `\n    handoff_to_${nextAgent.id.replace(/-/g, '_')} = transfer_to_${nextAgent.id.replace(/-/g, '_')}()`
      : '';
    return `
def ${a.id.replace(/-/g, '_')}_instructions(context_variables):
    return f"""You are ${a.name}.
Role: ${a.role || a.name}
Topic: ${topic}
Task: ${a.description}
${nextAgent ? `When done, call transfer_to_${nextAgent.id.replace(/-/g, '_')} to pass to the next agent.` : 'This is the final step. Summarize all work done.'}"""

${a.id.replace(/-/g, '_')} = Agent(
    name="${a.name}",
    instructions=${a.id.replace(/-/g, '_')}_instructions,
    functions=[${nextAgent ? `transfer_to_${nextAgent.id.replace(/-/g, '_')}` : ''}],
)`;
  }).join('\n');

  const transferFns = agents.slice(0, -1).map((a, i) => {
    const next = agents[i + 1];
    return `
def transfer_to_${next.id.replace(/-/g, '_')}():
    """Transfer to ${next.name} — ${next.description.split('.')[0]}."""
    return ${next.id.replace(/-/g, '_')}`;
  }).join('\n');

  const firstAgent = agents[0]?.id.replace(/-/g, '_') || 'agent';

  return `"""
AgentSpark → OpenAI Swarm Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0, 10)}
Docs: https://github.com/openai/swarm
Install: pip install git+https://github.com/openai/swarm.git
"""

from swarm import Swarm, Agent

client = Swarm()

# ── Transfer Functions (forward declarations) ──────────────
${agents.slice(1).map(a => `${a.id.replace(/-/g, '_')} = None  # defined below`).join('\n')}

# ── Agents ────────────────────────────────────────────────
${agentDefs}

# ── Handoff Functions ─────────────────────────────────────
${transferFns}

# ── Fix forward references ────────────────────────────────
${agents.slice(0, -1).map((a, i) => {
    const next = agents[i + 1];
    return `${a.id.replace(/-/g, '_')}.functions = [transfer_to_${next.id.replace(/-/g, '_')}]`;
  }).join('\n')}

# ── Run ───────────────────────────────────────────────────
if __name__ == "__main__":
    response = client.run(
        agent=${firstAgent},
        messages=[{"role": "user", "content": "Build the ${topic} application. Complete all steps."}],
        context_variables={"topic": "${topic}"},
        debug=False,
    )
    print("\\n=== SWARM RESULT ===")
    print(response.messages[-1]["content"])
`;
}

(document.getElementById('fw-modal') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) closeFwModal();
});
(document.getElementById('diff-modal') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) closeDiffModal();
});
(document.getElementById('prompt-export-modal') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) closePromptExport();
});
(document.getElementById('import-modal') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) closeImportModal();
});


// ─── ONBOARDING WIZARD ────────────────────────────────────

let _obStep = 0;
let _obProvider: any = null;

const OB_PROVIDER_CONFIG: Record<string, any> = {
  gemini: { label: 'Gemini API Key', placeholder: 'AIza…', prefix: 'AIza', keyLink: 'https://aistudio.google.com/apikey', modelValue: 'gemini|gemini-2.5-flash-preview-05-20|https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}|gemini' },
  groq: { label: 'Groq API Key', placeholder: 'gsk_…', prefix: 'gsk_', keyLink: 'https://console.groq.com/keys', modelValue: 'openai|llama-3.3-70b-versatile|https://api.groq.com/openai/v1/chat/completions|groq' },
  anthropic: { label: 'Anthropic API Key', placeholder: 'sk-ant-…', prefix: 'sk-ant-', keyLink: 'https://console.anthropic.com/settings/keys', modelValue: 'anthropic|claude-sonnet-4-5|https://api.anthropic.com/v1/messages|anthropic' },
  openai: { label: 'OpenAI API Key', placeholder: 'sk-…', prefix: 'sk-', keyLink: 'https://platform.openai.com/api-keys', modelValue: 'openai|gpt-4o|https://api.openai.com/v1/chat/completions|openai' },
};

function maybeShowOnboarding() {
  const hasKey = !!sessionStorage.getItem('agentspark-api-key');
  const hasSeen = !!localStorage.getItem('agentspark-onboarding-done');
  const isShared = window.location.hash.startsWith('#share=');
  if (!hasKey && !hasSeen && !isShared) {
    setTimeout(() => {
      (document.getElementById('onboarding-modal') as HTMLElement).classList.add('open');
    }, 600);
  }
}

function obSetStep(n: number) {
  _obStep = n;
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`ob-step-${i}`);
    if (el) el.style.display = i === n ? '' : 'none';
    const dot = document.getElementById(`ob-dot-${i}`);
    if (dot) dot.classList.toggle('active', i === n);
  }
}

function obNext() {
  if (_obStep === 0) { obSetStep(1); return; }
  if (_obStep === 1) {
    if (!_obProvider) {
      showNotif('⚠ Pick a provider first', true); return;
    }
    const cfg = OB_PROVIDER_CONFIG[_obProvider];
    (document.getElementById('ob-step2-title') as HTMLElement).textContent = `Paste your ${cfg.label}`;
    (document.getElementById('ob-key-link') as HTMLAnchorElement).href = cfg.keyLink;
    (document.getElementById('ob-key-link') as HTMLAnchorElement).textContent = cfg.keyLink.replace('https://', '');
    (document.getElementById('ob-key-input') as HTMLInputElement).placeholder = cfg.placeholder;
    (document.getElementById('ob-key-input') as HTMLInputElement).value = '';
    (document.getElementById('ob-key-feedback') as HTMLElement).textContent = '';
    (document.getElementById('ob-finish-btn') as HTMLButtonElement).disabled = true;
    obSetStep(2);
  }
}

function obBack() {
  if (_obStep > 0) obSetStep(_obStep - 1);
}

function obCheckKey(val: string) {
  const feedback = (document.getElementById('ob-key-feedback') as HTMLElement);
  const btn = (document.getElementById('ob-finish-btn') as HTMLButtonElement);
  if (!_obProvider) return;
  const cfg = OB_PROVIDER_CONFIG[_obProvider];
  const trimmed = val.trim();

  if (trimmed.length < 10) {
    feedback.textContent = '';
    btn.disabled = true;
  } else if (!trimmed.startsWith(cfg.prefix)) {
    feedback.textContent = `⚠ ${_obProvider === 'gemini' ? 'Gemini' : _obProvider === 'groq' ? 'Groq' : _obProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} keys usually start with "${cfg.prefix}"`;
    feedback.style.color = 'var(--accent2)';
    btn.disabled = false; // allow anyway
  } else {
    feedback.textContent = '✓ Looks good!';
    feedback.style.color = 'var(--success)';
    btn.disabled = false;
  }
}

function obSelectProvider(provider: string) {
  _obProvider = provider;
  document.querySelectorAll('.ob-provider-opt').forEach((el: any) => {
    el.classList.toggle('selected', el.dataset.provider === provider);
  });
}

function obFinish() {
  const keyVal = (document.getElementById('ob-key-input') as HTMLInputElement).value.trim();
  if (keyVal.length < 10) { showNotif('⚠ Key too short', true); return; }

  // Apply key and model
  syncApiKey(keyVal);
  const cfg = OB_PROVIDER_CONFIG[_obProvider];
  const sel = (document.getElementById('modelSelect') as HTMLSelectElement);
  if (sel) {
    // Find matching option
    for (const opt of Array.from(sel.options)) {
      if (opt.value === cfg.modelValue) { opt.selected = true; break; }
    }
    onModelChange();
  }

  localStorage.setItem('agentspark-onboarding-done', '1');
  (document.getElementById('onboarding-modal') as HTMLElement).classList.remove('open');
  showNotif(`✓ ${OB_PROVIDER_CONFIG[_obProvider].label} saved — ready to build!`);
  // Open API setup so key is visible
  const body = (document.getElementById('api-setup-body') as HTMLElement);
  if (body && !body.classList.contains('open')) toggleApiSetup();
}

function obSkip() {
  localStorage.setItem('agentspark-onboarding-done', '1');
  (document.getElementById('onboarding-modal') as HTMLElement).classList.remove('open');
}

// Wire up provider option clicks
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ob-provider-opt').forEach(el => {
    el.addEventListener('click', () => obSelectProvider((el as HTMLElement).dataset.provider || ''));
  });
});

// ─── DEMO MODE ───────────────────────────────────────────

const DEMO_TEAM = {
  topic: 'E-commerce Customer Support',
  level: 'plomien',
  agents: [
    {
      id: 'customer-support',
      name: 'Customer Support Agent',
      emoji: '🎧',
      type: 'business',
      role: 'FRONTLINE',
      description: 'First point of contact. Greets customers, handles FAQs, and routes complex queries to specialist agents.',
      agentMd: `# Agent: Customer Support Agent\n\n## Identity\nYou are the Customer Support Agent for an e-commerce business. You are the friendly face of the team.\n\n## Goal\nResolve customer inquiries quickly and professionally. Handle common questions directly; escalate complex order or refund issues to specialist agents.\n\n## Personality\nWarm, patient, and empathetic. You never make customers feel like a burden.\n\n## Context\nYou handle the first contact in a 3-agent support team. Your colleagues are the Order Manager and Refund Specialist.`,
      skillMd: `# Skill: Customer Support\n\n## Capabilities\n- Answer FAQs about shipping, returns, and product availability\n- Look up order status by order ID\n- Triage and route complex issues\n\n## Instructions\n1. Greet the customer by name if provided\n2. Identify the type of issue (order, refund, product, general)\n3. Resolve directly if possible; otherwise escalate with full context\n\n## Output Format\nConversational, friendly tone. Keep responses under 3 paragraphs.`
    },
    {
      id: 'order-manager',
      name: 'Order Management Agent',
      emoji: '📦',
      type: 'technical',
      role: 'SPECIALIST',
      description: 'Handles all order-related queries: tracking, modifications, delivery issues, and shipping updates.',
      agentMd: `# Agent: Order Management Agent\n\n## Identity\nYou are the Order Management specialist. You have deep expertise in order fulfillment, logistics, and shipping.\n\n## Goal\nResolve order issues accurately and efficiently. Provide concrete tracking updates and solutions for delivery problems.\n\n## Personality\nEfficient, precise, and proactive. You set clear expectations on timelines.\n\n## Context\nYou receive escalations from the Customer Support Agent for order-related issues.`,
      skillMd: `# Skill: Order Management\n\n## Capabilities\n- Track orders by ID or email\n- Process order modifications (address change, item substitution)\n- Handle lost or delayed shipments\n- Coordinate with logistics providers\n\n## Instructions\n1. Always confirm order ID before taking action\n2. Provide estimated resolution timeframes\n3. Document all changes with reason codes\n\n## Output Format\nStructured responses with order details, status, and next steps clearly separated.`
    },
    {
      id: 'refund-specialist',
      name: 'Refund Specialist',
      emoji: '💰',
      type: 'technical',
      role: 'SPECIALIST',
      description: 'Processes refund requests, explains return policies, handles exchanges and dispute resolution.',
      agentMd: `# Agent: Refund Specialist\n\n## Identity\nYou are the Refund and Returns specialist. You handle all financial resolutions for customer issues.\n\n## Goal\nProcess refunds and returns fairly and quickly, following company policy while maximising customer satisfaction.\n\n## Personality\nUnderstanding and solution-focused. You find ways to say yes within policy constraints.\n\n## Context\nYou handle escalations from Customer Support for refund, return, and exchange requests.`,
      skillMd: `# Skill: Refund Processing\n\n## Capabilities\n- Initiate full or partial refunds\n- Process return merchandise authorisations (RMA)\n- Handle exchange requests\n- Manage dispute resolution\n\n## Instructions\n1. Verify eligibility against return policy (30 days, unused condition)\n2. Confirm customer's preferred resolution method\n3. Issue refund confirmation with reference number\n\n## Output Format\nClear confirmation of action taken, reference number, and expected processing time.`
    }
  ],
  files: {
    'agent-customer-support.md': `# Agent: Customer Support Agent\n\n## Identity\nYou are the Customer Support Agent for an e-commerce business.\n\n## Goal\nResolve customer inquiries quickly and professionally.\n\n## Personality\nWarm, patient, and empathetic.\n`,
    'agent-order-manager.md': `# Agent: Order Management Agent\n\n## Identity\nYou are the Order Management specialist.\n\n## Goal\nResolve order issues accurately and efficiently.\n\n## Personality\nEfficient, precise, and proactive.\n`,
    'agent-refund-specialist.md': `# Agent: Refund Specialist\n\n## Identity\nYou are the Refund and Returns specialist.\n\n## Goal\nProcess refunds and returns fairly and quickly.\n\n## Personality\nUnderstanding and solution-focused.\n`,
    'team-config.md': `# Team Configuration: E-commerce Support\n\n## Architecture\nThree-agent support team with clear escalation paths.\n\n## Agent Connections\n- Customer Support Agent → receives all first contact\n- Order Manager ← receives order/shipping escalations\n- Refund Specialist ← receives refund/return escalations\n\n## Orchestration Mode\nAgent-assisted: Customer Support routes to specialists as needed.\n\n## Workflow\n1. Customer contacts → Customer Support Agent\n2. Order issues → Order Management Agent\n3. Refund/return → Refund Specialist\n`,
    'README.md': `# E-commerce Customer Support Team\n\nGenerated with AgentSpark — demo team.\n\n## Agents\n- 🎧 Customer Support Agent\n- 📦 Order Management Agent\n- 💰 Refund Specialist\n`
  }
};

function loadDemo() {
  localStorage.setItem('agentspark-onboarding-done', '1');
  state.currentTopic = DEMO_TEAM.topic;
  state.currentLevel = DEMO_TEAM.level;
  state.generatedAgents = JSON.parse(JSON.stringify(DEMO_TEAM.agents));
  state.generatedFiles = JSON.parse(JSON.stringify(DEMO_TEAM.files));
  state.versionHistory = [] as any[];
  state.traceSpans = [];

  // Show demo banner on results screen
  const banner = (document.getElementById('shared-banner') as HTMLElement);
  const bannerTitle = (document.getElementById('shared-banner-title') as HTMLElement);
  const bannerSub = (document.getElementById('shared-banner-sub') as HTMLElement);
  if (banner) {
    bannerTitle.textContent = '🎮 Demo Mode — E-commerce Support Team';
    bannerSub.textContent = 'This is a sample team. Add your API key and generate your own!';
    banner.style.display = 'flex';
  }

  showResults(false);
  showNotif('🎮 Demo loaded — explore the interface, then add your API key to generate your own team!');
}

// ─── GALLERY ─────────────────────────────────────────────

// ─── LOAD FROM GIST URL ───────────────────────────────────

(document.getElementById('template-detail-overlay') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) (window as any).closeTemplateDetail();
});
(document.getElementById('unlock-modal') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) (window as any)._unlockReject();
});

// ─── THEME ────────────────────────────────────────────────
function _toggleThemeCore() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('agentspark-theme', next);
  (document.getElementById('theme-toggle-btn') as HTMLElement).textContent = next === 'light' ? '☀️' : '🌙';
  // Sync PWA theme-color meta
  const metaTC = (document.getElementById('meta-theme-color') as HTMLMetaElement);
  if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
}

// Global wrapper called by onclick="toggleTheme()"
// Short click = toggle + save manual preference
// Long press (600ms) = reset to OS auto-detect
let _themeHoldTimer: any = null;
function toggleTheme() {
  if (_themeHoldTimer === null) return; // longpress already fired
  clearTimeout(_themeHoldTimer);
  _themeHoldTimer = null;
  _toggleThemeCore();
}
function _themeHoldStart() {
  _themeHoldTimer = setTimeout(() => {
    _themeHoldTimer = null;
    localStorage.removeItem('agentspark-theme');
    const next = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    const btn = (document.getElementById('theme-toggle-btn') as HTMLElement);
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
    const metaTC = (document.getElementById('meta-theme-color') as HTMLMetaElement);
    if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
    showNotif(state.lang === 'en' ? '🎨 Theme: following OS preference' : '🎨 Motyw: podąża za ustawieniami systemu');
  }, 600);
}

// Init theme from localStorage or auto-detect from OS
(function () {
  const saved = localStorage.getItem('agentspark-theme');
  // If user never manually picked → follow OS preference
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  // Set correct icon after DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    const btn = (document.getElementById('theme-toggle-btn') as HTMLElement);
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  });
  // Listen for OS-level theme changes — only apply if user hasn't manually overridden
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('agentspark-theme')) return; // user has manual pref — respect it
    const next = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    const btn = (document.getElementById('theme-toggle-btn') as HTMLElement);
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
    const metaTC = (document.getElementById('meta-theme-color') as HTMLMetaElement);
    if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
  });
})();

// ─── INIT ─────────────────────────────────────────────────
(async () => {
  const loaded = await (window as any).loadFromHash();
  if (!loaded) renderTopicScreen();
  (window as any).refreshStaticI18n();
  maybeShowOnboarding();
  (window as any).loadFeaturedTemplates();
})();

// ─── NEW FEATURES 2026 ──────────────────────────────────
function startQuickTeam(type: string) {
  const configs = {
    content: {
      topic: 'Content Marketing Team',
      roles: ['SEO Specialist', 'Content Writer', 'Social Media Manager']
    },
    support: {
      topic: 'Customer Support Team',
      roles: ['Customer Support Agent', 'Escalation Manager', 'Knowledge Base Curator']
    },
    research: {
      topic: 'Research & Copy Team',
      roles: ['Research Analyst', 'Copywriter', 'Language Editor']
    }
  };

  const config = configs[type as keyof typeof configs];
  if (!config) return;

  state.currentTopic = config.topic;
  showScreen('chat');
  renderProgressSteps(3); // Show full progress

  // Fake chat history for context
  state.chatHistory = [
    { role: 'user', text: `I need a ${config.topic}.` },
    { role: 'ai', text: `I'll create a team with: ${config.roles.join(', ')}.` }
  ];

  // Trigger generation
  generateAgents();
}

async function regenerateTeam() {
  const agreed = await uiConfirm(
    'Regenerate team with same settings?',
    'Wygenerować ponownie zespół z tymi samymi ustawieniami?',
    'Regenerate Team',
    'Regeneracja zespołu'
  );
  if (!agreed) return;
  showScreen('chat');
  generateAgents();
}

// loadPlaygroundExample moved to js/features/playground.js

(document.getElementById('modal') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) (window as any).closeModal();
});
(document.getElementById('md-browser-modal') as HTMLElement).addEventListener('click', function (e) {
  if (e.target === this) (window as any).closeMdBrowser();
});

// ── iOS: tap backdrop to dismiss ALL modal-overlays ────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (this: HTMLElement, e: any) {
    if (e.target === this) {
      // Find and trigger the close button
      const closeBtn = this.querySelector('.modal-close') as HTMLElement;
      if (closeBtn) closeBtn.click();
      else this.classList.remove('open');
    }
  });
});


// ═══════════════════════════════════════════════════════════
//  v6 — Drawer · Context bar · Back-to-top · Home panels ·
//       Swipe gestures · Accordion · showInstructions v2
// ═══════════════════════════════════════════════════════════

// ── DRAWER ─────────────────────────────────────────────────
let _drawerOpen = false;
function toggleDrawer() { _drawerOpen ? closeDrawer() : openDrawer(); }

function openDrawer() {
  _drawerOpen = true;
  (document.getElementById('nav-drawer') as HTMLElement).classList.add('open');
  (document.getElementById('nav-drawer-overlay') as HTMLElement).classList.add('open');
  const btn = (document.getElementById('burger-btn') as HTMLElement);
  if (btn) { btn.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  document.body.style.overflow = 'hidden';
  updateDrawerActive();
}

function closeDrawer() {
  _drawerOpen = false;
  (document.getElementById('nav-drawer') as HTMLElement).classList.remove('open');
  const overlay = (document.getElementById('nav-drawer-overlay') as HTMLElement);
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.classList.remove('open'); overlay.style.opacity = ''; }, 280);
  const btn = (document.getElementById('burger-btn') as HTMLElement);
  if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  document.body.style.overflow = '';
}

function updateDrawerActive() {
  const screens = ['home', 'projects', 'chat', 'results'];
  let active = 'home';
  screens.forEach(s => {
    const screen = document.getElementById('screen-' + (s === 'home' ? 'topic' : s));
    if (screen && screen.classList.contains('active')) active = s;
  });
  document.querySelectorAll('.drawer-nav-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById('dnav-' + active);
  if (activeEl) activeEl.classList.add('active');
  // Badge
  const tabBadge = (document.getElementById('tab-badge') as HTMLElement);
  const dnavBadge = (document.getElementById('dnav-badge') as HTMLElement);
  if (dnavBadge && tabBadge) {
    dnavBadge.textContent = tabBadge.textContent;
    dnavBadge.style.display = tabBadge.style.display;
  }
  // Theme icon
  const themeIcon = (document.getElementById('dnav-theme-icon') as HTMLElement);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '☀️';
}

// Close drawer on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape' && _drawerOpen) closeDrawer(); });

// ── BACK TO TOP ────────────────────────────────────────────
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let _bttVisible = false;
function _syncBackToTop() {
  const visible = window.scrollY > 320;
  if (visible !== _bttVisible) {
    _bttVisible = visible;
    const btn = (document.getElementById('back-to-top') as HTMLElement);
    if (btn) btn.classList.toggle('visible', visible);
  }
}
window.addEventListener('scroll', _syncBackToTop, { passive: true });

// ── CONTEXT BAR ────────────────────────────────────────────
const _ctxBarConfigs = {
  topic: {
    btns: [
      { label: '⚡ Generate', cls: 'primary', fn: 'startWithTopic()' }
    ]
  },
  chat: {
    btns: [
      { label: '↩ Cancel', cls: '', fn: 'restart()' },
    ]
  },
  results: {
    btns: [
      { label: '↩ Start Over', cls: '', fn: 'restart()' }
    ]
  },
  projects: {
    btns: [
      { label: '+ New Project', cls: 'primary', fn: "showScreen('topic')" }
    ]
  },
};

function _updateContextBar(screenName: string) {
  const bar = (document.getElementById('sticky-context-bar') as HTMLElement);
  if (!bar) return;
  const cfg = _ctxBarConfigs[screenName as keyof typeof _ctxBarConfigs];
  if (!cfg) { bar.classList.remove('visible'); return; }
  bar.innerHTML = cfg.btns.map(b =>
    `<button class="ctx-btn ${b.cls}" onclick="${b.fn}">${b.label}</button>`
  ).join('');
  // small delay so spring animation triggers after paint
  requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('visible')));
}

// ── HOME SEGMENTED NAVIGATION ──────────────────────────────
let _activeHomePanel = 'topics';

function switchHomePanel(panel: string) {
  _activeHomePanel = panel;
  ['topics', 'projects', 'custom'].forEach(p => {
    document.getElementById('hpanel-' + p)?.classList.toggle('active', p === panel);
    const btn = document.getElementById('hseg-' + p);
    if (btn) {
      btn.classList.toggle('active', p === panel);
      btn.setAttribute('aria-selected', p === panel ? 'true' : 'false');
    }
  });
  if (panel === 'projects') renderHomeProjectsList();
}

async function renderHomeProjectsList() {
  const list = (document.getElementById('home-projects-list') as HTMLElement);
  const empty = (document.getElementById('home-projects-empty') as HTMLElement);
  const search = ((document.getElementById('home-projects-search') as HTMLInputElement)?.value || '').toLowerCase();
  if (!list) return;
  let projects: any[] = [];
  try { projects = (await dbGetAll()) as any[]; } catch (e) { }
  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search) || (p.topic || '').toLowerCase().includes(search))
    : projects;
  if (!filtered.length) {
    list.innerHTML = '';
    list.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  list.style.display = 'grid';
  if (empty) empty.style.display = 'none';
  list.innerHTML = filtered.map(p => `
    <div class="project-card" tabindex="0" role="button" aria-label="${_escHtml(p.name)}"
      onclick="loadProject('${p.id}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();loadProject('${p.id}')}">
      <div class="project-card-name">${_escHtml(p.name)}</div>
      <div class="project-card-topic">📌 ${_escHtml(p.topic || tr('No topic', 'Brak tematu'))}</div>
      <div class="project-card-meta">
        ${(p.agents || []).length ? `<span class="project-card-tag">👥 ${(p.agents || []).length}</span>` : ''}
        ${p.level ? `<span class="project-card-tag">${p.level}</span>` : ''}
      </div>
      <div class="project-card-date">${tr('Updated', 'Zaktualizowano')} ${_formatDate(p.updatedAt)}</div>
    </div>
  `).join('');
}

// ── SWIPE GESTURES ON PROJECT CARDS ───────────────────────
function _initSwipeGestures() {
  const list = (document.getElementById('projects-list') as HTMLElement);
  if (!list || window.innerWidth > 768) return;

  let startX = 0, startY = 0, currentWrap = null, currentCard: any = null;
  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 216; // 3 × 72px

  list.addEventListener('touchstart', (e: any) => {
    const wrap = e.target.closest('.project-card-wrap');
    if (!wrap) return;
    currentWrap = wrap;
    currentCard = wrap.querySelector('.project-card');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    if (currentCard) currentCard.style.transition = 'none';
  }, { passive: true });

  list.addEventListener('touchmove', (e: any) => {
    if (!currentCard) return;
    const dx = e.touches[0].clientX - startX;
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dy > 12) { currentCard = null; return; } // vertical scroll wins
    if (dx >= 0) { // only left swipe
      currentCard.style.transform = 'translateX(0)';
      return;
    }
    const travel = Math.min(Math.abs(dx), MAX_SWIPE);
    currentCard.style.transform = `translateX(-${travel}px)`;
  }, { passive: true });

  list.addEventListener('touchend', (e: any) => {
    if (!currentCard) return;
    const dx = e.changedTouches[0].clientX - startX;
    currentCard.style.transition = '';
    if (dx < -SWIPE_THRESHOLD) {
      currentCard.style.transform = `translateX(-${MAX_SWIPE}px)`;
    } else {
      currentCard.style.transform = 'translateX(0)';
    }
    currentCard = null;
    currentWrap = null;
  }, { passive: true });

  // Tap elsewhere closes open swipes
  document.addEventListener('touchstart', (e: any) => {
    if (!e.target.closest('.project-card-wrap')) {
      list.querySelectorAll('.project-card').forEach((c: any) => {
        c.style.transition = '';
        c.style.transform = 'translateX(0)';
      });
    }
  }, { passive: true });
}

// ── ACCORDION INSTRUCTIONS ─────────────────────────────────
function _renderAccordionInstructions(steps: any[]) {
  const container = (document.getElementById('instr-steps') as HTMLElement);
  if (!container) return;
  container.innerHTML = '';
  steps.forEach((step, i) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <div class="accordion-header" onclick="_toggleAccordion(this.parentElement)" role="button" tabindex="0"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();_toggleAccordion(this.parentElement)}">
        <div class="accordion-num">0${i + 1}</div>
        <div class="accordion-title">${step.title}</div>
        <span class="accordion-chevron">▾</span>
      </div>
      <div class="accordion-body">
        <div class="accordion-content">${step.body}</div>
      </div>
    `;
    container.appendChild(item);
  });
  // Open first by default
  if (container.firstElementChild) {
    _toggleAccordion(container.firstElementChild);
  }
}

function _toggleAccordion(item: Element | null) {
  const isOpen = item?.classList.contains('open');
  // Close all siblings
  if (item && item.parentElement) item.parentElement.querySelectorAll('.accordion-item.open').forEach(el => {
    el.classList.remove('open');
  });
  if (!isOpen && item) item.classList.add('open');
}

// ── PATCH showInstructions to use accordion ────────────────
const _origShowInstructions = window.showInstructions;
window.showInstructions = function () {
  const section = (document.getElementById('instructions-section') as HTMLElement);
  const isHidden = getComputedStyle(section).display === 'none';
  section.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    (document.getElementById('instr-title') as HTMLElement).textContent = t('instrTitle');
    _renderAccordionInstructions(t('instrSteps'));
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ── PATCH showScreen to update context bar + drawer ────────
const _origShowScreen = window.showScreen;
window.showScreen = function (name: string) {
  _origShowScreen(name);
  _updateContextBar(name);
  updateDrawerActive();
  _syncBackToTop();
  // Re-init swipe gestures after projects screen loads
  if (name === 'projects') setTimeout(_initSwipeGestures, 200);
};

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _syncFab();
  _updateContextBar('topic');
  updateDrawerActive();
  trackEvent('app_loaded', { success: true });
  // Keyboard shortcut: Cmd/Ctrl+K opens drawer on desktop
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleDrawer();
    }
  });
});

// ── iOS: swipe-down to dismiss sheets ─────────────────────
(function () {
  let startY = 0, startScrollTop = 0, sheetEl: any = null, overlayEl: any = null;
  let isDragging = false;

  document.addEventListener('touchstart', function (e: any) {
    const target = e.target as HTMLElement;
    const overlay = target?.closest('.modal-overlay.open, .ios-sheet-overlay.open');
    if (!overlay) return;
    const sheet = overlay.querySelector('.modal, .share-modal, .fw-modal, .ios-sheet');
    if (!sheet) return;
    // Only start if touch begins on the handle area (top 40px of sheet) or not in scrollable content
    const touch = e.touches[0];
    const sheetRect = sheet.getBoundingClientRect();
    const touchRelY = touch.clientY - sheetRect.top;
    const scrollable = target?.closest('.modal-body, .ios-sheet-body, .fw-body');
    if (scrollable && scrollable.scrollTop > 0) return; // don't drag if scrolled
    if (touchRelY > 80 && !target?.closest('.modal::before')) {
      // Only drag from top 80px
      if (touchRelY > 80 && scrollable) return;
    }
    startY = touch.clientY;
    sheetEl = sheet;
    overlayEl = overlay;
    isDragging = true;
  }, { passive: true });

  document.addEventListener('touchmove', function (e: any) {
    if (!isDragging || !sheetEl) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0) {
      sheetEl.style.transform = `translateY(${Math.pow(delta, 0.8)}px)`;
      sheetEl.style.transition = 'none';
      overlayEl.style.background = `rgba(0,0,0,${Math.max(0, 0.55 - delta / 400)})`;
    }
  }, { passive: true });

  document.addEventListener('touchend', function (e: any) {
    if (!isDragging || !sheetEl) return;
    const delta = e.changedTouches[0].clientY - startY;
    sheetEl.style.transition = '';
    overlayEl.style.background = '';
    if (delta > 80) {
      // Snap closed
      sheetEl.style.transform = 'translateY(100%)';
      setTimeout(() => {
        const closeBtn = overlayEl.querySelector('.modal-close');
        if (closeBtn) closeBtn.click();
        else overlayEl.classList.remove('open');
        if (sheetEl) sheetEl.style.transform = '';
      }, 280);
    } else {
      sheetEl.style.transform = '';
    }
    isDragging = false; sheetEl = null; overlayEl = null;
  }, { passive: true });
})();

// ── iOS: spring on tab icons via JS for better feel ───────
document.querySelectorAll('.ios-tab-btn').forEach(btn => {
  btn.addEventListener('click', function (this: HTMLElement) {
    this.querySelectorAll('.tab-icon').forEach((icon: any) => {
      icon.style.transition = 'none';
      icon.style.transform = 'scale(0.78)';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          icon.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
          icon.style.transform = '';
        });
      });
    });
  });
});

// ── SW / Warning corner toast helper ──────────────────────
function showSwToast(msg: string, isError = true) {
  const old = (document.querySelector('.sw-toast') as HTMLElement);
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'sw-toast';
  el.innerHTML = `
    <span class="sw-toast-icon">${isError ? '⚠' : 'ℹ'}</span>
    <span>${msg}</span>
    <button class="sw-toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity 0.3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 6000);
}


// ── Bottom nav hide-on-scroll-down (mobile only) ──────────
(function () {
  let _lastScroll = 0;
  let _tabHidden = false;
  const THRESHOLD = 6;        // px delta to trigger
  const SHOW_ZONE = 80;       // px from bottom always shows

  function _onScroll() {
    if (window.innerWidth > 768) return;  // desktop: never hide
    const now = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const nearBottom = maxScroll - now < SHOW_ZONE;
    const delta = now - _lastScroll;
    _lastScroll = now;

    const tabBar = (document.getElementById('ios-tab-bar') as HTMLElement);
    const ctxBar = (document.getElementById('sticky-context-bar') as HTMLElement);
    if (!tabBar) return;

    if (nearBottom || now < 60) {
      // Always show near top or bottom
      if (_tabHidden) {
        _tabHidden = false;
        tabBar.classList.remove('hidden-by-scroll');
        ctxBar?.classList.remove('tab-hidden');
      }
    } else if (delta > THRESHOLD && !_tabHidden) {
      // Scrolling down → hide
      _tabHidden = true;
      tabBar.classList.add('hidden-by-scroll');
      ctxBar?.classList.add('tab-hidden');
    } else if (delta < -THRESHOLD && _tabHidden) {
      // Scrolling up → show
      _tabHidden = false;
      tabBar.classList.remove('hidden-by-scroll');
      ctxBar?.classList.remove('tab-hidden');
    }
  }

  window.addEventListener('scroll', _onScroll, { passive: true });

  // Reset on screen change
  const _origShowScreenP7 = window.showScreen;
  window.showScreen = function (name: string) {
    _origShowScreenP7(name);
    _tabHidden = false;
    (document.getElementById('ios-tab-bar') as HTMLElement)?.classList.remove('hidden-by-scroll');
    (document.getElementById('sticky-context-bar') as HTMLElement)?.classList.remove('tab-hidden');
    _lastScroll = 0;
  };
})();


// ─── WINDOW EXPORTS ─────────────────────────────────────────
(window as any).toggleApiSetup = toggleApiSetup;
(window as any).onModelChange = onModelChange;
(window as any).syncApiKey = syncApiKey;
(window as any).checkApiKey = checkApiKey;
(window as any).restart = restart;
(window as any).showNotif = showNotif;
(window as any).toggleTracePanel = toggleTracePanel;
(window as any).renderTraceLive = renderTraceLive;
(window as any).renderVersionPanel = renderVersionPanel;
(window as any).toggleVersionPanel = toggleVersionPanel;
(window as any).restoreVersion = restoreVersion;
(window as any).downloadVersionZip = downloadVersionZip;
(window as any).showDiffModal = showDiffModal;
(window as any).closeDiffModal = closeDiffModal;
(window as any).openSettingsSheet = openSettingsSheet;
(window as any).toggleChatSidebar = toggleChatSidebar;
(window as any).regenerateTeam = regenerateTeam;
(window as any).toggleTheme = toggleTheme;
(window as any).toggleDrawer = toggleDrawer;
(window as any).closeDrawer = closeDrawer;
(window as any).scrollToTop = scrollToTop;
(window as any).openImportModal = openImportModal;
(window as any).closeRefine = closeRefine;
(window as any).submitRefine = submitRefine;
(window as any).applyRefinement = applyRefinement;
(window as any).backToRefineStep1 = backToRefineStep1;
(window as any).revertLastRefine = revertLastRefine;
(window as any).addMessage = addMessage;
(window as any).sanitizeRichText = sanitizeRichText;
(window as any).renderProgressSteps = renderProgressSteps;
(window as any).renderResults = renderResults;
(window as any).openRefine = openRefine;
(window as any).startWithTopic = startWithTopic;
(window as any).renderLevelGrid = renderLevelGrid;
(window as any).renderTopicScreen = renderTopicScreen;
(window as any).selectOption = selectOption;
(window as any).submitAnswer = submitAnswer;
(window as any).generateAgents = generateAgents;
(window as any).generateReadme = generateReadme;
(window as any).openPlayground = (window as any).openPlayground;
(window as any).openShareModal = (window as any).openShareModal;

// --- Remaining Exports ---
(window as any).obNext = obNext;
(window as any).obBack = obBack;
(window as any).obCheckKey = obCheckKey;
(window as any).obFinish = obFinish;
(window as any).obSkip = obSkip;
(window as any).openPromptExport = openPromptExport;
(window as any).closePromptExport = closePromptExport;
(window as any).switchPromptTab = switchPromptTab;
(window as any).copyPromptToClipboard = copyPromptToClipboard;
(window as any).downloadPromptTxt = downloadPromptTxt;
(window as any).handleImportDrop = handleImportDrop;
(window as any).handleImportFileSelect = handleImportFileSelect;
(window as any).confirmImport = confirmImport;
(window as any).resetImportModal = resetImportModal;
(window as any).loadDemo = loadDemo;
(window as any).switchHomePanel = switchHomePanel;
(window as any).openFrameworkExport = openFrameworkExport;
(window as any)._themeHoldStart = _themeHoldStart;
(window as any).updateDrawerActive = updateDrawerActive;
(window as any).closeFwModal = closeFwModal;
(window as any).closeImportModal = closeImportModal;
(window as any).renderHomeProjectsList = renderHomeProjectsList;

