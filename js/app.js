// ─── MODEL SELECTION ──────────────────────────────────────
const MODEL_KEY_HINTS = {
  gemini:    { label: 'Gemini API Key',    hint: 'Key: Google AI Studio → makersuite.google.com',   placeholder: 'AIza...' },
  openai:    { label: 'OpenAI API Key',    hint: 'Key: platform.openai.com/api-keys',                placeholder: 'sk-...' },
  anthropic: { label: 'Anthropic API Key', hint: 'Key: console.anthropic.com/settings/keys',         placeholder: 'sk-ant-...' },
  mistral:   { label: 'Mistral API Key',   hint: 'Key: console.mistral.ai/api-keys',                 placeholder: 'your-mistral-key' },
  groq:      { label: 'Groq API Key',      hint: 'Key: console.groq.com/keys',                       placeholder: 'gsk_...' },
};

function onModelChange() {
  const sel = document.getElementById('modelSelect');
  if(!sel) return;
  const parts = sel.value.split('|');
  const label = sel.options[sel.selectedIndex]?.text || parts[1];
  selectedModel = { provider: parts[0], model: parts[1], endpoint: parts[2], tag: parts[3], label };

  const info = MODEL_KEY_HINTS[selectedModel.tag] || MODEL_KEY_HINTS.gemini;
  const labelEl = document.getElementById('apiKeyLabel');
  const hintEl  = document.getElementById('modelHint');
  const inputEl = document.getElementById('apiKeySetupInput');
  const headerInputEl = document.getElementById('apiKeyInput');

  if(labelEl)  labelEl.textContent = info.label;
  if(hintEl)   hintEl.innerHTML = info.hint;
  if(inputEl)  inputEl.placeholder = info.placeholder;
  if(headerInputEl) headerInputEl.placeholder = info.label;

  // Reset key when switching provider
  apiKey = '';
  if(inputEl) inputEl.value = '';
  const status = document.getElementById('apiKeySetupStatus');
  if(status) { status.textContent = ''; status.className = 'api-key-status'; }
}

// ─── API KEY ──────────────────────────────────────────────
function syncApiKey(val) {
  apiKey = val.trim();
  const headerInput = document.getElementById('apiKeyInput');
  if(headerInput) headerInput.value = apiKey;
  if (apiKey.length > 10) {
    localStorage.setItem('agentspark-api-key', apiKey);
    const demoCta = document.getElementById('demo-cta');
    if (demoCta) demoCta.style.display = 'none';
  }
  checkApiKey();
}
function checkApiKey() {
  const val = apiKey || document.getElementById('apiKeySetupInput')?.value?.trim() || '';
  apiKey = val;
  const status = document.getElementById('apiKeySetupStatus');
  if(val.length > 10) {
    if(status) { status.textContent = '✓ Key set'; status.className = 'api-key-status ok'; }
    _updateApiKeyDot('ready');
  } else {
    if(status) { status.textContent = ''; status.className = 'api-key-status'; }
    _updateApiKeyDot('');
  }
}

// ─── TOPIC SCREEN ─────────────────────────────────────────
function renderLevelGrid() {
  const grid = document.getElementById('level-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const label = document.getElementById('level-section-label');
  if(label) label.textContent = lang === 'en' ? 'COMPLEXITY LEVEL' : 'POZIOM ZŁOŻONOŚCI';

  t('levels').forEach(level => {
    const div = document.createElement('div');
    div.className = 'level-card' + (currentLevel === level.id ? ' selected' : '');
    div.style.borderColor = currentLevel === level.id ? level.color : '';
    div.style.boxShadow = currentLevel === level.id ? `0 0 20px ${level.color}33` : '';
    div.innerHTML = `
      <span class="level-emoji">${level.emoji}</span>
      <div class="level-name" style="color:${level.color}">${level.name}</div>
      <div class="level-tagline">${level.tagline}</div>
      <div class="level-agents" style="color:${level.color};border-color:${level.color}33;background:${level.color}11">
        ${level.agentCount} ${lang==='en'?'agents':'agentów'}
      </div>
    `;
    div.title = level.desc;
    div.tabIndex = 0;
    div.setAttribute('role', 'radio');
    div.setAttribute('aria-checked', currentLevel === level.id ? 'true' : 'false');
    div.onclick = () => {
      currentLevel = level.id;
      MAX_QUESTIONS = level.questions;
      renderLevelGrid();
    };
    div.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
    grid.appendChild(div);
  });
}

let activeTopicCat = 'all';

function renderTopicScreen() {
  renderLevelGrid();
  document.getElementById('badge-text').textContent = t('badge');
  document.getElementById('hero-title').innerHTML = t('heroTitle');
  document.getElementById('hero-sub').textContent = t('heroSub');
  document.getElementById('or-text').textContent = t('orText');
  document.getElementById('start-btn').textContent = t('startBtn');

  // Render category filters as iOS segmented control
  const filtersEl = document.getElementById('template-filters');
  filtersEl.innerHTML = '';
  const seg = document.createElement('div');
  seg.className = 'ios-segmented';
  // Limit to first 5 to fit in segmented control
  const cats = t('topicCats').slice(0, 5);
  cats.forEach(cat => {
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
  const grid = document.getElementById('topic-grid');
  grid.innerHTML = '';
  t('topics').forEach(topic => {
    const div = document.createElement('div');
    div.className = 'topic-card' + (activeTopicCat !== 'all' && topic.cat !== activeTopicCat ? ' hidden' : '');
    div.innerHTML = `
      <div class="time-badge">${topic.time}</div>
      <div class="icon">${topic.icon}</div>
      <div class="label">${topic.label}</div>
      <div class="sub">${topic.sub}</div>
      <div class="agents-preview">⚡ ${topic.agents}</div>
    `;
    div.onclick = () => { document.getElementById('customTopic').value = topic.label; startWithTopic(); };
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); div.click(); } };
    grid.appendChild(div);
  });
}

function startWithTopic() {
  const val = document.getElementById('apiKeySetupInput').value.trim();
  apiKey = val;
  if(!apiKey || apiKey.length < 10) {
    showNotif(lang==='en' ? `⚠ Please enter a valid ${MODEL_KEY_HINTS[selectedModel.tag]?.label || 'API key'}` : `⚠ Podaj prawidłowy klucz ${MODEL_KEY_HINTS[selectedModel.tag]?.label || 'API'}`, true);
    return;
  }
  const topic = document.getElementById('customTopic').value.trim();
  if(!topic) {
    showNotif(lang==='en' ? '⚠ Please select or enter a topic' : '⚠ Wybierz lub wpisz temat', true);
    return;
  }
  currentTopic = topic;
  startChat();
}

// ─── CHAT SCREEN ──────────────────────────────────────────
function startChat() {
  showScreen('chat');
  _updateContextBar('chat');
  // Reset trace for new session
  traceSpans = [];
  tracePanelOpen = false;
  traceSessionStart = null;
  document.getElementById('apiKeyHeader').style.display = 'flex';
  document.getElementById('apiKeyInput').value = apiKey;
  // Show model badge in header
  const badgeEl = document.getElementById('headerModelBadge');
  if(badgeEl) badgeEl.textContent = selectedModel.model;
  document.getElementById('sidebar-topic').textContent = currentTopic;
  const lvl = t('levels').find(l => l.id === currentLevel);
  if(lvl) {
    document.getElementById('sidebar-level').textContent = lvl.emoji;
    document.getElementById('sidebar-level-name').textContent = lvl.name;
    document.getElementById('sidebar-level-name').style.color = lvl.color;
    document.getElementById('sidebar-level-desc').textContent = lvl.tagline;
  }
  document.getElementById('chat-title').textContent = t('chatTitle');
  document.getElementById('chat-subtitle').textContent = t('chatSub');

  renderProgressSteps(0);
  chatHistory = [];
  questionCount = 0;
  conversationState = 'interview';

  const systemPrompt = getSystemPrompt();
  addTypingIndicator();
  callGemini(systemPrompt, `The user wants to build: "${currentTopic}". Start the interview with your FIRST question. Respond ONLY with the JSON object as specified — no greeting text, just the JSON.`, '🎤 Interview · Start')
    .then(reply => {
      removeTypingIndicator();
      let parsed = null;
      try {
        const m = reply.match(/\{[\s\S]*\}/);
        if(m) parsed = JSON.parse(m[0]);
      } catch(e) {}
      if(parsed && parsed.question && parsed.options) {
        addMessage('ai', parsed.question);
        renderOptions(parsed);
      } else {
        addMessage('ai', reply);
        renderOptionsLegacy(reply);
      }
    })
    .catch(err => {
      removeTypingIndicator();
      addMessage('ai', `Error: ${err.message}. Please check your API key.`);
    });
}

function getSystemPrompt() {
  const levelData = t('levels').find(l => l.id === currentLevel) || t('levels')[0];
  return `You are AgentSpark, an expert AI system designer. Your job is to interview the user about their app idea using CLOSED questions with multiple choice answers.

Language: ${lang === 'en' ? 'English' : 'Polish'}
App topic: ${currentTopic}
Complexity level: ${levelData.name} — ${levelData.tagline}
Agent count to generate: ${levelData.agentCount}
Focus areas for this level: ${levelData.focus}

INTERVIEW STRUCTURE — ${MAX_QUESTIONS} questions total, split into 3 adaptive sections:

SECTION 1 — BUSINESS (first ${Math.ceil(MAX_QUESTIONS * 0.3)} questions):
Focus: target users, monetization model, core value proposition, market.
Example topics: who uses the app, how it makes money, what problem it solves, main competitors.

SECTION 2 — FRONTEND (next ${Math.ceil(MAX_QUESTIONS * 0.35)} questions):
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

After exactly ${MAX_QUESTIONS} questions respond with ONLY:
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

function selectOption(label, text) {
  // Mark all choice cards in the last choices-msg
  const msgs = document.querySelectorAll('.choices-msg');
  const last = msgs[msgs.length - 1];
  if(last) {
    last.querySelectorAll('.choice-wrap').forEach(w => {
      const card = w.querySelector('.choice-card');
      if(card) {
        if(card.dataset.label === label) {
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

async function submitAnswer(answer) {
  clearOptions();
  addMessage('user', answer);
  chatHistory.push({ role:'user', text: answer });
  questionCount++;

  if(conversationState === 'interview') {
    addTypingIndicator();
    try {
      const history = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
      const prompt = `${history}\n\nThis was answer ${questionCount} of ${MAX_QUESTIONS}. Ask next question or finalize.`;
      const reply = await callGemini(getSystemPrompt(), prompt, `🎤 Interview · Q${questionCount} of ${MAX_QUESTIONS}`);
      removeTypingIndicator();

      // Parse JSON response
      let parsed = null;
      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if(jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch(e) { /* fallback below */ }

      if(parsed && parsed.complete) {
        // Interview complete
        if(parsed.summary) addMessage('ai', parsed.summary);
        chatHistory.push({ role:'ai', text: parsed.summary || 'Interview complete.' });
        conversationState = 'generating';
        renderProgressSteps(1);
        clearOptions();
        setTimeout(generateAgents, 1200);
      } else if(parsed && parsed.question && parsed.options) {
        // Valid question JSON — show question as AI message, options as cards
        addMessage('ai', parsed.question);
        chatHistory.push({ role:'ai', text: parsed.question });
        renderOptions(parsed);
      } else {
        // Fallback: show raw reply and try legacy parse
        addMessage('ai', reply);
        chatHistory.push({ role:'ai', text: reply });
        if(reply.includes('[INTERVIEW_COMPLETE]') || questionCount >= MAX_QUESTIONS) {
          conversationState = 'generating';
          renderProgressSteps(1);
          clearOptions();
          setTimeout(generateAgents, 1200);
        } else {
          renderOptionsLegacy(reply);
        }
      }
    } catch(err) {
      removeTypingIndicator();
      addMessage('ai', `Error: ${err.message}`);
    }
  }
}

function _buildChoiceCard(label, optText, impact) {
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

  if(impact) {
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

function renderOptions(parsed) {
  // parsed is a JSON object: { question, options: [{label, text, impact}] }
  if(!parsed || !parsed.options) return;
  const panel = document.getElementById('question-panel');
  const panelText = document.getElementById('question-panel-text');
  const panelChoices = document.getElementById('question-panel-choices');
  if(!panel || !panelText || !panelChoices) return;

  // Show section badge if present
  let sectionBadge = panel.querySelector('.question-section-badge');
  if(!sectionBadge) {
    sectionBadge = document.createElement('div');
    sectionBadge.className = 'question-section-badge';
    panel.insertBefore(sectionBadge, panel.firstChild);
  }
  const sectionIcons = { Business: '💼', Frontend: '🎨', Backend: '⚙️' };
  if(parsed.section) {
    sectionBadge.textContent = (sectionIcons[parsed.section] || '') + ' ' + parsed.section;
    sectionBadge.style.display = 'inline-block';
  } else {
    sectionBadge.style.display = 'none';
  }

  panelText.textContent = parsed.question || '';
  panelChoices.innerHTML = '';
  parsed.options.forEach(opt => {
    panelChoices.appendChild(_buildChoiceCard(opt.label, opt.text, opt.impact || null));
  });
  panel.style.display = 'flex';

  const chatEl = document.getElementById('chat-messages');
  if(chatEl) chatEl.scrollTop = chatEl.scrollHeight;
}

function renderOptionsLegacy(text) {
  // Fallback for non-JSON AI responses
  const matches = [...text.matchAll(/([A-D])\)\s*(.+?)(?=\n[A-D]\)|$)/gs)];
  if(matches.length === 0) return;
  const panel = document.getElementById('question-panel');
  const panelText = document.getElementById('question-panel-text');
  const panelChoices = document.getElementById('question-panel-choices');
  if(!panel) return;
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
  const panel = document.getElementById('question-panel');
  if(panel) panel.style.display = 'none';
  const panelChoices = document.getElementById('question-panel-choices');
  if(panelChoices) panelChoices.innerHTML = '';
}

async function generateScoring(history) {
  const lvl = t('levels').find(l => l.id === currentLevel);
  const scoringPrompt = `You are a project complexity analyst. Based on this interview about the app "${currentTopic}", generate a project scoring report.

Interview:
${history}

Chosen level: ${lvl ? lvl.name : currentLevel}

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
  "suggestedLevel": "${currentLevel}"
}

levelMatch must be: "ok", "upgrade", or "downgrade".
suggestedLevel must be one of: iskra, plomien, pozar, inferno.
Keep risks under 12 words each. Be specific to this project.
Language: ${lang === 'en' ? 'English' : 'Polish'}`;

  try {
    const raw = await callGemini('You are a project analyst. Return only JSON.', scoringPrompt, '📊 Scoring · Complexity analysis');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch(e) {
    console.warn('Scoring failed:', e);
    return null;
  }
}

function renderScoring(data) {
  if(!data) return;
  const panel = document.getElementById('scoring-panel');
  panel.style.display = 'block';

  const scoreColor = data.overallScore >= 75 ? 'var(--accent2)' : data.overallScore >= 50 ? '#f59e0b' : 'var(--success)';
  const isWarn = data.levelMatch !== 'ok';
  const suggestedLvl = t('levels').find(l => l.id === data.suggestedLevel);

  const _metricInfo = {
    'Technical Complexity':  { low: '0–40: Simple tech stack, mostly standard tools.', mid: '40–70: Custom logic, APIs or real-time features needed.', high: '70–100: Complex architecture, microservices or AI.' },
    'Business Complexity':   { low: '0–40: Straightforward model, few stakeholders.', mid: '40–70: Multiple user roles or revenue streams.', high: '70–100: Complex ops, compliance or multi-market.' },
    'Integration Needs':     { low: '0–40: Few or no external services required.', mid: '40–70: Several APIs like payments or auth needed.', high: '70–100: Heavy integrations, real-time data sync.' },
    'Scalability Demand':    { low: '0–40: Small user base, no scaling pressure.', mid: '40–70: Growth expected, some infrastructure planning.', high: '70–100: High traffic, distributed systems required.' },
  };
  const metricsHTML = (data.metrics || []).map(m => {
    const info = _metricInfo[m.label] || {};
    const tier = m.value < 40 ? info.low : m.value < 70 ? info.mid : info.high;
    const tipId = 'tip-' + m.label.replace(/\s+/g,'-');
    const infoBtn = tier ? '<button class="metric-info-btn" onclick="document.getElementById(\'' + tipId + '\').classList.toggle(\'visible\')" title="What does this mean?">\u2139\ufe0f</button>' : '';
    const tipDiv = tier ? '<div class="metric-tip" id="' + tipId + '">' + tier + '</div>' : '';
    return '<div class="score-metric">'
      + '<div class="score-metric-label">' + m.label + infoBtn + '</div>'
      + tipDiv
      + '<div class="score-metric-bar"><div class="score-metric-fill" style="width:0%;background:' + m.color + '" data-target="' + m.value + '"></div></div>'
      + '<div class="score-metric-value">' + m.value + '/100</div>'
      + '</div>';
  }).join('');

  const risksHTML = (data.risks || []).map(r => `<div class="risk-item">${r}</div>`).join('');
  const suggestionIcon = data.levelMatch === 'upgrade' ? '⬆' : data.levelMatch === 'downgrade' ? '⬇' : '✓';

  panel.innerHTML = `
    <div class="scoring-header">
      <h3>${lang==='en' ? 'PROJECT SCORING' : 'OCENA PROJEKTU'}</h3>
      <div class="score-badge">
        <div class="score-number" style="color:${scoreColor}">${data.overallScore}</div>
        <div class="score-label"><strong>${data.overallLabel}</strong>${lang==='en'?'out of 100':'na 100'}</div>
      </div>
    </div>
    <div class="scoring-grid">${metricsHTML}</div>
    ${risksHTML ? `<div class="scoring-risks"><h4>${lang==='en'?'⚠ POTENTIAL RISKS':'⚠ POTENCJALNE RYZYKA'}</h4>${risksHTML}</div>` : ''}
    <div class="level-suggestion ${isWarn ? 'warn' : ''}">
      <span class="ls-icon">${suggestionIcon}</span>
      <span>${data.levelSuggestion}${suggestedLvl && isWarn ? ' <strong>→ ' + suggestedLvl.name + '</strong>' : ''}</span>
    </div>
  `;

  // Single-frame rAF to trigger CSS transition after DOM paint
  requestAnimationFrame(() => {
    if(!document.getElementById('screen-results').classList.contains('active')) return;
    panel.querySelectorAll('.score-metric-fill').forEach(bar => {
      setTimeout(() => { bar.style.width = (bar.dataset.target || 0) + '%'; }, 100);
    });
  });
}

async function generateAgents() {
  addTypingIndicator();
  const history = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
  const prompt = `Here is the complete interview:\n${history}\n\n[GENERATE]\nGenerate the agent team JSON now based on the interview.`;

  try {
    const levelData = t('levels').find(l => l.id === currentLevel) || t('levels')[0];
    const raw = await callGemini(getSystemPrompt(), prompt, `⚡ Generate Team · ${levelData.agentCount} agents · ${currentLevel}`);
    removeTypingIndicator();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('Could not parse agent data');
    const data = JSON.parse(jsonMatch[0]);

    generatedAgents = data.agents || [];
    generatedFiles = {};

    generatedAgents.forEach(a => {
      generatedFiles[`agent-${a.id}.md`] = a.agentMd || `# Agent: ${a.name}\n\n**Role:** ${a.role || ''}\n\n${a.description || ''}`;
      generatedFiles[`skill-${a.id}.md`] = a.skillMd || `# Skill: ${a.name}\n\n## Capabilities\n\n${a.description || ''}`;
    });
    generatedFiles['team-config.md'] = data.teamConfig || `# Team Configuration\n\n**Project:** ${currentTopic}\n\n## Agents\n\n${generatedAgents.map(a => `- **${a.name}** (${a.role || a.id})`).join('\n')}`;
    generatedFiles['README.md'] = generateReadme();
    trackEvent('team_generated', {
      success: true,
      agents: generatedAgents.length,
      level: currentLevel
    });

    window._scoringData = undefined;
    const historyForScoring = chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
    generateScoring(historyForScoring).then(scoreData => {
      window._scoringData = scoreData;
    });

    renderProgressSteps(3);
    addMessage('ai', lang==='en'
      ? `✅ Done! I've designed ${generatedAgents.length} specialized agents for your "${currentTopic}" app. Your files are ready — switching to results view now!`
      : `✅ Gotowe! Zaprojektowałem ${generatedAgents.length} wyspecjalizowanych agentów dla Twojej aplikacji "${currentTopic}". Pliki są gotowe — przechodzę do widoku wyników!`
    );

    setTimeout(() => {
      // Seed v1 "Origin" snapshot
      versionHistory = [];
      versionHistory.push({
        id: Date.now(),
        label: lang === 'en' ? `Original team — ${currentTopic}` : `Oryginalny zespół — ${currentTopic}`,
        ts: new Date(),
        agents: JSON.parse(JSON.stringify(generatedAgents)),
        files: JSON.parse(JSON.stringify(generatedFiles)),
        diff: { added: [], removed: [], changed: [] },
        removedNames: {},
        agentNames: Object.fromEntries(generatedAgents.map(a => [a.id, a.name])),
        vNum: 1,
        isOrigin: true,
      });
      showResults();
    }, 1800);
  } catch(err) {
    removeTypingIndicator();
    addMessage('ai', `Generation error: ${err.message}. Please try again.`);
    trackEvent('team_generated', {
      success: false,
      reason: String(err?.message || 'generation_error').slice(0, 120)
    });
  }
}

function generateReadme() {
  const technical = generatedAgents.filter(a => a.type === 'technical');
  const business  = generatedAgents.filter(a => a.type !== 'technical');
  const techList = technical.map(a => `- **${a.name}** [TECHNICAL] (${a.role}): ${a.description}`).join('\n');
  const bizList  = business.map(a  => `- **${a.name}** [BUSINESS] (${a.role}): ${a.description}`).join('\n');
  const lvl = t('levels').find(l => l.id === currentLevel);
  return `# AgentSpark — Generated Team\n\n**Project:** ${currentTopic}\n**Level:** ${lvl ? lvl.name : currentLevel}\n**Generated:** ${new Date().toLocaleString()}\n**Language:** ${lang.toUpperCase()}\n\n## ⚙️ Technical Agents\n\n${techList || 'none'}\n\n## 💼 Business Agents\n\n${bizList || 'none'}\n\n## Files\n\n${Object.keys(generatedFiles).filter(f=>f!=='README.md').map(f=>`- \`${f}\``).join('\n')}\n\n## How to use\n\nSee instructions inside the app or visit agentspark docs\n`;
}


// ─── DEPENDENCY GRAPH ────────────────────────────────────
let graphNodes = [];
let graphEdges = [];
let graphAnimFrame = null;

function buildGraphFromAgents() {
  const agents = generatedAgents;
  if(!agents.length) return;

  const canvas = document.getElementById('agent-graph');
  if(!canvas) return;

  // Cancel any running animation before rebuilding
  if(graphAnimFrame) {
    cancelAnimationFrame(graphAnimFrame);
    graphAnimFrame = null;
  }
  const W = canvas.offsetWidth || 800;
  const H = 400;
  canvas.width = W;
  canvas.height = H;

  const cx = W / 2, cy = H / 2;
  const radius = Math.min(W, H) * 0.33;

  const tech = agents.filter(a => a.type === 'technical');
  const biz  = agents.filter(a => a.type !== 'technical');

  graphNodes = [];

  tech.forEach((a, i) => {
    const angle = (Math.PI * 0.8) + (i / Math.max(tech.length - 1, 1)) * Math.PI * 0.8 - Math.PI * 0.4;
    graphNodes.push({
      id: a.id, label: a.name, emoji: a.emoji || '⚙',
      type: 'technical',
      x: cx - radius * 0.6 + Math.cos(angle) * radius * 0.5,
      y: cy + Math.sin(angle) * radius * 0.7,
      vx: 0, vy: 0, r: 28
    });
  });

  biz.forEach((a, i) => {
    const angle = (Math.PI * 0.1) + (i / Math.max(biz.length - 1, 1)) * Math.PI * 0.8 - Math.PI * 0.4;
    graphNodes.push({
      id: a.id, label: a.name, emoji: a.emoji || '💼',
      type: 'business',
      x: cx + radius * 0.6 + Math.cos(angle) * radius * 0.5,
      y: cy + Math.sin(angle) * radius * 0.7,
      vx: 0, vy: 0, r: 28
    });
  });

  graphEdges = [];
  for(let i = 0; i < tech.length - 1; i++) {
    graphEdges.push({ from: tech[i].id, to: tech[i+1].id, label: 'pipeline', style: 'tech' });
  }
  biz.forEach(b => {
    tech.forEach(tn => {
      graphEdges.push({ from: b.id, to: tn.id, label: 'context', style: 'biz' });
    });
  });

  drawGraph();
}

function drawGraph() {
  const canvas = document.getElementById('agent-graph');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(242,185,13,0.04)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  graphEdges.forEach(edge => {
    const from = graphNodes.find(n => n.id === edge.from);
    const to   = graphNodes.find(n => n.id === edge.to);
    if(!from || !to) return;

    const isBiz = edge.style === 'biz';
    const color = isBiz ? 'rgba(255,107,53,0.35)' : 'rgba(242,185,13,0.4)';

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = isBiz ? 1.5 : 2;
    if(isBiz) ctx.setLineDash([4, 4]);
    else ctx.setLineDash([]);

    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2 - 30;
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const angle = Math.atan2(to.y - my, to.x - mx);
    const arrowLen = 8;
    ctx.beginPath();
    ctx.fillStyle = color.replace('0.35','0.7').replace('0.4','0.8');
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - arrowLen * Math.cos(angle - 0.4), to.y - arrowLen * Math.sin(angle - 0.4));
    ctx.lineTo(to.x - arrowLen * Math.cos(angle + 0.4), to.y - arrowLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  });

  graphNodes.forEach(node => {
    const isTech = node.type === 'technical';
    const color  = isTech ? '#f2b90d' : '#e05a1a';
    const glow   = isTech ? 'rgba(242,185,13,0.25)' : 'rgba(224,90,26,0.22)';

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + 8, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = isTech ? 'rgba(196,147,10,0.2)' : 'rgba(255,107,53,0.15)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.emoji, node.x, node.y - 2);

    const maxW = 90;
    const words = node.label.split(' ');
    let line = '', lines = [];
    words.forEach(w => {
      const test = line + (line ? ' ' : '') + w;
      ctx.font = 'bold 10px Manrope, sans-serif';
      if(ctx.measureText(test).width > maxW && line) {
        lines.push(line); line = w;
      } else { line = test; }
    });
    lines.push(line);

    ctx.fillStyle = '#f0ead8';
    ctx.font = 'bold 10px Manrope, sans-serif';
    lines.forEach((l, i) => {
      ctx.fillText(l, node.x, node.y + node.r + 12 + i * 13);
    });
  });

  graphAnimFrame = requestAnimationFrame(drawGraphPulse);
}

let pulseT = 0;
function drawGraphPulse() {
  pulseT += 0.02;
  const canvas = document.getElementById('agent-graph');
  if(!canvas || !document.getElementById('screen-results').classList.contains('active')) return;

  // Full redraw each frame so glows don't accumulate
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background grid
  ctx.strokeStyle = 'rgba(242,185,13,0.04)';
  ctx.lineWidth = 1;
  for(let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Edges
  graphEdges.forEach(edge => {
    const from = graphNodes.find(n => n.id === edge.from);
    const to   = graphNodes.find(n => n.id === edge.to);
    if(!from || !to) return;
    const isBiz = edge.style === 'biz';
    const color = isBiz ? 'rgba(255,107,53,0.35)' : 'rgba(242,185,13,0.4)';
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = isBiz ? 1.5 : 2;
    if(isBiz) ctx.setLineDash([4, 4]);
    else ctx.setLineDash([]);
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2 - 30;
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my, to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const angle = Math.atan2(to.y - my, to.x - mx);
    const arrowLen = 8;
    ctx.beginPath();
    ctx.fillStyle = color.replace('0.35','0.7').replace('0.4','0.8');
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - arrowLen * Math.cos(angle - 0.4), to.y - arrowLen * Math.sin(angle - 0.4));
    ctx.lineTo(to.x - arrowLen * Math.cos(angle + 0.4), to.y - arrowLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  });

  // Nodes with pulse
  graphNodes.forEach(node => {
    const isTech = node.type === 'technical';
    const color  = isTech ? '#f2b90d' : '#e05a1a';
    const phase  = pulseT + (isTech ? 0 : Math.PI);
    const pulse  = Math.sin(phase) * 3;
    const glowA  = 0.15 + Math.abs(Math.sin(phase)) * 0.12;
    const glow   = isTech ? `rgba(196,147,10,${glowA})` : `rgba(255,107,53,${glowA * 0.85})`;

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r + 8 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fillStyle = isTech ? 'rgba(196,147,10,0.2)' : 'rgba(255,107,53,0.15)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.emoji, node.x, node.y - 2);

    const maxW = 90;
    const words = node.label.split(' ');
    let line = '', lines = [];
    words.forEach(w => {
      ctx.font = 'bold 10px Manrope, sans-serif';
      const test = line + (line ? ' ' : '') + w;
      if(ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else { line = test; }
    });
    lines.push(line);
    ctx.fillStyle = '#f0ead8';
    ctx.font = 'bold 10px Manrope, sans-serif';
    lines.forEach((l, i) => ctx.fillText(l, node.x, node.y + node.r + 12 + i * 13));
  });

  graphAnimFrame = requestAnimationFrame(drawGraphPulse);
}


// ─── REFINE MODE ─────────────────────────────────────────────
let refineSnapshots = [];      // legacy — kept for revertLastRefine compat
let versionHistory  = [];      // rich version objects: { id, label, ts, agents, files, diff }
let selectedRefineAction = null;
let versionPanelOpen = false;

// ─── TRACE STATE ──────────────────────────────────────────
let traceSpans = [];           // all recorded API spans
let tracePanelOpen = false;
let traceSessionStart = null;  // epoch ms of first span in current session

function openRefine() {
  const panel = document.getElementById('refine-panel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('refine-title').textContent = t('refineTitle');
  document.getElementById('refine-sub').textContent = t('refineSub');
  document.getElementById('refine-input').placeholder = t('refinePlaceholder');
  document.getElementById('refine-submit-label').textContent = t('refineApply');

  // Always start at step 1
  const s1 = document.getElementById('refine-step1');
  const s2 = document.getElementById('refine-step2');
  if(s1) s1.style.display = 'block';
  if(s2) s2.style.display = 'none';
  const applyBtn = document.getElementById('refine-apply-btn');
  if(applyBtn) applyBtn.style.display = 'none';
  document.getElementById('refine-history').innerHTML = '';
  _pendingRefineData = null;

  const chips = document.getElementById('refine-action-chips');
  chips.innerHTML = '';
  t('refineActions').forEach(action => {
    const chip = document.createElement('button');
    chip.className = 'refine-chip' + (selectedRefineAction === action.id ? ' active' : '');
    chip.dataset.id = action.id;
    chip.innerHTML = `<span>${action.emoji}</span><span>${action.label}</span>`;
    chip.title = action.desc;
    chip.onclick = () => {
      selectedRefineAction = action.id;
      chips.querySelectorAll('.refine-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const ta = document.getElementById('refine-input');
      if(!ta.value.trim()) {
        const hints = {
          improve: lang === 'en' ? 'Improve overall agent descriptions and add more specific skills...' : 'Ulepsz opisy agentów i dodaj bardziej szczegółowe umiejętności...',
          add: lang === 'en' ? 'Add a [type] agent that handles [responsibility]...' : 'Dodaj agenta [typ] który zajmuje się [odpowiedzialność]...',
          remove: lang === 'en' ? 'Remove the [agent name] agent and redistribute its responsibilities...' : 'Usuń agenta [nazwa] i redystrybuuj jego obowiązki...',
          connections: lang === 'en' ? 'Change the connection so that [agent A] sends results directly to [agent B]...' : 'Zmień połączenie tak żeby [agent A] wysyłał wyniki bezpośrednio do [agent B]...',
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
  document.getElementById('refine-panel').style.display = 'none';
  selectedRefineAction = null;
  _pendingRefineData = null;
  // Reset to step 1
  const s1 = document.getElementById('refine-step1');
  const s2 = document.getElementById('refine-step2');
  if(s1) s1.style.display = 'block';
  if(s2) s2.style.display = 'none';
  const applyBtn = document.getElementById('refine-apply-btn');
  if(applyBtn) applyBtn.style.display = 'none';
  if(isRefining) {
    isRefining = false;
    document.getElementById('refine-submit-btn').disabled = false;
    removeRefineThinking();
  }
}

function updateRefineCounter() {
  const count = refineSnapshots.length;
  const counter = document.getElementById('refine-counter');
  const revertBtn = document.getElementById('refine-revert-btn');
  // ── FIX: was missing quotes around 'ę' causing SyntaxError ──
  if(lang === 'pl') {
    const suffix = count === 1 ? 'ę' : count > 1 && count < 5 ? 'e' : 'i';
    counter.textContent = count > 0 ? `Wykonano ${count} rewizj${suffix}` : '';
  } else {
    counter.textContent = count > 0 ? `${count} revision${count > 1 ? 's' : ''} made` : '';
  }
  revertBtn.style.display = count > 0 ? 'block' : 'none';
}

function addRefineMessage(role, html) {
  const history = document.getElementById('refine-history');
  const div = document.createElement('div');
  div.className = `refine-msg ${role}`;
  div.innerHTML = `
    <div class="refine-msg-sender">${role === 'ai' ? '⚡ AgentSpark' : (lang === 'en' ? 'You' : 'Ty')}</div>
    <div class="refine-bubble">${html}</div>
  `;
  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function addRefineThinking() {
  const history = document.getElementById('refine-history');
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
  const el = document.getElementById('refine-thinking-indicator');
  if(el) el.remove();
}

function getRefineSystemPrompt() {
  const lvl = t('levels').find(l => l.id === currentLevel);
  const currentTeamJSON = JSON.stringify(generatedAgents.map(a => ({
    id: a.id, name: a.name, type: a.type, role: a.role, description: a.description
  })), null, 2);

  return `You are AgentSpark, an expert AI system designer in REFINE mode.
Language: ${lang === 'en' ? 'English' : 'Polish'}
App topic: ${currentTopic}
Complexity level: ${lvl ? lvl.name : currentLevel}

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
let _pendingRefineData = null;

async function submitRefine() {
  const input = document.getElementById('refine-input');
  const text = input.value.trim();
  if(!text || isRefining) return;

  const actionCtx = selectedRefineAction ? '[Action: ' + selectedRefineAction + '] ' : '';
  const fullRequest = actionCtx + text;

  isRefining = true;
  document.getElementById('refine-submit-btn').disabled = true;

  // Switch to step 2
  document.getElementById('refine-step1').style.display = 'none';
  document.getElementById('refine-step2').style.display = 'block';

  const histEl = document.getElementById('refine-history');
  histEl.innerHTML = '';
  addRefineMessage('user', text);
  addRefineThinking();

  try {
    const history = refineHistory.map(m => (m.role === 'user' ? 'User' : 'AI') + ': ' + m.text).join('\n');
    const prompt = history
      ? 'Previous context:\n' + history + '\n\nNew request: ' + fullRequest
      : 'Request: ' + fullRequest;

    const refineActionEmoji = { improve:'⚡', add:'➕', remove:'🗑', connections:'🔗' };
    const refineEmoji = refineActionEmoji[selectedRefineAction] || '✏️';
    const refineVer = versionHistory.length + 1;
    const raw = await callGemini(getRefineSystemPrompt(), prompt, refineEmoji + ' Refine · v' + refineVer + (selectedRefineAction ? ' · ' + selectedRefineAction : ''));
    removeRefineThinking();

    const markerIdx = raw.indexOf('[UPDATED_TEAM]');
    let summary = '', jsonPart = '';
    if(markerIdx !== -1) {
      summary = raw.slice(0, markerIdx).trim();
      jsonPart = raw.slice(markerIdx + '[UPDATED_TEAM]'.length).trim();
    } else {
      const jm = raw.match(/\{[\s\S]*"agents"[\s\S]*\}/);
      if(jm) {
        jsonPart = jm[0];
        summary = raw.slice(0, raw.indexOf(jm[0])).trim() || (lang === 'en' ? 'Team updated.' : 'Zespół zaktualizowany.');
      } else {
        throw new Error(lang === 'en' ? 'Could not parse updated team.' : 'Nie udało się przetworzyć zaktualizowanego zespołu.');
      }
    }

    const jm2 = jsonPart.match(/\{[\s\S]*\}/);
    if(!jm2) throw new Error('No JSON in response');
    const data = JSON.parse(jm2[0]);
    if(!data.agents || !Array.isArray(data.agents)) throw new Error('Invalid agents data');

    const prevIds = new Set(generatedAgents.map(a => a.id));
    const newIds  = new Set(data.agents.map(a => a.id));
    const addedIds   = [...newIds].filter(id => !prevIds.has(id));
    const removedIds = [...prevIds].filter(id => !newIds.has(id));
    const changedIds = [...newIds].filter(id => prevIds.has(id) && JSON.stringify(data.agents.find(a=>a.id===id)) !== JSON.stringify(generatedAgents.find(a=>a.id===id)));
    const removedNames = Object.fromEntries(removedIds.map(id => [id, generatedAgents.find(a => a.id === id)?.name || id]));

    const diffBadges = [
      ...addedIds.map(id => '<span class="refine-diff-added">+' + (data.agents.find(a=>a.id===id)?.name || id) + '</span>'),
      ...removedIds.map(id => '<span class="refine-diff-removed">-' + removedNames[id] + '</span>'),
      ...changedIds.map(id => '<span class="refine-diff-changed">~' + (data.agents.find(a=>a.id===id)?.name || id) + '</span>'),
    ].join(' ');

    addRefineMessage('ai', (summary || '') + (diffBadges ? '<br/><br/>' + diffBadges : ''));
    _pendingRefineData = { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary };

    const applyBtn = document.getElementById('refine-apply-btn');
    if(applyBtn) {
      applyBtn.style.display = 'inline-flex';
      document.getElementById('refine-apply-label').textContent = t('refineApply');
    }
    updateRefineCounter();

  } catch(err) {
    removeRefineThinking();
    addRefineMessage('ai', '<span style="color:var(--accent2)">⚠ ' + err.message + '</span>');
    showNotif(lang === 'en' ? '⚠ Refine failed.' : '⚠ Błąd generowania.', true);
    _pendingRefineData = null;
  }

  isRefining = false;
  document.getElementById('refine-submit-btn').disabled = false;
}

function applyRefinement() {
  if(!_pendingRefineData) return;
  const { data, text, fullRequest, addedIds, removedIds, changedIds, removedNames, summary } = _pendingRefineData;
  _pendingRefineData = null;

  refineSnapshots.push(JSON.parse(JSON.stringify({ agents: generatedAgents, files: generatedFiles })));

  generatedAgents = data.agents;
  data.agents.forEach(a => {
    generatedFiles['agent-' + a.id + '.md'] = a.agentMd || '# Agent: ' + a.name + '\n\n**Role:** ' + (a.role || '') + '\n\n' + (a.description || '');
    generatedFiles['skill-' + a.id + '.md'] = a.skillMd || '# Skill: ' + a.name + '\n\n## Capabilities\n\n' + (a.description || '');
  });
  removedIds.forEach(id => {
    delete generatedFiles['agent-' + id + '.md'];
    delete generatedFiles['skill-' + id + '.md'];
  });
  if(data.teamConfig) generatedFiles['team-config.md'] = data.teamConfig;
  generatedFiles['README.md'] = generateReadme();

  refineHistory.push({ role: 'user', text: fullRequest });
  refineHistory.push({ role: 'ai', text: summary });

  const vNum = versionHistory.length + 2;
  versionHistory.push({
    id: Date.now(),
    label: text.length > 60 ? text.slice(0, 57) + '…' : text,
    ts: new Date(),
    agents: JSON.parse(JSON.stringify(generatedAgents)),
    files: JSON.parse(JSON.stringify(generatedFiles)),
    diff: { added: addedIds, removed: removedIds, changed: changedIds },
    removedNames,
    agentNames: Object.fromEntries(data.agents.map(a => [a.id, a.name])),
    vNum,
  });
  renderVersionPanel();
  closeRefine();
  showResults(true);
  scheduleAutoSave();

  setTimeout(() => {
    addedIds.forEach(id => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if(c) c.classList.add('just-added'); });
    changedIds.forEach(id => { const c = document.querySelector('[data-agent-id="' + id + '"]'); if(c) c.classList.add('just-updated'); });
  }, 150);
  setTimeout(() => buildGraphFromAgents(), 300);
  showNotif(lang === 'en' ? '✓ Team updated!' : '✓ Zespół zaktualizowany!');
  const revertBtn = document.getElementById('refine-revert-btn');
  if(revertBtn) revertBtn.style.display = 'inline-flex';
}

function backToRefineStep1() {
  _pendingRefineData = null;
  document.getElementById('refine-step1').style.display = 'block';
  document.getElementById('refine-step2').style.display = 'none';
  const applyBtn = document.getElementById('refine-apply-btn');
  if(applyBtn) applyBtn.style.display = 'none';
  document.getElementById('refine-history').innerHTML = '';
  document.getElementById('refine-input').focus();
}

function revertLastRefine() {
  if(!refineSnapshots.length) return;
  const snap = refineSnapshots.pop();
  generatedAgents = snap.agents;
  generatedFiles = snap.files;
  refineHistory = refineHistory.slice(0, -2);
  updateRefineCounter();
  showResults(true);
  buildGraphFromAgents();
  addRefineMessage('ai', lang === 'en' ? '↩ Reverted to previous version.' : '↩ Przywrócono poprzednią wersję.');
  showNotif(lang === 'en' ? '↩ Reverted.' : '↩ Przywrócono.');
}

// ─── RESULTS SCREEN ───────────────────────────────────────
function showResults(skipReset = false) {
  showScreen('results');
  _updateContextBar('results');
  // Show skeleton while agents render
  if (!skipReset) _renderSkeletonCards(4);

  document.getElementById('result-badge').textContent = t('resultBadge');
  document.getElementById('result-title').textContent = t('resultTitle');
  document.getElementById('result-sub').textContent = t('resultSub');
  document.getElementById('download-btn').textContent = t('downloadBtn');
  document.getElementById('instr-btn').textContent = t('instrBtn');
  document.getElementById('refine-btn').textContent = t('refineBtn');
  document.getElementById('md-preview-btn').textContent = lang === 'en' ? '📄 Preview Docs' : '📄 Podgląd Docs';
  document.getElementById('fw-export-btn').textContent = lang === 'en' ? '🚀 Export Framework' : '🚀 Eksport Framework';

  renderVersionPanel();
  renderTraceLive();

  if(!skipReset) {
    refineHistory = [];
    isRefining = false;
    refineSnapshots = [];
    selectedRefineAction = null;
    document.getElementById('refine-panel').style.display = 'none';
    document.getElementById('refine-history').innerHTML = '';
  }

  const lvl = t('levels').find(l => l.id === currentLevel);
  if(lvl) {
    document.getElementById('result-badge').textContent = lvl.emoji + ' ' + lvl.name.toUpperCase() + ' — ' + t('resultBadge');
    document.getElementById('result-badge').style.borderColor = lvl.color + '66';
    document.getElementById('result-badge').style.color = lvl.color;
  }

  if(!skipReset) {
    let scoringAttempts = 0;
    const tryRenderScoring = () => {
      scoringAttempts++;
      if(window._scoringData !== undefined) {
        renderScoring(window._scoringData);
      } else if(scoringAttempts < 30) {
        setTimeout(tryRenderScoring, 400);
      }
      // silently give up after 12s — scoring is non-critical
    };
    setTimeout(tryRenderScoring, 300);
  }

  // Always ensure graph section is visible when results are shown
  document.getElementById('graph-title').textContent = lang==='en' ? 'Agent Dependency Graph' : 'Graf Zależności Agentów';
  document.getElementById('graph-section').style.display = 'block';

  // Auto-save hook (#1)
  _onAgentsReady();

  const grid = document.getElementById('agents-grid');
  grid.innerHTML = '';

  const technical = generatedAgents.filter(a => a.type === 'technical');
  const business  = generatedAgents.filter(a => a.type !== 'technical');

  function makeAgentCard(agent) {
    const isTech = agent.type === 'technical';
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.type = agent.type || 'technical';
    card.dataset.agentId = agent.id;
    card.innerHTML = `
      <div class="agent-card-header">
        <div class="agent-avatar" style="background:${isTech ? 'linear-gradient(145deg,#c49a0a,#f2b90d)' : 'linear-gradient(145deg,#c44010,#e05a1a)'}">${agent.emoji || '🤖'}</div>
        <div class="agent-card-meta">
          <div class="agent-name">${agent.name}</div>
          <div class="agent-role">${agent.role}</div>
          <div class="agent-type-badge ${isTech ? 'badge-tech' : 'badge-biz'}" style="display:inline-block;margin-top:0.4rem;">${isTech ? (lang==='en'?'Technical':'Techniczny') : (lang==='en'?'Business':'Biznesowy')}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;">
           <button class="feedback-btn" onclick="event.stopPropagation();this.innerText='👍';this.style.color='var(--success)';this.style.transform='scale(1.2)'" style="background:none;border:none;cursor:pointer;font-size:1.1rem;opacity:0.6;transition:all 0.2s;" title="Like">👍</button>
           <button class="feedback-btn" onclick="event.stopPropagation();this.innerText='👎';this.style.color='var(--accent2)';this.style.transform='scale(1.2)'" style="background:none;border:none;cursor:pointer;font-size:1.1rem;opacity:0.6;transition:all 0.2s;" title="Dislike">👎</button>
        </div>
      </div>
      <div class="agent-card-divider"></div>
      <div class="agent-card-body">
        <div class="agent-desc">${agent.description}</div>
        <div class="file-chips-group">
          <span class="file-chips-label">Files</span>
          <div class="file-chips">
            <div class="file-chip" tabindex="0" role="button" onclick="previewFile('agent-${agent.id}.md')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();previewFile('agent-${agent.id}.md')}">agent-${agent.id}.md</div>
            <div class="file-chip" tabindex="0" role="button" onclick="previewFile('skill-${agent.id}.md')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();previewFile('skill-${agent.id}.md')}">skill-${agent.id}.md</div>
          </div>
        </div>
      </div>
    `;
    card.tabIndex = 0;
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `${agent.name} — ${agent.role}`);
    return card;
  }

  function makeSection(title, icon, agents, colorClass) {
    if(agents.length === 0) return;
    const section = document.createElement('div');
    section.className = 'agent-section';
    section.innerHTML = `<div class="agent-section-header ${colorClass}"><span>${icon}</span><span>${title}</span><span class="section-count">${agents.length}</span></div>`;
    const sg = document.createElement('div');
    sg.className = 'agents-grid';
    agents.forEach(a => sg.appendChild(makeAgentCard(a)));
    section.appendChild(sg);
    grid.appendChild(section);
  }

  makeSection(
    lang==='en' ? 'Technical Agents — Build your app' : 'Agenci Techniczni — Budują aplikację',
    '⚙️', technical, 'section-tech'
  );
  makeSection(
    lang==='en' ? 'Business Agents — Shape your vision' : 'Agenci Biznesowi — Nadają kontekst',
    '💼', business, 'section-biz'
  );

  const configWrap = document.createElement('div');
  configWrap.className = 'agent-section';
  configWrap.innerHTML = `<div class="agent-section-header section-config"><span>🔗</span><span>${lang==='en'?'Team Configuration':'Konfiguracja Zespołu'}</span></div>`;
  const configGrid = document.createElement('div');
  configGrid.className = 'agents-grid';
  const configCard = document.createElement('div');
  configCard.className = 'agent-card';
  configCard.innerHTML = `
    <div class="agent-card-header">
      <div class="agent-avatar" style="background:linear-gradient(145deg,#2a2510,#3a3218)">🔗</div>
      <div class="agent-card-meta">
        <div class="agent-name">${lang==='en' ? 'Team Configuration' : 'Konfiguracja Zespołu'}</div>
        <div class="agent-role">Orchestration</div>
      </div>
    </div>
    <div class="agent-card-divider"></div>
    <div class="agent-card-body">
      <div class="agent-desc">${lang==='en' ? 'Defines how all agents connect and collaborate.' : 'Definiuje jak agenci się łączą i współpracują.'}</div>
      <div class="file-chips-group">
        <span class="file-chips-label">Files</span>
        <div class="file-chips">
          <div class="file-chip" onclick="previewFile('team-config.md')">team-config.md</div>
          <div class="file-chip" onclick="previewFile('README.md')">README.md</div>
        </div>
      </div>
    </div>
  `;
  configGrid.appendChild(configCard);
  configWrap.appendChild(configGrid);
  grid.appendChild(configWrap);
  // Sync FAB after agents rendered
  _syncFab();

  setTimeout(() => {
    buildGraphFromAgents();
    const gc = document.querySelector('.graph-container');
    if(gc && !gc.querySelector('.graph-legend')) {
      const leg = document.createElement('div');
      leg.className = 'graph-legend';
      leg.innerHTML = `
        <span><div class="legend-dot" style="background:#f2b90d"></div>${lang==='en'?'Technical agent':'Agent techniczny'}</span>
        <span><div class="legend-dot" style="background:#e05a1a"></div>${lang==='en'?'Business agent':'Agent biznesowy'}</span>
        <span style="font-size:0.65rem;margin-left:auto;color:var(--muted)">— — ${lang==='en'?'context flow':'przepływ kontekstu'} &nbsp;&nbsp;—— ${lang==='en'?'pipeline':'pipeline'}</span>
      `;
      gc.appendChild(leg);
    }
  }, 100);
}

function showInstructions() {
  const section = document.getElementById('instructions-section');
  const isHidden = getComputedStyle(section).display === 'none';
  section.style.display = isHidden ? 'block' : 'none';
  if(isHidden) {
    document.getElementById('instr-title').textContent = t('instrTitle');
    const steps = document.getElementById('instr-steps');
    steps.innerHTML = '';
    t('instrSteps').forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'instruction-step';
      div.innerHTML = `<div class="num">0${i+1}</div><div class="content"><strong>${step.title}</strong><p>${step.body}</p></div>`;
      steps.appendChild(div);
    });
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function downloadZip() {
  if(typeof JSZip === 'undefined') {
    showNotif('JSZip not loaded', true);
    trackEvent('export_zip', { success: false, reason: 'jszip_missing' });
    return;
  }
  const zip = new JSZip();

  // ── Core agent files ──────────────────────────────────────
  Object.entries(generatedFiles).forEach(([name, content]) => {
    zip.file(name, content);
  });

  // ── config.json — structured metadata ────────────────────
  const cfg = {
    name: currentTopic,
    version: '1.0.0',
    generated_by: 'AgentSpark v1.1.0',
    generated_at: new Date().toISOString(),
    level: currentLevel,
    agents: generatedAgents.map(a => ({
      id: a.id, name: a.name, role: a.role,
      description: a.description,
      agent_file: 'agent-' + a.id + '.md',
      skill_file:  'skill-' + a.id + '.md'
    })),
    usage: {
      primary_model: 'claude-sonnet-4-6 / gpt-4o / gemini-2.5-flash',
      pattern: 'Each agent file is a system prompt. Load into your preferred AI platform.'
    }
  };
  zip.file('config.json', JSON.stringify(cfg, null, 2));

  // ── agentspark.json — full re-import manifest ─────────────
  const manifest = {
    v: 2, source: 'agentspark', topic: currentTopic,
    level: currentLevel, lang, agents: generatedAgents,
    files: generatedFiles, ts: Date.now()
  };
  zip.file('agentspark.json', JSON.stringify(manifest, null, 2));

  // ── examples/python_example.py ────────────────────────────
  const firstId  = generatedAgents[0] ? generatedAgents[0].id : 'agent-0';
  const pyAgents = generatedAgents.map(a =>
    '    "' + a.id + '": open("agent-' + a.id + '.md").read(),'
  ).join('\n');
  const pyCode = [
    '#!/usr/bin/env python3',
    '"""',
    currentTopic + ' — AgentSpark Team',
    'Generated by AgentSpark v1.1.0',
    '',
    'Usage:',
    '  pip install anthropic',
    '  python python_example.py',
    '"""',
    '',
    'import anthropic',
    '',
    'AGENTS = {',
    pyAgents,
    '}',
    '',
    'client = anthropic.Anthropic()  # set ANTHROPIC_API_KEY env var',
    '',
    'def chat_with_agent(agent_id, user_message, history=None):',
    '    system_prompt = AGENTS[agent_id]',
    '    messages = list(history or [])',
    '    messages.append({"role": "user", "content": user_message})',
    '    response = client.messages.create(',
    '        model="claude-sonnet-4-6",',
    '        max_tokens=2048,',
    '        system=system_prompt,',
    '        messages=messages',
    '    )',
    '    return response.content[0].text',
    '',
    'if __name__ == "__main__":',
    '    agent_id = "' + firstId + '"',
    '    print(f"Chatting with: {agent_id}\\n")',
    '    reply = chat_with_agent(agent_id, "Hello! What can you help me with?")',
    '    print(f"Agent: {reply}")',
    ''
  ].join('\n');
  zip.file('examples/python_example.py', pyCode);

  // ── examples/node_example.mjs ─────────────────────────────
  const jsAgents = generatedAgents.map(a =>
    '  "' + a.id + '": fs.readFileSync(path.join(__dirname, "..", "agent-' + a.id + '.md"), "utf8"),'
  ).join('\n');
  const jsCode = [
    '// ' + currentTopic + ' — AgentSpark Team',
    '// npm install @anthropic-ai/sdk',
    '',
    'import Anthropic from "@anthropic-ai/sdk";',
    'import fs from "fs";',
    'import path from "path";',
    'import { fileURLToPath } from "url";',
    '',
    'const __dirname = path.dirname(fileURLToPath(import.meta.url));',
    '',
    'const AGENTS = {',
    jsAgents,
    '};',
    '',
    'const client = new Anthropic(); // set ANTHROPIC_API_KEY env var',
    '',
    'async function chatWithAgent(agentId, userMessage, history = []) {',
    '  const systemPrompt = AGENTS[agentId];',
    '  const messages = [...history, { role: "user", content: userMessage }];',
    '  const response = await client.messages.create({',
    '    model: "claude-sonnet-4-6", max_tokens: 2048,',
    '    system: systemPrompt, messages',
    '  });',
    '  return response.content[0].text;',
    '}',
    '',
    'const agentId = "' + firstId + '";',
    'console.log(`Chatting with: ${agentId}\\n`);',
    'const reply = await chatWithAgent(agentId, "Hello! What can you help me with?");',
    'console.log(`Agent: ${reply}`);',
    ''
  ].join('\n');
  zip.file('examples/node_example.mjs', jsCode);

  // ── Generate and trigger download ────────────────────────
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agentspark-' + currentTopic.toLowerCase().replace(/\s+/g,'-') + '.zip';
  a.click();
  showNotif(lang==='en' ? '✓ ZIP downloaded! Includes Python & Node.js examples.' : '✓ ZIP pobrany z przykładami Python i Node.js!');
  trackEvent('export_zip', {
    success: true,
    agents: generatedAgents.length,
    files: Object.keys(generatedFiles || {}).length
  });
}

// ─── MARKDOWN RENDERER ───────────────────────────────────
function renderMarkdown(md) {
  if(!md) return '';

  // Step 1: Extract fenced code blocks and inline code before ANY other processing
  // so that their content is never HTML-escaped or regex-mangled
  const codeBlocks = [];
  const inlineCodes = [];

  let text = md
    // Fenced code blocks: save content raw, replace with placeholder
    .replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const escaped = code.trim()
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
      return `\x02CODE_BLOCK_${idx}\x03`;
    })
    // Inline code: save raw, replace with placeholder
    .replace(/`([^`\n]+)`/g, (_, code) => {
      const escaped = code
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const idx = inlineCodes.length;
      inlineCodes.push(`<code>${escaped}</code>`);
      return `\x02INLINE_CODE_${idx}\x03`;
    });

  // Step 2: Escape remaining HTML in normal text
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Step 3: Apply markdown transformations
  text = text
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic (skip lone asterisks used as list bullets)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^\s*[-+] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Step 4: Line-by-line block wrapping — prevents paragraph text from being
  // swallowed into <ul> when it appears in the same \n\n block as list items
  const outLines = [];
  let inList = false;
  let paraAcc = [];

  const flushPara = () => {
    if (paraAcc.length) {
      outLines.push('<p>' + paraAcc.join('<br>') + '</p>');
      paraAcc = [];
    }
  };
  const flushList = () => {
    if (inList) { outLines.push('</ul>'); inList = false; }
  };

  text.split('\n').forEach(rawLine => {
    const line = rawLine.trim();

    if (!line) {
      flushPara();
      flushList();
      return;
    }

    // Block-level tags / placeholders — emit as-is
    if (line.startsWith('<h')      || line.startsWith('<pre')       ||
        line.startsWith('<hr')     || line.startsWith('<blockquote') ||
        line.startsWith('\x02CODE_BLOCK_')) {
      flushPara();
      flushList();
      outLines.push(line);
      return;
    }

    // List item
    if (line.startsWith('<li>')) {
      flushPara();
      if (!inList) { outLines.push('<ul>'); inList = true; }
      outLines.push(line);
      return;
    }

    // Regular text
    flushList();
    paraAcc.push(line);
  });

  flushPara();
  flushList();

  text = outLines.join('\n');

  // Step 5: Restore code placeholders
  codeBlocks.forEach((html, i) => {
    text = text.replace(`\x02CODE_BLOCK_${i}\x03`, html);
  });
  inlineCodes.forEach((html, i) => {
    text = text.replace(`\x02INLINE_CODE_${i}\x03`, html);
  });

  return text;
}

// ─── FILE PREVIEW MODAL ───────────────────────────────────
function previewFile(filename) {
  const content = generatedFiles[filename];
  if(!content) return;

  currentModalFile = filename;
  currentModalTab = 'preview';

  document.getElementById('modal-title').textContent = filename;
  document.getElementById('modal-filesize').textContent =
    `${(new Blob([content]).size / 1024).toFixed(1)} KB`;

  // Render both panes
  document.getElementById('modal-preview-pane').innerHTML = renderMarkdown(content);
  document.getElementById('modal-raw-pane').textContent = content;

  // Show preview by default
  switchModalTab('preview');

  document.getElementById('modal').classList.add('open');
}

function switchModalTab(tab) {
  currentModalTab = tab;
  const previewPane = document.getElementById('modal-preview-pane');
  const rawPane = document.getElementById('modal-raw-pane');
  const tabPreview = document.getElementById('tab-preview');
  const tabRaw = document.getElementById('tab-raw');

  if(tab === 'preview') {
    previewPane.style.display = 'block';
    rawPane.style.display = 'none';
    tabPreview.classList.add('active');
    tabRaw.classList.remove('active');
  } else {
    previewPane.style.display = 'none';
    rawPane.style.display = 'block';
    tabPreview.classList.remove('active');
    tabRaw.classList.add('active');
  }
}

function downloadCurrentFile() {
  if(!currentModalFile || !generatedFiles[currentModalFile]) return;
  const blob = new Blob([generatedFiles[currentModalFile]], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = currentModalFile;
  a.click();
  showNotif(`✓ ${currentModalFile} downloaded`);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// ─── MARKDOWN BROWSER (all files) ─────────────────────────
function openMarkdownPreview() {
  if(!Object.keys(generatedFiles).length) {
    showNotif(lang==='en' ? '⚠ No files yet — generate a team first' : '⚠ Brak plików — najpierw wygeneruj zespół', true);
    return;
  }
  const modal = document.getElementById('md-browser-modal');
  modal.classList.add('open');

  const mdFiles = Object.keys(generatedFiles).filter(f => f.endsWith('.md'));
  const sidebar = document.getElementById('md-browser-sidebar');
  sidebar.innerHTML = '';

  // File groups
  const groups = [
    { label: lang==='en' ? '📋 Config' : '📋 Konfiguracja', files: mdFiles.filter(f => f === 'README.md' || f === 'team-config.md') },
    { label: lang==='en' ? '⚙️ Agents' : '⚙️ Agenci', files: mdFiles.filter(f => f.startsWith('agent-')) },
    { label: lang==='en' ? '🎯 Skills' : '🎯 Umiejętności', files: mdFiles.filter(f => f.startsWith('skill-')) },
  ];

  groups.forEach(group => {
    if(!group.files.length) return;

    const groupLabel = document.createElement('div');
    groupLabel.style.cssText = 'font-size:0.6rem;font-family:"Space Mono",monospace;color:var(--muted);padding:0.6rem 1rem 0.3rem;letter-spacing:0.1em;text-transform:uppercase;';
    groupLabel.textContent = group.label;
    sidebar.appendChild(groupLabel);

    group.files.forEach(f => {
      const item = document.createElement('button');
      item.style.cssText = `
        display:block;width:100%;text-align:left;
        background:none;border:none;border-left:2px solid transparent;
        color:var(--muted);padding:0.5rem 1rem;
        font-family:'Space Mono',monospace;font-size:0.68rem;
        cursor:pointer;transition:all 0.15s;line-height:1.4;
        word-break:break-all;
      `;
      item.textContent = f;
      item.dataset.file = f;
      item.onmouseenter = () => { if(f !== mdBrowserActiveFile) item.style.color = 'var(--text)'; };
      item.onmouseleave = () => { if(f !== mdBrowserActiveFile) item.style.color = 'var(--muted)'; };
      item.onclick = () => selectMdBrowserFile(f);
      sidebar.appendChild(item);
    });
  });

  // Select first file
  if(mdFiles.length > 0) {
    selectMdBrowserFile('README.md' in generatedFiles ? 'README.md' : mdFiles[0]);
  }
}

function selectMdBrowserFile(filename) {
  mdBrowserActiveFile = filename;
  const content = generatedFiles[filename] || '';

  // Update sidebar active state
  document.querySelectorAll('#md-browser-sidebar button').forEach(btn => {
    const isActive = btn.dataset.file === filename;
    btn.style.borderLeftColor = isActive ? 'var(--accent)' : 'transparent';
    btn.style.color = isActive ? 'var(--accent)' : 'var(--muted)';
    btn.style.background = isActive ? 'rgba(242,185,13,0.06)' : 'none';
  });

  document.getElementById('md-browser-rendered').innerHTML = renderMarkdown(content);
  document.getElementById('md-browser-active-file').textContent =
    `${filename} · ${(new Blob([content]).size / 1024).toFixed(1)} KB`;

  // Scroll content pane to top
  const contentPane = document.getElementById('md-browser-content');
  contentPane.scrollTop = 0;
}

function closeMdBrowser() {
  document.getElementById('md-browser-modal').classList.remove('open');
}

async function downloadAllMd() {
  if(typeof JSZip === 'undefined') {
    showNotif('JSZip not loaded', true); return;
  }
  const zip = new JSZip();
  Object.entries(generatedFiles)
    .filter(([name]) => name.endsWith('.md'))
    .forEach(([name, content]) => zip.file(name, content));

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agentspark-docs-${currentTopic.toLowerCase().replace(/\s+/g,'-')}.zip`;
  a.click();
  showNotif(lang === 'en' ? '✓ Docs ZIP downloaded!' : '✓ Docs ZIP pobrany!');
}

// ─── CHAT HELPERS ─────────────────────────────────────────
function sanitizeRichText(input) {
  const allowed = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'CODE', 'PRE', 'BR', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3']);
  const template = document.createElement('template');
  template.innerHTML = String(input || '');

  const nodes = [...template.content.querySelectorAll('*')];
  nodes.forEach(node => {
    if (!allowed.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent || ''));
      return;
    }

    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }
      if (name === 'style' || name === 'srcdoc') {
        node.removeAttribute(attr.name);
        return;
      }
      if (node.tagName !== 'A' && (name === 'href' || name === 'target' || name === 'rel')) {
        node.removeAttribute(attr.name);
        return;
      }
      if (node.tagName === 'A' && name === 'href') {
        const safeHref = /^(https?:|mailto:)/i.test(value);
        if (!safeHref) node.removeAttribute('href');
        else {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });
  });
  return template.innerHTML;
}

function addMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const cleanText = text.replace('[INTERVIEW_COMPLETE]', '').trim();
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = role === 'ai' ? '⚡ AgentSpark' : (lang==='en'?'You':'Ty');
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  // User messages are plain text; AI messages pass through strict HTML sanitizer.
  if(role === 'user') {
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
  const container = document.getElementById('chat-messages');
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
  const el = document.getElementById('typing-indicator');
  if(el) el.remove();
}

// ─── PROGRESS ─────────────────────────────────────────────
function renderProgressSteps(activeIndex) {
  const container = document.getElementById('progress-steps');
  container.innerHTML = '';
  t('progressSteps').forEach((label, i) => {
    const div = document.createElement('div');
    div.className = `step ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}`;
    div.innerHTML = `<div class="step-num">${i < activeIndex ? '✓' : i+1}</div><span>${label}</span>`;
    container.appendChild(div);
  });
  // iOS progress bar update
  const iosBar = document.getElementById('ios-progress-bar');
  if (iosBar) {
    const steps = t('progressSteps');
    iosBar.innerHTML = steps.map((_, i) =>
      `<div class="ios-progress-segment ${i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''}"></div>`
    ).join('');
  }
  // iOS step counter label
  const stepLabel = document.getElementById('ios-chat-step-label');
  if (stepLabel) stepLabel.textContent = `${activeIndex + 1}/${t('progressSteps').length}`;
}

// ─── AI MODELS & ORCHESTRATION ─────────────────────────────
const MODEL_KEY_HINTS = {
  'gemini':    { label:'Gemini API Key', url:'https://aistudio.google.com/apikey' },
  'openai':    { label:'OpenAI API Key', url:'https://platform.openai.com/api-keys' },
  'mistral':   { label:'Mistral API Key', url:'https://console.mistral.ai/api-keys' },
  'groq':      { label:'Groq API Key', url:'https://console.groq.com/keys' },
  'anthropic': { label:'Anthropic API Key', url:'https://console.anthropic.com/settings/keys' },
};

async function callSingleModel(m, key, systemInstruction, userMessage, _traceLabel, multiTurnMessages, onChunk) {
  const provider = m.provider || 'gemini';
  const url = m.endpoint;
  const isGemini = provider === 'gemini';
  const isAnthropic = provider === 'anthropic';
  
  const headers = { 'Content-Type': 'application/json' };
  let body = {};

  if (isGemini) {
    // Determine endpoint for streaming vs regular
    const finalUrl = onChunk 
      ? `${url.replace(':generateContent', ':streamGenerateContent')}?key=${key}&alt=sse`
      : `${url}?key=${key}`;
      
    body = {
      contents: multiTurnMessages ? multiTurnMessages : [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    };
    if(systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

    try {
      const response = await fetch(finalUrl, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Gemini Error ${response.status}: ${errTxt}`);
      }

      if (onChunk) {
        // STREAMING HANDLING FOR GEMINI
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullText += text;
                  onChunk(text);
                }
              } catch (e) { /* ignore parse errors for partial chunks */ }
            }
          }
        }
        return fullText;
      } else {
        // REGULAR HANDLING
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch (e) { throw e; }

  } else if (isAnthropic) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true'; // Dev only

    const messages = multiTurnMessages || [{ role: 'user', content: userMessage }];
    body = {
      model: m.model,
      messages: messages,
      system: systemInstruction,
      max_tokens: 2048,
      stream: !!onChunk
    };

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Anthropic Error ${response.status}: ${errTxt}`);
    }

    if (onChunk) {
      // STREAMING FOR ANTHROPIC
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventData.type === 'content_block_delta' && eventData.delta?.text) {
                fullText += eventData.delta.text;
                onChunk(eventData.delta.text);
              }
            } catch(e) {}
          }
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.content?.[0]?.text || '';
    }

  } else {
    // OpenAI / Mistral / Groq
    headers['Authorization'] = `Bearer ${key}`;
    const messages = multiTurnMessages || [
      { role: 'system', content: systemInstruction || 'You are a helpful assistant.' },
      { role: 'user', content: userMessage }
    ];
    body = {
      model: m.model,
      messages: messages,
      temperature: 0.7,
      stream: !!onChunk
    };

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`${provider} Error ${response.status}: ${errTxt}`);
    }

    if (onChunk) {
      // STREAMING FOR OPENAI/GROQ
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.choices?.[0]?.delta?.content;
              if (text) {
                fullText += text;
                onChunk(text);
              }
            } catch(e) {}
          }
        }
      }
      return fullText;
    } else {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }
}

// Wrapper with retries
async function callGemini(systemInstruction, userMessage, _traceLabel = 'Task', multiTurnMessages = null, onChunk = null) {
// ...existing code...
// Retry logic handles static responses only for now to keep it simple, 
// unless we refactor retry to handle stream interruption.
// For now, if streaming fails, it throws and user can retry manually.
  try {
    return await callSingleModel(selectedModel, apiKey, systemInstruction, userMessage, _traceLabel, multiTurnMessages, onChunk);
  } catch (e) {
    console.warn(`Attempt 1 failed: ${e.message}`);
    // If it was a stream call, we probably can't retry seamlessly mid-stream.
    // But for a fresh start:
    if (!navigator.onLine) throw new Error('Offline');
    // Simple retry for non-streaming, or if streaming failed immediately
    return await callSingleModel(selectedModel, apiKey, systemInstruction, userMessage, _traceLabel, multiTurnMessages, onChunk);
  }
}
// ─── AI API (multi-provider + automatic fallback) ─────────

// Cost per 1M tokens (input+output blended estimate) in USD
// Sources: official pricing pages, Jan 2025
const MODEL_COST_PER_1M = {
  // Gemini
  'gemini-2.5-flash-preview-05-20': 0.30,
  'gemini-2.5-pro-preview-06-05':   3.50,
  'gemini-2.0-flash':       0.30,
  'gemini-2.0-flash-exp':   0.00,
  'gemini-1.5-flash':       0.15,
  'gemini-1.5-pro':         3.50,
  // OpenAI
  'gpt-4o':                 7.50,
  'gpt-4o-mini':            0.30,
  'gpt-4-turbo':            15.00,
  // Anthropic
  'claude-sonnet-4-6':      4.50,
  'claude-opus-4-6':       22.50,
  'claude-opus-4-5':       22.50,
  'claude-sonnet-4-5':      4.50,
  'claude-haiku-4-5-20251001': 0.40,
  // Mistral
  'mistral-large-latest':   3.00,
  'ministral-14b-latest':   0.40,
  'ministral-8b-latest':    0.10,
  'ministral-3b-latest':    0.04,
  'mistral-small-latest':   0.30,
  'open-mistral-nemo':      0.15,
  // Groq (free tier but noting cost)
  'llama-3.3-70b-versatile': 0.00,
  'llama-3.1-8b-instant':    0.00,
  'gemma2-9b-it':            0.00,
};

function _estimateCost(model, tokens) {
  if (!tokens || tokens <= 0) return null;
  const rate = MODEL_COST_PER_1M[model];
  if (rate === undefined) return null;
  return (tokens / 1_000_000) * rate;
}

function _formatCost(usd) {
  if (usd === null || usd === undefined) return null;
  if (usd === 0) return '$0.00';
  if (usd < 0.000001) return '<$0.000001';
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}


const FALLBACK_CHAINS = {
  gemini: [
    { provider:'gemini', model:'gemini-2.5-flash-preview-05-20', endpoint:'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}', tag:'gemini', label:'Gemini 2.5 Flash' },
    { provider:'gemini', model:'gemini-2.0-flash',               endpoint:'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}', tag:'gemini', label:'Gemini 2.0 Flash' },
    { provider:'gemini', model:'gemini-1.5-flash',               endpoint:'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}', tag:'gemini', label:'Gemini 1.5 Flash' },
  ],
  openai: [
    { provider:'openai', model:'gpt-4o',      endpoint:'https://api.openai.com/v1/chat/completions', tag:'openai', label:'GPT-4o' },
    { provider:'openai', model:'gpt-4o-mini', endpoint:'https://api.openai.com/v1/chat/completions', tag:'openai', label:'GPT-4o mini' },
    { provider:'openai', model:'gpt-4-turbo', endpoint:'https://api.openai.com/v1/chat/completions', tag:'openai', label:'GPT-4 Turbo' },
  ],
  anthropic: [
    { provider:'anthropic', model:'claude-sonnet-4-6', endpoint:'https://api.anthropic.com/v1/messages', tag:'anthropic', label:'Claude Sonnet 4.6' },
    { provider:'anthropic', model:'claude-haiku-4-5-20251001', endpoint:'https://api.anthropic.com/v1/messages', tag:'anthropic', label:'Claude Haiku 4.5' },
  ],
  mistral: [
    { provider:'openai', model:'mistral-large-latest',  endpoint:'https://api.mistral.ai/v1/chat/completions', tag:'mistral', label:'Mistral Large' },
    { provider:'openai', model:'mistral-small-latest',  endpoint:'https://api.mistral.ai/v1/chat/completions', tag:'mistral', label:'Mistral Small' },
    { provider:'openai', model:'open-mistral-nemo',     endpoint:'https://api.mistral.ai/v1/chat/completions', tag:'mistral', label:'Mistral Nemo' },
  ],
  groq: [
    { provider:'openai', model:'llama-3.3-70b-versatile', endpoint:'https://api.groq.com/openai/v1/chat/completions', tag:'groq', label:'Llama 3.3 70B' },
    { provider:'openai', model:'llama-3.1-8b-instant',    endpoint:'https://api.groq.com/openai/v1/chat/completions', tag:'groq', label:'Llama 3.1 8B' },
    { provider:'openai', model:'gemma2-9b-it',            endpoint:'https://api.groq.com/openai/v1/chat/completions', tag:'groq', label:'Gemma2 9B' },
  ],
};

// Errors that justify trying a fallback (rate limit, overload, server error)
function isFallbackable(status, message) {
  if([429, 500, 502, 503, 504, 529].includes(status)) return true;
  const msg = (message || '').toLowerCase();
  return msg.includes('rate limit') || msg.includes('overloaded') ||
         msg.includes('capacity') || msg.includes('timeout') ||
         msg.includes('quota') || msg.includes('unavailable');
}

// Update typing indicator text without replacing the dots
function setTypingStatus(text) {
  const el = document.getElementById('typing-indicator');
  if(!el) return;
  let label = el.querySelector('.typing-status-label');
  if(!label) {
    label = document.createElement('div');
    label.className = 'typing-status-label';
    label.style.cssText = 'font-size:0.68rem;font-family:"Space Mono",monospace;color:var(--muted);margin-top:0.4rem;';
    el.appendChild(label);
  }
  label.textContent = text;
}

// Single model call — throws with {status, message} on failure
async function callSingleModel(m, key, systemInstruction, userMessage, _traceLabel, multiTurnMessages) {
  const { provider, model, endpoint } = m;
  const t0 = Date.now();

  // Register span as pending
  const span = {
    id: traceSpans.length,
    label: _traceLabel || 'API Call',
    model: m.label || model,
    provider,
    startMs: t0,
    endMs: null,
    durationMs: null,
    status: 'pending',   // pending | ok | fallback | error
    isFallback: false,
    tokens: null,
    error: null,
  };
  if(!traceSessionStart) traceSessionStart = t0;
  traceSpans.push(span);
  renderTraceLive();  // show pending bar immediately

  const finalize = (status, tokens, error) => {
    span.endMs = Date.now();
    span.durationMs = span.endMs - span.startMs;
    span.status = status;
    span.tokens = tokens || null;
    span.cost   = tokens ? _estimateCost(m.model, tokens) : null;
    span.error = error || null;
    renderTraceLive();
  };

  try {
    let result, tokens = null;

    if(provider === 'gemini') {
      const url = endpoint.replace('{model}', model).replace('{key}', key);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: multiTurnMessages
            ? multiTurnMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
              }))
            : [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
        })
      });
      if(!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error?.message || `Gemini error ${res.status}`);
        e.status = res.status;
        finalize('error', null, e.message);
        throw e;
      }
      const data = await res.json();
      tokens = data.usageMetadata
        ? (data.usageMetadata.totalTokenCount || null)
        : null;
      result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    else if(provider === 'openai') {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: multiTurnMessages
            ? [{ role:'system', content: systemInstruction }, ...multiTurnMessages]
            : [{ role:'system', content: systemInstruction }, { role:'user', content: userMessage }],
          temperature: 0.8, max_tokens: 4096
        })
      });
      if(!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error?.message || `API error ${res.status}`);
        e.status = res.status;
        finalize('error', null, e.message);
        throw e;
      }
      const data = await res.json();
      tokens = data.usage?.total_tokens || null;
      result = data.choices?.[0]?.message?.content || '';
    }

    else if(provider === 'anthropic') {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          system: systemInstruction,
          messages: multiTurnMessages || [{ role: 'user', content: userMessage }],
          max_tokens: 4096
        })
      });
      if(!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error?.message || `Anthropic error ${res.status}`);
        e.status = res.status;
        finalize('error', null, e.message);
        throw e;
      }
      const data = await res.json();
      tokens = data.usage ? (data.usage.input_tokens + data.usage.output_tokens) : null;
      result = data.content?.[0]?.text || '';
    }

    else {
      const e = new Error(`Unknown provider: ${provider}`);
      finalize('error', null, e.message);
      throw e;
    }

    finalize('ok', tokens, null);
    return result;

  } catch(err) {
    // Only finalize if not already done inside branches
    if(span.status === 'pending') finalize('error', null, err.message);
    throw err;
  }
}

// Main entry — tries selected model, then falls back through chain
async function callGemini(systemInstruction, userMessage, traceLabel, multiTurnMessages) {
  const key = apiKey || document.getElementById('apiKeyInput')?.value?.trim();
  if(!key) throw new Error('No API key — please enter your key');

  // Build attempt list: selected model first, then rest of its chain
  const chain = FALLBACK_CHAINS[selectedModel.tag] || [];
  // Put selected model at front, deduplicate by model name
  const primary = { ...selectedModel };
  const rest = chain.filter(m => m.model !== primary.model);
  const attempts = [primary, ...rest];

  let lastError = null;
  for(let i = 0; i < attempts.length; i++) {
    const m = attempts[i];
    const spanLabel = traceLabel
      ? (i > 0 ? `${traceLabel} (fallback)` : traceLabel)
      : (i > 0 ? `Fallback #${i}` : 'API Call');

    if(i > 0) {
      setTypingStatus(`⚠ ${attempts[i-1].label || attempts[i-1].model} failed — trying ${m.label || m.model}…`);
      await new Promise(r => setTimeout(r, 600)); // brief pause before retry
    }
    try {
      const result = await callSingleModel(m, key, systemInstruction, userMessage, spanLabel, multiTurnMessages);

      // If we used a fallback, mark the span and notify user
      if(i > 0) {
        const span = traceSpans[traceSpans.length - 1];
        if(span) { span.status = 'fallback'; span.isFallback = true; }
        renderTraceLive();
        const modelName = m.label || m.model;
        setTimeout(() => showNotif(
          lang === 'en'
            ? `↩ Fell back to ${modelName}`
            : `↩ Przełączono na ${modelName}`
        ), 300);
        // Update header badge to reflect actual model used
        const badgeEl = document.getElementById('headerModelBadge');
        if(badgeEl) badgeEl.textContent = m.model + ' (fallback)';
      }
      setTypingStatus('');
      return result;
    } catch(err) {
      lastError = err;
      const fallbackable = isFallbackable(err.status, err.message);
      // If not a fallbackable error (e.g. 401 auth), fail immediately
      if(!fallbackable) {
        console.warn(`[AgentSpark] Non-fallbackable error on ${m.model}:`, err.message);
        break;
      }
      console.warn(`[AgentSpark] Fallback triggered (${m.model}): ${err.message}`);
    }
  }

  setTypingStatus('');
  throw lastError || new Error('All models failed');
}

// ─── UTILS ────────────────────────────────────────────────
// ─── COLLAPSIBLE API SETUP ────────────────────────────────
let _apiSetupOpen = true; // open by default until key entered

function toggleApiSetup(forceState) {
  const body = document.getElementById('api-setup-body');
  const chevron = document.getElementById('api-setup-chevron');
  if (!body) return;
  if (forceState !== undefined) {
    _apiSetupOpen = forceState;
  } else {
    _apiSetupOpen = !_apiSetupOpen;
  }
  body.classList.toggle('open', _apiSetupOpen);
  if (chevron) chevron.classList.toggle('open', _apiSetupOpen);
}

function _updateApiKeyDot(status) {
  // status: 'ready' | 'error' | ''
  const dot = document.getElementById('api-key-dot');
  const label = document.getElementById('api-setup-toggle-label');
  if (!dot) return;
  dot.className = 'api-key-dot' + (status ? ' ' + status : '');
  if (status === 'ready' && label) {
    const sel = document.getElementById('modelSelect');
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
  const grid = document.getElementById('agents-grid');
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

function _showGeneratingState(stepIndex) {
  // stepIndex 0=interviewing, 1=generating, 2=writing files, 3=done
  const steps = [
    lang === 'en' ? 'Analyzing your requirements…' : 'Analizuję wymagania…',
    lang === 'en' ? 'Designing agent team…' : 'Projektuję zespół agentów…',
    lang === 'en' ? 'Writing configuration files…' : 'Zapisuję pliki konfiguracyjne…',
    lang === 'en' ? 'Finalizing…' : 'Finalizuję…',
  ];
  const grid = document.getElementById('agents-grid');
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
    <div class="generating-label">${lang === 'en' ? 'Building your AI team…' : 'Buduję Twój zespół AI…'}</div>
    <div class="generating-steps">${stepsHtml}</div>
  `;
  grid.innerHTML = '';
  grid.appendChild(overlay);
}

// ─── FAB (Floating Action Button) visibility ──────────────
function _syncFab() {
  const fab = document.getElementById('results-fab');
  if (!fab) return;
  const resultsActive = document.getElementById('screen-results')?.classList.contains('active');
  const shouldShow = resultsActive && generatedAgents.length > 0;
  fab.classList.toggle('fab-visible', shouldShow);
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  syncIosTabBar(name);
  _syncFab();
  _lastScreenName = name;
  trackEvent('screen_view', { success: true, screen: name });
}

// ── iOS Tab Bar Navigation ──────────────────────────────
function syncIosTabBar(screenName) {
  // Map screens to tabs
  const tabMap = {
    'topic':    'home',
    'gallery':  'gallery',
    'projects': 'projects',
    'chat':     'chat',
    'results':  'results',
  };
  const activeTab = tabMap[screenName] || 'home';

  // Show/hide contextual tabs
  const chatTab    = document.getElementById('tab-chat');
  const resultsTab = document.getElementById('tab-results');
  if (chatTab)    chatTab.style.display    = (screenName === 'chat' || screenName === 'results') ? '' : 'none';
  if (resultsTab) resultsTab.style.display = (screenName === 'results') ? '' : 'none';

  // Set active state
  document.querySelectorAll('.ios-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('tab-' + activeTab);
  if (activeBtn) activeBtn.classList.add('active');
}

function iosTabNav(tab) {
  if (tab === 'home')      showScreen('topic');
  else if (tab === 'gallery')   { showScreen('gallery'); initGallery(); }
  else if (tab === 'projects')  openProjectsScreen();
  else if (tab === 'chat')      showScreen('chat');
  else if (tab === 'results')   showScreen('results');
  else if (tab === 'settings')  openSettingsSheet();
}

function openSettingsSheet() {
  // Build settings as iOS action sheet
  let sheet = document.getElementById('ios-settings-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id = 'ios-settings-sheet';
    sheet.className = 'ios-sheet-overlay';
    sheet.innerHTML = `
      <div class="ios-sheet" style="max-height:80vh;">
        <div class="ios-sheet-handle"></div>
        <div class="ios-sheet-header">
          <span class="ios-sheet-title" id="settings-sheet-title">Settings</span>
          <button class="ios-sheet-close" onclick="document.getElementById('ios-settings-sheet').classList.remove('open')">✕</button>
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
            <div class="ios-list-item" onclick="setLang('en');document.getElementById('ios-settings-sheet').classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🇬🇧</div>
              <div style="flex:1"><div class="ios-list-label">English</div></div>
              <span id="settings-lang-en" style="color:var(--accent);font-size:0.9rem;">✓</span>
            </div>
            <div class="ios-list-item" onclick="setLang('pl');document.getElementById('ios-settings-sheet').classList.remove('open')">
              <div class="ios-list-icon" style="background:rgba(242,185,13,0.15);">🇵🇱</div>
              <div style="flex:1"><div class="ios-list-label">Polski</div></div>
              <span id="settings-lang-pl" style="color:var(--accent);font-size:0.9rem;display:none;">✓</span>
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
            <div class="ios-list-item" onclick="openImportModal();document.getElementById('ios-settings-sheet').classList.remove('open')">
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
  const isEn = lang === 'en';
  const langEn = document.getElementById('settings-lang-en');
  const langPl = document.getElementById('settings-lang-pl');
  if (langEn) langEn.style.display = isEn ? '' : 'none';
  if (langPl) langPl.style.display = !isEn ? '' : 'none';
  // Update theme label
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const themeLabel = document.getElementById('settings-theme-label');
  if (themeLabel) themeLabel.textContent = isDark
    ? tr('Switch to Light Mode', 'Przelacz na jasny motyw')
    : tr('Switch to Dark Mode', 'Przelacz na ciemny motyw');
  const titleEl = document.getElementById('settings-sheet-title');
  const appearanceEl = document.getElementById('settings-appearance-label');
  const languageEl = document.getElementById('settings-language-label');
  const aboutEl = document.getElementById('settings-about-label');
  const importEl = document.getElementById('settings-import-label');
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
  const layout = document.querySelector('.chat-layout');
  const btn = document.getElementById('sidebar-toggle-btn');
  if (layout) layout.classList.toggle('sidebar-collapsed', _sidebarCollapsed);
  if (btn) btn.textContent = _sidebarCollapsed ? '◀' : '▶';
  localStorage.setItem('agentspark-sidebar-collapsed', _sidebarCollapsed ? '1' : '0');
}
// Restore sidebar state on load
(function() {
  window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('agentspark-sidebar-collapsed') === '1') {
      _sidebarCollapsed = true;
      const layout = document.querySelector('.chat-layout');
      const btn = document.getElementById('sidebar-toggle-btn');
      if (layout) layout.classList.add('sidebar-collapsed');
      if (btn) btn.textContent = '◀';
    }
  });
})();

function renderResults() {
  // Alias used when loading a project — renders the results screen UI
  showResults(false);
}

function restart() {
  // If there's unsaved work and a project in progress, offer to save
  if (generatedAgents.length && _currentProjectId === null) {
    const save = window.confirm(
      lang === 'en'
        ? 'Save current project before starting over?'
        : 'Zapisać bieżący projekt przed rozpoczęciem od nowa?'
    );
    if (save) { saveCurrentProject(false); }
  }
  _currentProjectId = null;
  chatHistory = [];
  generatedAgents = [];
  generatedFiles = {};
  refineHistory = [];
  refineSnapshots = [];
  versionHistory = [];
  versionPanelOpen = false;
  traceSpans = [];
  tracePanelOpen = false;
  traceSessionStart = null;
  isRefining = false;
  selectedRefineAction = null;
  questionCount = 0;
  conversationState = 'interview';
  currentModalFile = '';
  mdBrowserActiveFile = '';
  document.getElementById('chat-messages').innerHTML = '';
  clearOptions();
  if(document.getElementById('refine-history')) document.getElementById('refine-history').innerHTML = '';
  document.getElementById('refine-panel').style.display = 'none';
  document.getElementById('version-panel').style.display = 'none';
  currentLevel = 'iskra';
  MAX_QUESTIONS = 4;
  if(graphAnimFrame) { cancelAnimationFrame(graphAnimFrame); graphAnimFrame = null; }
  graphNodes = []; graphEdges = [];
  document.getElementById('scoring-panel').style.display = 'none';
  document.getElementById('trace-panel').style.display = 'none';
  document.getElementById('graph-section').style.display = 'none';
  const gc = document.querySelector('.graph-container');
  if(gc) { const leg = gc.querySelector('.graph-legend'); if(leg) leg.remove(); }
  document.getElementById('instructions-section').style.display = 'none';
  document.getElementById('apiKeyHeader').style.display = 'none';
  showScreen('topic');
}

let notifTimeout;
function showNotif(msg, isError = false) {
  // Remove any existing toast with fade-out
  const old = document.querySelector('.notif');
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
  document.getElementById('trace-body').classList.toggle('open', tracePanelOpen);
  document.getElementById('trace-toggle-icon').classList.toggle('open', tracePanelOpen);
}

function renderTraceLive() {
  const panel = document.getElementById('trace-panel');
  if(!panel) return;

  if(!traceSpans.length) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  // Count badge
  const doneCount = traceSpans.filter(s => s.status !== 'pending').length;
  document.getElementById('trace-span-count').textContent = traceSpans.length;

  // Summary pills
  const pills = document.getElementById('trace-summary-pills');
  const totalMs = traceSpans.reduce((n, s) => n + (s.durationMs || 0), 0);
  const totalTok = traceSpans.reduce((n, s) => n + (s.tokens || 0), 0);
  const totalCost = traceSpans.reduce((n, s) => n + (s.cost || 0), 0);
  const hasCostData = traceSpans.some(s => s.cost !== null && s.cost !== undefined);
  const hasFallback = traceSpans.some(s => s.isFallback);
  const hasError    = traceSpans.some(s => s.status === 'error');
  const hasPending  = traceSpans.some(s => s.status === 'pending');
  pills.innerHTML = `
    <span class="trace-pill ${hasError ? 'error' : hasFallback ? 'warn' : 'ok'}">
      ${hasError ? '⚠ error' : hasFallback ? '↩ fallback' : '✓ ok'}
    </span>
    <span class="trace-pill">${(totalMs/1000).toFixed(1)}s total</span>
    ${totalTok ? `<span class="trace-pill">${totalTok.toLocaleString()} tokens</span>` : ''}
    ${hasCostData && totalCost > 0 ? `<span class="trace-pill" style="color:var(--success);border-color:rgba(124,196,42,0.3);background:rgba(124,196,42,0.07);" title="Estimated API cost for this session">~${_formatCost(totalCost)}</span>` : ''}
    ${hasPending ? `<span class="trace-pill">⏳ running…</span>` : ''}
  `;

  // Span rows
  const spansEl = document.getElementById('trace-spans');

  // Calculate timeline scale
  const sessionStart = traceSessionStart || (traceSpans[0]?.startMs || Date.now());
  const sessionEnd   = Math.max(...traceSpans.map(s => s.endMs || Date.now()));
  const sessionRange = Math.max(sessionEnd - sessionStart, 1);

  spansEl.innerHTML = '';
  traceSpans.forEach(s => {
    const left  = ((s.startMs - sessionStart) / sessionRange) * 100;
    const width = s.durationMs
      ? Math.max((s.durationMs / sessionRange) * 100, 1.5)
      : Math.max(((Date.now() - s.startMs) / sessionRange) * 100, 3);

    const fillClass = s.status === 'ok'       ? 'fill-ok'
      : s.status === 'fallback' ? 'fill-fallback'
      : s.status === 'error'   ? 'fill-error'
      : 'fill-pending';

    const badgeClass = s.status === 'ok'       ? 'badge-ok'
      : s.status === 'fallback' ? 'badge-fallback'
      : s.status === 'error'   ? 'badge-error'
      : 'badge-pending';

    const badgeText = s.status === 'ok'       ? 'OK'
      : s.status === 'fallback' ? '↩ FALLBACK'
      : s.status === 'error'   ? 'ERROR'
      : '…';

    const durText = s.durationMs
      ? s.durationMs >= 1000 ? `${(s.durationMs/1000).toFixed(1)}s` : `${s.durationMs}ms`
      : '…';

    const tokenText = s.tokens ? s.tokens.toLocaleString() : '–';

    // ── Improved label parsing (#9) ───────────────────────
    const rawLabel = s.label || 'API Call';
    let phase = rawLabel, detail = '';
    const dotSep   = rawLabel.indexOf(' · ');
    const colonSep = rawLabel.indexOf(': ');
    if (dotSep !== -1) {
      phase  = rawLabel.slice(0, dotSep);
      detail = rawLabel.slice(dotSep + 3);
    } else if (colonSep !== -1) {
      phase  = rawLabel.slice(0, colonSep);
      detail = rawLabel.slice(colonSep + 2);
    }

    // Shorten model name if too long
    const modelDisplay = s.model || '';
    const modelShort   = modelDisplay.length > 22 ? modelDisplay.slice(0, 20) + '…' : modelDisplay;

    // Relative start time for tooltip
    const relSec  = ((s.startMs - sessionStart) / 1000).toFixed(2);
    const absTime = new Date(s.startMs).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });

    // Tooltip
    const tooltipLines = [
      `Step: ${rawLabel}`,
      `Model: ${modelDisplay}`,
      `Started: ${absTime} (+${relSec}s into session)`,
      s.durationMs ? `Duration: ${durText}` : 'Duration: pending…',
      s.tokens     ? `Tokens: ${s.tokens.toLocaleString()}` : '',
      s.cost !== null && s.cost !== undefined ? `Est. cost: ${_formatCost(s.cost)}` : '',
      s.isFallback ? `↩ Fell back from primary model` : '',
      s.error      ? `Error: ${s.error}` : '',
    ].filter(Boolean).join('\n');

    const row = document.createElement('div');
    row.className = 'trace-span';
    row.title     = tooltipLines;
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
  const footerEl = document.getElementById('trace-footer');
  const calls     = traceSpans.length;
  const errors    = traceSpans.filter(s => s.status === 'error').length;
  const fallbacks = traceSpans.filter(s => s.isFallback).length;
  const phases    = [...new Set(traceSpans.map(s => {
    const raw = s.label || '';
    const dot = raw.indexOf(' · ');
    return dot !== -1 ? raw.slice(0, dot) : raw.split(':')[0];
  }))];
  const avgDur = calls ? Math.round(totalMs / calls) : 0;
  footerEl.innerHTML = `
    <span><strong>${calls}</strong> ${lang==='en' ? (calls===1 ? 'call' : 'calls') : 'wywołań'}</span>
    <span><strong>${(totalMs/1000).toFixed(1)}s</strong> ${lang==='en'?'total':'łącznie'}</span>
    ${totalTok ? `<span title="${lang==='en'?'Total tokens consumed':'Łączna liczba tokenów'}"><strong>${totalTok.toLocaleString()}</strong> tok</span>` : ''}
    ${hasCostData && totalCost > 0 ? `<span style="color:var(--success);font-weight:700;" title="${lang==='en'?'Estimated total API cost for this session (based on public pricing)':'Szacowany koszt API sesji'}">~${_formatCost(totalCost)}</span>` : ''}
    ${hasCostData && totalCost === 0 ? `<span style="color:var(--success);" title="Free tier model">free</span>` : ''}
    ${calls > 1 ? `<span style="color:var(--muted)">~${avgDur >= 1000 ? (avgDur/1000).toFixed(1)+'s' : avgDur+'ms'} ${lang==='en'?'avg/call':'śr/call'}</span>` : ''}
    ${fallbacks ? `<span title="${lang==='en'?'Model fallbacks used':'Użyte fallbacki modelu'}">↩ <strong>${fallbacks}</strong> ${lang==='en'?'fallback':'fallback'}</span>` : ''}
    ${errors ? `<span style="color:var(--accent2)" title="${lang==='en'?'Failed calls':'Nieudane wywołania'}">⚠ <strong>${errors}</strong> ${lang==='en'?'error':'błąd'}</span>` : ''}
    <span style="margin-left:auto;color:var(--muted);font-size:0.68rem;" title="${lang==='en'?'Session start time':'Czas startu sesji'}">${new Date(sessionStart).toLocaleTimeString()}</span>
  `;
}

// ─── VERSION HISTORY ──────────────────────────────────────

function renderVersionPanel() {
  const panel = document.getElementById('version-panel');
  const timeline = document.getElementById('version-timeline');
  const badge = document.getElementById('version-count-badge');
  const icon = document.getElementById('version-toggle-icon');

  const total = versionHistory.length;
  if(total === 0) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  badge.textContent = total;
  icon.className = 'version-toggle-icon' + (versionPanelOpen ? ' open' : '');
  timeline.className = 'version-timeline' + (versionPanelOpen ? ' open' : '');

  timeline.innerHTML = '';

  // Show newest first
  const reversed = [...versionHistory].reverse();

  reversed.forEach((v, ri) => {
    const isCurrentIdx = ri === 0;
    const origIdx = versionHistory.indexOf(v);           // index in versionHistory array

    const entry = document.createElement('div');
    entry.className = 'version-entry' + (isCurrentIdx ? ' current' : '') + (v.isOrigin ? ' origin' : '');

    // Diff tags
    const diffHtml = [
      ...v.diff.added.map(id =>
        `<span class="diff-tag diff-added">+${v.agentNames?.[id] || id}</span>`),
      ...v.diff.removed.map(id =>
        `<span class="diff-tag diff-removed">−${v.removedNames?.[id] || id}</span>`),
      ...v.diff.changed.map(id =>
        `<span class="diff-tag diff-changed">~${v.agentNames?.[id] || id}</span>`),
    ].join('');

    // Agent list preview
    const agentPreview = v.agents.map(a => a.name).join(', ');

    // Time label
    const timeLabel = formatVersionTime(v.ts);

    // Actions: can't restore current, can't diff origin
    const restoreBtn = !isCurrentIdx
      ? `<button class="version-btn restore-btn" onclick="restoreVersion(${origIdx})">↩ ${lang==='en'?'Restore':'Przywróć'}</button>`
      : `<span class="version-current-tag">CURRENT</span>`;

    const diffBtn = origIdx > 0
      ? `<button class="version-btn diff-btn" onclick="showDiffModal(${origIdx})">🔍 ${lang==='en'?'Diff':'Porównaj'}</button>`
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

function formatVersionTime(ts) {
  if(!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffM = Math.floor(diffMs / 60000);
  if(diffM < 1)  return lang==='en' ? 'just now' : 'przed chwilą';
  if(diffM < 60) return `${diffM}m ${lang==='en'?'ago':'temu'}`;
  const diffH = Math.floor(diffM / 60);
  if(diffH < 24) return `${diffH}h ${lang==='en'?'ago':'temu'}`;
  return d.toLocaleDateString();
}

function restoreVersion(idx) {
  if(idx < 0 || idx >= versionHistory.length) return;
  const v = versionHistory[idx];

  // Save current state as new version before restoring
  const alreadySaved = versionHistory[versionHistory.length - 1];
  // Don't double-save if idx is already last
  if(idx !== versionHistory.length - 1) {
    versionHistory.push({
      id: Date.now(),
      label: lang==='en' ? `Restored v${v.vNum}` : `Przywrócono v${v.vNum}`,
      ts: new Date(),
      agents: JSON.parse(JSON.stringify(v.agents)),
      files: JSON.parse(JSON.stringify(v.files)),
      diff: { added: [], removed: [], changed: [] },
      removedNames: {},
      agentNames: Object.fromEntries(v.agents.map(a => [a.id, a.name])),
      vNum: versionHistory.length + 1,
    });
  }

  generatedAgents = JSON.parse(JSON.stringify(v.agents));
  generatedFiles  = JSON.parse(JSON.stringify(v.files));

  showResults(true);
  buildGraphFromAgents();
  renderVersionPanel();

  showNotif(lang==='en'
    ? `↩ Restored to v${v.vNum}: "${v.label}"`
    : `↩ Przywrócono v${v.vNum}: "${v.label}"`);
}

async function downloadVersionZip(idx) {
  if(typeof JSZip === 'undefined') { showNotif('JSZip not loaded', true); return; }
  const v = versionHistory[idx];
  if(!v) return;
  const zip = new JSZip();
  Object.entries(v.files).forEach(([name, content]) => zip.file(name, content));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agentspark-v${v.vNum}-${currentTopic.toLowerCase().replace(/\s+/g,'-')}.zip`;
  a.click();
  showNotif(`✓ v${v.vNum} ZIP downloaded`);
}

function showDiffModal(idx) {
  if(idx < 1 || idx >= versionHistory.length) return;
  const vNew = versionHistory[idx];
  const vOld = versionHistory[idx - 1];

  const modal = document.getElementById('diff-modal');
  const title = document.getElementById('diff-modal-title');
  const body  = document.getElementById('diff-modal-body');

  title.textContent = lang==='en'
    ? `🔍 v${vOld.vNum} → v${vNew.vNum}: "${vNew.label}"`
    : `🔍 v${vOld.vNum} → v${vNew.vNum}: "${vNew.label}"`;

  const { added, removed, changed } = vNew.diff;

  let html = '';

  if(added.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:var(--success)">➕ ${lang==='en'?'Added Agents':'Dodani Agenci'} (${added.length})</div>
      ${added.map(id => {
        const a = vNew.agents.find(ag => ag.id === id);
        if(!a) return '';
        return `<div class="diff-agent-row row-added">
          <span class="row-icon">${a.emoji||'🤖'}</span>
          <div><div class="diff-agent-name">${a.name}</div><div class="diff-agent-role">${a.role||''}</div></div>
        </div>`;
      }).join('')}
    </div>`;
  }

  if(removed.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:var(--accent2)">🗑 ${lang==='en'?'Removed Agents':'Usunięci Agenci'} (${removed.length})</div>
      ${removed.map(id => {
        const a = vOld.agents.find(ag => ag.id === id);
        if(!a) return '';
        return `<div class="diff-agent-row row-removed">
          <span class="row-icon">${a.emoji||'🤖'}</span>
          <div><div class="diff-agent-name">${a.name}</div><div class="diff-agent-role">${a.role||''}</div></div>
        </div>`;
      }).join('')}
    </div>`;
  }

  if(changed.length) {
    html += `<div class="diff-section">
      <div class="diff-section-title" style="color:#ffd580">✏ ${lang==='en'?'Modified Agents':'Zmodyfikowani Agenci'} (${changed.length})</div>
      ${changed.map(id => {
        const aNew = vNew.agents.find(ag => ag.id === id);
        const aOld = vOld.agents.find(ag => ag.id === id);
        if(!aNew) return '';
        const descChanged = aOld && aOld.description !== aNew.description;
        const roleChanged = aOld && aOld.role !== aNew.role;
        return `<div class="diff-agent-row row-changed">
          <span class="row-icon">${aNew.emoji||'🤖'}</span>
          <div style="flex:1">
            <div class="diff-agent-name">${aNew.name}</div>
            ${roleChanged ? `<div class="diff-agent-role" style="color:#ffd580">Role: ${aOld.role} → ${aNew.role}</div>` : ''}
            ${descChanged ? `<div style="font-size:0.7rem;color:var(--muted);margin-top:0.25rem;line-height:1.4;">${aNew.description.slice(0,120)}${aNew.description.length>120?'…':''}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  if(!added.length && !removed.length && !changed.length) {
    html = `<div style="padding:2rem;text-align:center;color:var(--muted);font-family:'Space Mono',monospace;font-size:0.82rem;">
      ${lang==='en'?'No structural changes — metadata or descriptions updated.':'Brak zmian strukturalnych — zaktualizowano metadane lub opisy.'}
    </div>`;
  }

  // Agent count summary
  html = `<div style="display:flex;gap:1.5rem;padding:0 0 1.25rem;font-family:'Space Mono',monospace;font-size:0.72rem;color:var(--muted);border-bottom:1px solid var(--border);margin-bottom:1.25rem;">
    <span>${lang==='en'?'Before':'Przed'}: <strong style="color:var(--text)">${vOld.agents.length} ${lang==='en'?'agents':'agentów'}</strong></span>
    <span>→</span>
    <span>${lang==='en'?'After':'Po'}: <strong style="color:var(--text)">${vNew.agents.length} ${lang==='en'?'agents':'agentów'}</strong></span>
    <span style="margin-left:auto;">${lang==='en'?'Change':'Zmiana'}: ${vNew.agents.length - vOld.agents.length > 0 ? '+' : ''}${vNew.agents.length - vOld.agents.length}</span>
  </div>` + html;

  body.innerHTML = html;
  modal.classList.add('open');
}

function closeDiffModal() {
  document.getElementById('diff-modal').classList.remove('open');
}

// ─── FRAMEWORK EXPORT ─────────────────────────────────────

const FRAMEWORKS = [
  { id: 'claude',   label: 'Claude Projects', badge: 'No-code', logo: '🟠', pip: null,
    desc: 'One-click system prompts for Claude.ai Projects. No coding required — paste and go.',
    url: 'https://claude.ai/projects' },
  { id: 'crewai',   label: 'CrewAI',    badge: 'Python',   logo: '🤝', pip: 'pip install crewai crewai-tools',
    desc: 'Role-based agents with tasks and tools. Best for sequential and hierarchical workflows.',
    url: 'https://docs.crewai.com' },
  { id: 'langgraph', label: 'LangGraph', badge: 'Python',  logo: '🔗', pip: 'pip install langgraph langchain-openai',
    desc: 'Stateful multi-agent graphs with cycles and branching. Best for complex conditional flows.',
    url: 'https://langchain-ai.github.io/langgraph' },
  { id: 'autogen',  label: 'AutoGen',   badge: 'Python',   logo: '🔄', pip: 'pip install pyautogen',
    desc: 'Conversational multi-agent framework with human-in-the-loop support. Best for agentic chat.',
    url: 'https://microsoft.github.io/autogen' },
  { id: 'swarm',    label: 'Swarm',     badge: 'Python',   logo: '🐝', pip: 'pip install git+https://github.com/openai/swarm.git',
    desc: 'Lightweight OpenAI Swarm with handoffs between agents. Best for simple agent routing.',
    url: 'https://github.com/openai/swarm' },
];

let activeFwTab = 'claude';

// ═══════════════════════════════════════════════════════════
// ─── IMPORT PROJECT (#4) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════

let _importParsed = null; // holds parsed payload ready to confirm

// ── Open / close ──────────────────────────────────────────
function openImportModal() {
  resetImportModal();
  // Reset gist import section
  const gistInput = document.getElementById('gist-import-input');
  if (gistInput) gistInput.value = '';
  _clearGistImportError();
  const gistLabel = document.getElementById('gist-import-label');
  if (gistLabel) gistLabel.textContent = tr('Load ->', 'Wczytaj ->');
  document.getElementById('import-modal').classList.add('open');
}
function closeImportModal() {
  document.getElementById('import-modal').classList.remove('open');
  _importParsed = null;
}

// ── Drag & drop ───────────────────────────────────────────
function handleImportDrop(e) {
  e.preventDefault();
  document.getElementById('import-dropzone').classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) _processImportFile(file);
}
function handleImportFileSelect(input) {
  const file = input.files?.[0];
  if (file) _processImportFile(file);
  input.value = ''; // reset so same file can be re-selected
}

// ── Core parser ───────────────────────────────────────────
async function _processImportFile(file) {
  _clearImportError();
  const ext = file.name.split('.').pop().toLowerCase();

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
  } catch(e) {
    _showImportError(tr('Failed to read file: ', 'Nie udalo sie odczytac pliku: ') + e.message);
  }
}

async function _parseImportJson(text, filename) {
  let data;
  try { data = JSON.parse(text); }
  catch(e) { _showImportError(tr('Invalid JSON: ', 'Nieprawidlowy JSON: ') + e.message); return; }

  // Support multiple JSON shapes:
  // 1) AgentSpark share payload  { v, agents, files, topic, level, lang }
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

async function _parseImportZip(file) {
  if (typeof JSZip === 'undefined') {
    _showImportError(tr('JSZip library not loaded — cannot read ZIP files.', 'Biblioteka JSZip nie jest zaladowana — nie mozna odczytac pliku ZIP.')); return;
  }
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch(e) {
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
    } catch(e) { /* try next */ }
  }

  // Strategy 3: reconstruct from .md files (generic zip without manifest)
  const mdFiles = {};
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
function _reconstructFromMdFiles(mdFiles, zipName) {
  const agents = [];
  const files  = { ...mdFiles };
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
    const nameMatch    = content.match(/^#\s+Agent:\s+(.+)/m);
    const roleMatch    = content.match(/\*\*Role:\*\*\s*(.+)/m);
    const emojiMatch   = content.match(/^##\s+Identity[\s\S]*?([^\w\s])/m);
    const descMatch    = content.match(/^##\s+Goal\s*\n+([\s\S]+?)(?:\n##|$)/m);
    agents.push({
      id:          idSlug,
      name:        nameMatch?.[1]?.trim()  || idSlug,
      emoji:       emojiMatch?.[1]         || '🤖',
      type:        'technical',
      role:        roleMatch?.[1]?.trim()  || 'Agent',
      description: descMatch?.[1]?.trim().slice(0, 200) || '',
      agentMd:     content,
      skillMd:     mdFiles[`skill-${idSlug}.md`] || '',
    });
  });

  return { agents, files, topic, level: 'iskra', lang: 'en' };
}

// ── Preview ───────────────────────────────────────────────
function _showImportPreview(payload, filename) {
  const agents = payload.agents || [];
  const tech   = agents.filter(a => a.type === 'technical');
  const biz    = agents.filter(a => a.type !== 'technical');
  const fileCount = Object.keys(payload.files || {}).length;

  const preview = document.getElementById('import-preview');
  const content = document.getElementById('import-preview-content');
  const dropzone = document.getElementById('import-dropzone');

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem 1.5rem;margin-bottom:0.75rem;">
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('FILE', 'PLIK')}</span><br/><strong style="font-size:0.85rem;">${_escHtml(filename)}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('TOPIC', 'TEMAT')}</span><br/><strong style="font-size:0.85rem;">${_escHtml(payload.topic || '—')}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('LEVEL', 'POZIOM')}</span><br/><strong style="font-size:0.85rem;">${payload.level || '—'}</strong></div>
      <div><span style="color:var(--muted);font-size:0.72rem;">${tr('FILES', 'PLIKI')}</span><br/><strong style="font-size:0.85rem;">${fileCount} .md ${tr('files', 'plikow')}</strong></div>
    </div>
    <div style="font-size:0.72rem;color:var(--muted);margin-bottom:0.4rem;">${tr('AGENTS', 'AGENCI')} (${agents.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
      ${agents.map(a => `<span style="font-size:0.75rem;padding:0.2rem 0.55rem;border-radius:5px;
        background:${a.type==='technical'?'rgba(124,58,255,0.12)':'rgba(255,107,53,0.12)'};
        border:1px solid ${a.type==='technical'?'rgba(196,147,10,0.3)':'rgba(255,107,53,0.3)'};
        color:${a.type==='technical'?'var(--accent3)':'var(--accent2)'}">${a.emoji||'🤖'} ${_escHtml(a.name)}</span>`).join('')}
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
  const saveToDb = document.getElementById('import-save-checkbox')?.checked !== false;

  // Restore state — same pattern as loadProject / share restore
  currentTopic    = p.topic   || tr('Imported Project', 'Zaimportowany projekt');
  currentLevel    = p.level   || 'iskra';
  if (p.lang) { lang = p.lang; setLang(lang); }
  generatedAgents = JSON.parse(JSON.stringify(p.agents || []));
  generatedFiles  = JSON.parse(JSON.stringify(p.files  || {}));

  // Regenerate missing files
  if (!generatedFiles['README.md'] && generatedAgents.length) {
    generatedFiles['README.md'] = generateReadme();
  }
  generatedAgents.forEach(a => {
    if (!generatedFiles[`agent-${a.id}.md`] && a.agentMd)
      generatedFiles[`agent-${a.id}.md`] = a.agentMd;
    if (!generatedFiles[`skill-${a.id}.md`] && a.skillMd)
      generatedFiles[`skill-${a.id}.md`] = a.skillMd;
  });

  // Bootstrap version history
  versionHistory = [{
    id: Date.now(),
    label: lang==='en' ? `Imported: ${currentTopic}` : `Zaimportowany: ${currentTopic}`,
    ts: new Date(),
    agents: JSON.parse(JSON.stringify(generatedAgents)),
    files:  JSON.parse(JSON.stringify(generatedFiles)),
    diff: { added: [], removed: [], changed: [] },
    removedNames: {},
    agentNames: Object.fromEntries(generatedAgents.map(a => [a.id, a.name])),
    vNum: 1,
    isOrigin: true,
  }];

  // Reset project ID — will be assigned fresh by save
  _currentProjectId = null;

  closeImportModal();
  showScreen('results');
  document.getElementById('apiKeyHeader').style.display = 'flex';
  showResults(false);

  // Save to IndexedDB if requested
  if (saveToDb) {
    await saveCurrentProject(true);
  }

  showNotif(lang==='en'
    ? `✓ Imported "${currentTopic}" — ${generatedAgents.length} agents`
    : `✓ Zaimportowano "${currentTopic}" — ${generatedAgents.length} agentów`
  );
}

// ── Reset modal ───────────────────────────────────────────
function resetImportModal() {
  _importParsed = null;
  const preview  = document.getElementById('import-preview');
  const error    = document.getElementById('import-error');
  const dropzone = document.getElementById('import-dropzone');
  if (preview)  preview.style.display  = 'none';
  if (error)    error.style.display    = 'none';
  if (dropzone) { dropzone.style.opacity = ''; dropzone.style.pointerEvents = ''; }
}

function _showImportError(msg) {
  const el = document.getElementById('import-error');
  if (!el) return;
  el.textContent = `⚠ ${msg}`;
  el.style.display = 'block';
}
function _clearImportError() {
  const el = document.getElementById('import-error');
  if (el) el.style.display = 'none';
}

// ─── PROMPT EXPORT (#7) ──────────────────────────────────
let _activePromptTab = 'interview';

const PROMPT_TAB_DESCS = {
  interview: 'System prompt used during the AI interview phase — guides question format, depth calibration, and IMPACT notes.',
  generate:  'System prompt used to generate your agent team JSON from interview answers.',
  refine:    'System prompt used when refining / editing an existing team.'
};

function openPromptExport() {
  _activePromptTab = 'interview';
  _renderPromptTab('interview');
  document.getElementById('prompt-export-modal').classList.add('open');
}

function closePromptExport() {
  document.getElementById('prompt-export-modal').classList.remove('open');
}

function switchPromptTab(tab) {
  _activePromptTab = tab;
  document.querySelectorAll('.prompt-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('ptab-' + tab).classList.add('active');
  _renderPromptTab(tab);
}

function _getPromptForTab(tab) {
  if (tab === 'interview') return getSystemPrompt();
  if (tab === 'generate')  return getSystemPrompt() + '\n\n--- GENERATION PHASE TRIGGER ---\nWhen user sends [GENERATE], respond with the JSON agent team.';
  if (tab === 'refine')    return getRefineSystemPrompt();
  return '';
}

function _renderPromptTab(tab) {
  const ta = document.getElementById('prompt-export-textarea');
  const desc = document.getElementById('prompt-tab-desc');
  if (ta) ta.value = _getPromptForTab(tab);
  if (desc) desc.textContent = PROMPT_TAB_DESCS[tab] || '';
  // reset copy feedback
  const fb = document.getElementById('copy-prompt-feedback');
  if (fb) { fb.textContent = ''; fb.style.opacity = '0'; }
}

async function copyPromptToClipboard() {
  const ta = document.getElementById('prompt-export-textarea');
  const fb = document.getElementById('copy-prompt-feedback');
  const btn = document.getElementById('copy-prompt-btn');
  if (!ta) return;
  try {
    await navigator.clipboard.writeText(ta.value);
    if (fb) { fb.textContent = tr('✓ Copied!', '✓ Skopiowano!'); fb.style.opacity = '1'; setTimeout(() => { fb.style.opacity = '0'; }, 2000); }
    if (btn) { const orig = btn.textContent; btn.textContent = tr('✓ Copied!', '✓ Skopiowano!'); setTimeout(() => { btn.textContent = orig; }, 1500); }
  } catch(e) {
    ta.select();
    document.execCommand('copy');
    if (fb) { fb.textContent = tr('✓ Copied!', '✓ Skopiowano!'); fb.style.opacity = '1'; setTimeout(() => { fb.style.opacity = '0'; }, 2000); }
  }
}

function downloadPromptTxt() {
  const content = _getPromptForTab(_activePromptTab);
  const topicSlug = (currentTopic || 'agentspark').toLowerCase().replace(/\s+/g, '-');
  const filename = `prompt-${_activePromptTab}-${topicSlug}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function openFrameworkExport() {
  if(!generatedAgents.length) {
    showNotif(lang==='en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  renderFwModal();
  document.getElementById('fw-modal').classList.add('open');
}

function closeFwModal() {
  document.getElementById('fw-modal').classList.remove('open');
}

function renderFwModal() {
  const tabsEl = document.getElementById('fw-tabs');
  const bodyEl = document.getElementById('fw-body');
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
          <button class="modal-download-btn" onclick="copyFwCode('${fw.id}')">📋 ${lang==='en'?'Copy':'Kopiuj'}</button>
          <button class="modal-download-btn" onclick="downloadFwCode('${fw.id}')">⬇ ${lang==='en'?'Download .py':'Pobierz .py'}</button>
        </div>
      `;
    }
    bodyEl.appendChild(pane);
  });
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function copyFwCode(fwId) {
  const code = generateFrameworkCode(fwId);
  navigator.clipboard.writeText(code).then(() => {
    showNotif(lang==='en' ? '✓ Code copied to clipboard!' : '✓ Kod skopiowany!');
  }).catch(() => {
    showNotif(lang==='en' ? '⚠ Copy failed — select manually' : '⚠ Kopiowanie nieudane', true);
  });
}

function downloadFwCode(fwId) {
  if (fwId === 'claude') { downloadAllClaudePrompts(); return; }
  const code = generateFrameworkCode(fwId);
  const slug = currentTopic.toLowerCase().replace(/\s+/g, '_');
  const filename = `${fwId}_${slug}.py`;
  const blob = new Blob([code], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  showNotif(`✓ ${filename} downloaded`);
}

// ── Code generators ────────────────────────────────────────

function generateFrameworkCode(fwId) {
  switch(fwId) {
    case 'claude':    return genClaudeProjects();
    case 'crewai':   return genCrewAI();
    case 'langgraph': return genLangGraph();
    case 'autogen':  return genAutoGen();
    case 'swarm':    return genSwarm();
    default:         return '# Unknown framework';
  }
}

function agentVarName(agent) {
  return agent.id.replace(/-/g, '_') + '_agent';
}
function taskVarName(agent) {
  return agent.id.replace(/-/g, '_') + '_task';
}

// ── Claude Projects renderer ───────────────────────────────

function renderClaudeProjectsPane() {
  const agents = generatedAgents;
  const cards = agents.map((a, i) => {
    const prompt = genClaudeAgentPrompt(a);
    const safeId = `claude-agent-${i}`;
    return `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:0.75rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;gap:0.5rem;flex-wrap:wrap;">
        <div style="font-weight:700;font-size:0.95rem;">${a.emoji||'🤖'} ${a.name}</div>
        <div style="display:flex;gap:0.4rem;">
          <button class="modal-download-btn" onclick="copyClaudePrompt(${i})" style="font-size:0.72rem;padding:0.25rem 0.6rem;">📋 Copy prompt</button>
          <button class="modal-download-btn" onclick="downloadClaudePrompt(${i})" style="font-size:0.72rem;padding:0.25rem 0.6rem;">⬇ .md</button>
          <a href="https://claude.ai/projects" target="_blank" class="modal-download-btn" style="font-size:0.72rem;padding:0.25rem 0.6rem;text-decoration:none;">🟠 Open Claude</a>
        </div>
      </div>
      <div style="font-size:0.78rem;color:var(--muted);margin-bottom:0.6rem;">${a.role || a.type || ''} · ${a.description ? a.description.slice(0,90)+'…' : ''}</div>
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
        <li style="font-size:0.82rem;color:var(--muted);">Give the project the agent's name (e.g. "<strong>${agents[0]?.name||'Agent'}</strong>")</li>
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

function genClaudeAgentPrompt(agent) {
  return `# ${agent.emoji||'🤖'} ${agent.name}

## Role
${agent.role || agent.type || 'Specialist'}

## About You
${agent.description || ''}

## Your Expertise
${agent.skillMd ? agent.skillMd.replace(/^# Skill:.*\n/,'').trim() : (agent.skills ? agent.skills.join(', ') : 'See description above')}

## Personality & Communication Style
Be concise, professional, and focused. Stay within your area of expertise. When a question falls outside your scope, say so clearly and suggest which team member is better suited.

## Team Context
You are part of a ${generatedAgents.length}-agent team working on: **${currentTopic}**
${generatedAgents.filter(a => a.id !== agent.id).map(a => `- ${a.emoji||'🤖'} **${a.name}** — ${a.role || a.type}`).join('\n')}

Always keep your team context in mind. If the user needs help from a colleague, recommend them by name.`;
}

function genClaudeProjects() {
  // Returns combined text for copy/download all
  return generatedAgents.map(a =>
    `${'='.repeat(60)}\n# ${a.emoji||'🤖'} ${a.name}\n${'='.repeat(60)}\n\n${genClaudeAgentPrompt(a)}\n`
  ).join('\n\n');
}

function copyClaudePrompt(agentIndex) {
  const agent = generatedAgents[agentIndex];
  if (!agent) return;
  navigator.clipboard.writeText(genClaudeAgentPrompt(agent)).then(() => {
    showNotif(`✓ ${agent.name} prompt copied — paste into Claude Project Instructions`);
  }).catch(() => showNotif('⚠ Copy failed — use the View Prompt section', true));
}

function downloadClaudePrompt(agentIndex) {
  const agent = generatedAgents[agentIndex];
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
    a.download = `claude-projects-${currentTopic.toLowerCase().replace(/\s+/g,'-')}.md`;
    a.click();
    showNotif('✓ All prompts downloaded as single file');
    return;
  }
  const zip = new JSZip();
  generatedAgents.forEach(agent => {
    const slug = agent.name.toLowerCase().replace(/\s+/g, '-');
    zip.file(`claude-project-${slug}.md`, genClaudeAgentPrompt(agent));
  });
  // Add team summary
  zip.file('team-summary.md', genClaudeTeamSummaryText());
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `claude-projects-${currentTopic.toLowerCase().replace(/\s+/g,'-')}.zip`;
  a.click();
  showNotif(`✓ ${generatedAgents.length} Claude Project prompts downloaded`);
}

function genClaudeTeamSummaryText() {
  return `# ${currentTopic} — Claude Projects Setup

## Your AI Team (${generatedAgents.length} agents)

${generatedAgents.map(a => `### ${a.emoji||'🤖'} ${a.name}
- **Role:** ${a.role || a.type || 'Specialist'}
- **Description:** ${a.description || ''}
- **Claude Project file:** claude-project-${a.name.toLowerCase().replace(/\s+/g,'-')}.md`).join('\n\n')}

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
  const topic = currentTopic;
  const agents = generatedAgents;
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
  const taskList  = agents.map(a => `    ${taskVarName(a)},`).join('\n');

  return `"""
AgentSpark → CrewAI Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0,10)}
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
  const topic = currentTopic;
  const agents = generatedAgents;

  const stateFields = agents.map(a =>
    `    ${a.id.replace(/-/g,'_')}_output: str`
  ).join('\n');

  const nodeDefs = agents.map(a => {
    const varName = a.id.replace(/-/g,'_');
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
    `workflow.add_node("${a.id}", ${a.id.replace(/-/g,'_')}_node)`
  ).join('\n');

  const addEdges = agents.map((a, i) => {
    if(i === 0) return `workflow.set_entry_point("${a.id}")`;
    return `workflow.add_edge("${agents[i-1].id}", "${a.id}")`;
  }).join('\n');

  const lastId = agents[agents.length-1]?.id || 'end';

  return `"""
AgentSpark → LangGraph Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0,10)}
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
${agents.map(a => `        "${a.id.replace(/-/g,'_')}_output": ""`).join(',\n')}
    })
    print("\\n=== FINAL STATE ===")
    for key, val in result.items():
        if val and key != "messages":
            print(f"\\n[{key}]\\n{val}")
`;
}

function genAutoGen() {
  const topic = currentTopic;
  const agents = generatedAgents;

  const agentDefs = agents.map(a => `
${a.id.replace(/-/g,'_')} = AssistantAgent(
    name="${a.name.replace(/\s+/g,'_')}",
    system_message="""You are ${a.name}.
Role: ${a.role || a.name}
Responsibilities: ${a.description}
Topic: ${topic}

When you complete your part, summarize your output clearly and pass to the next agent.""",
    llm_config=llm_config,
)`).join('\n');

  const groupChatAgents = agents.map(a => `    ${a.id.replace(/-/g,'_')},`).join('\n');

  return `"""
AgentSpark → AutoGen Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0,10)}
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
  const topic = currentTopic;
  const agents = generatedAgents;

  const agentDefs = agents.map((a, i) => {
    const nextAgent = agents[i + 1];
    const handoff = nextAgent
      ? `\n    handoff_to_${nextAgent.id.replace(/-/g,'_')} = transfer_to_${nextAgent.id.replace(/-/g,'_')}()`
      : '';
    return `
def ${a.id.replace(/-/g,'_')}_instructions(context_variables):
    return f"""You are ${a.name}.
Role: ${a.role || a.name}
Topic: ${topic}
Task: ${a.description}
${nextAgent ? `When done, call transfer_to_${nextAgent.id.replace(/-/g,'_')} to pass to the next agent.` : 'This is the final step. Summarize all work done.'}"""

${a.id.replace(/-/g,'_')} = Agent(
    name="${a.name}",
    instructions=${a.id.replace(/-/g,'_')}_instructions,
    functions=[${nextAgent ? `transfer_to_${nextAgent.id.replace(/-/g,'_')}` : ''}],
)`;
  }).join('\n');

  const transferFns = agents.slice(0, -1).map((a, i) => {
    const next = agents[i + 1];
    return `
def transfer_to_${next.id.replace(/-/g,'_')}():
    """Transfer to ${next.name} — ${next.description.split('.')[0]}."""
    return ${next.id.replace(/-/g,'_')}`;
  }).join('\n');

  const firstAgent = agents[0]?.id.replace(/-/g,'_') || 'agent';

  return `"""
AgentSpark → OpenAI Swarm Export
Topic: ${topic}
Generated: ${new Date().toISOString().slice(0,10)}
Docs: https://github.com/openai/swarm
Install: pip install git+https://github.com/openai/swarm.git
"""

from swarm import Swarm, Agent

client = Swarm()

# ── Transfer Functions (forward declarations) ──────────────
${agents.slice(1).map(a => `${a.id.replace(/-/g,'_')} = None  # defined below`).join('\n')}

# ── Agents ────────────────────────────────────────────────
${agentDefs}

# ── Handoff Functions ─────────────────────────────────────
${transferFns}

# ── Fix forward references ────────────────────────────────
${agents.slice(0,-1).map((a,i) => {
    const next = agents[i+1];
    return `${a.id.replace(/-/g,'_')}.functions = [transfer_to_${next.id.replace(/-/g,'_')}]`;
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

document.getElementById('fw-modal').addEventListener('click', function(e) {
  if(e.target === this) closeFwModal();
});
document.getElementById('diff-modal').addEventListener('click', function(e) {
  if(e.target === this) closeDiffModal();
});
document.getElementById('prompt-export-modal').addEventListener('click', function(e) {
  if(e.target === this) closePromptExport();
});
document.getElementById('import-modal').addEventListener('click', function(e) {
  if(e.target === this) closeImportModal();
});

// ─── SHARING VIA URL ──────────────────────────────────────

// Compress string → Uint8Array (gzip via CompressionStream)
async function compress(str) {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const enc = new TextEncoder();
  writer.write(enc.encode(str));
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

// Decompress Uint8Array → string
async function decompress(bytes) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(out);
}

// Uint8Array → URL-safe base64
function uint8ToBase64url(bytes) {
  let bin = '';
  for(let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// URL-safe base64 → Uint8Array
function base64urlToUint8(str) {
  const padLen = (4 - (str.length % 4)) % 4;
  const b64 = (str + '='.repeat(padLen)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const SHARE_LIMITS = {
  maxHashChars: 24000,
  maxEncodedChars: 22000,
  maxDecodedBytes: 160000,
  maxJsonChars: 160000
};

function validateSharePayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Number.isInteger(raw.v) || raw.v < 2 || raw.v > 3) return null;
  if (!Array.isArray(raw.agents) || raw.agents.length === 0 || raw.agents.length > 24) return null;
  if (raw.files && typeof raw.files !== 'object') return null;

  const topic = _cleanStr(raw.topic || 'Shared Team', 160);
  const level = _cleanStr(raw.level || 'iskra', 24);
  const payloadLang = raw.lang === 'pl' ? 'pl' : 'en';
  const agents = raw.agents.map(a => {
    if (!a || typeof a !== 'object') return null;
    return {
      ...a,
      id: _cleanStr(a.id, 80),
      name: _cleanStr(a.name, 120),
      role: _cleanStr(a.role, 120),
      description: _cleanStr(a.description, 1000)
    };
  }).filter(a => a && a.id && a.name);
  if (!agents.length) return null;

  return {
    v: raw.v,
    topic,
    level,
    lang: payloadLang,
    agents,
    files: raw.files && typeof raw.files === 'object' ? raw.files : {},
    ts: Number.isFinite(raw.ts) ? raw.ts : Date.now(),
    pw: !!raw.pw
  };
}

// Simple XOR kept ONLY for backward-compat reading of v:2 links
function xorObfuscate(str, password) {
  const key = password.split('').map(c => c.charCodeAt(0));
  return str.split('').map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ key[i % key.length])
  ).join('');
}

// ── AES-256-GCM helpers (#3) ──────────────────────────────
// Derive a 256-bit key from a password using PBKDF2 + a fixed app salt
async function _aesKeyFromPassword(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function aesGcmEncrypt(plaintext, password) {
  const enc      = new TextEncoder();
  const iv       = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV
  const salt     = crypto.getRandomValues(new Uint8Array(16));  // 128-bit PBKDF2 salt
  const key      = await _aesKeyFromPassword(password, salt);
  const ctBuf    = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  // Pack: [salt 16B][iv 12B][ciphertext …]
  const ct = new Uint8Array(ctBuf);
  const packed = new Uint8Array(salt.length + iv.length + ct.length);
  packed.set(salt, 0);
  packed.set(iv,   salt.length);
  packed.set(ct,   salt.length + iv.length);
  return packed;
}

async function aesGcmDecrypt(packedBytes, password) {
  const salt = packedBytes.slice(0, 16);
  const iv   = packedBytes.slice(16, 28);
  const ct   = packedBytes.slice(28);
  const key  = await _aesKeyFromPassword(password, salt);
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  );
  return new TextDecoder().decode(ptBuf);
}

// ── Password unlock modal promise ─────────────────────────
let _unlockResolve = null;
let _unlockRejectCb = null;

function _unlockReject() {
  document.getElementById('unlock-modal').classList.remove('open');
  if (_unlockRejectCb) { _unlockRejectCb(new Error('cancelled')); _unlockRejectCb = null; }
}

function _promptPassword(descText) {
  return new Promise((resolve, reject) => {
    _unlockResolve  = resolve;
    _unlockRejectCb = reject;
    const descEl = document.getElementById('unlock-modal-desc');
    if (descEl && descText) descEl.textContent = descText;
    const input = document.getElementById('unlock-password-input');
    if (input) input.value = '';
    const errEl = document.getElementById('unlock-error');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('unlock-modal').classList.add('open');
    setTimeout(() => input?.focus(), 80);
  });
}

function _unlockConfirm() {
  const pw = document.getElementById('unlock-password-input')?.value || '';
  if (!pw) return;
  document.getElementById('unlock-modal').classList.remove('open');
  if (_unlockResolve) { _unlockResolve(pw); _unlockResolve = null; }
}

function _unlockShowError() {
  const errEl = document.getElementById('unlock-error');
  if (errEl) errEl.style.display = 'block';
  const input = document.getElementById('unlock-password-input');
  if (input) { input.value = ''; input.focus(); }
  document.getElementById('unlock-modal').classList.add('open');
}

let _shareUrl  = '';
let _shareMode = 'open';

async function generateShareUrl() {
  const password    = document.getElementById('share-password-input')?.value?.trim() || '';
  const usePassword = _shareMode === 'password' && password.length > 0;

  // Build state payload
  const payload = {
    v:      3,             // v3 = AES-GCM encrypted (v2 = legacy XOR)
    topic:  currentTopic,
    level:  currentLevel,
    lang,
    agents: generatedAgents,
    files:  generatedFiles,
    ts:     Date.now(),
    pw:     usePassword,
  };

  try {
    const jsonStr = JSON.stringify(payload);
    let dataToCompress;

    if (usePassword) {
      // Encrypt with AES-256-GCM, then compress the packed binary
      const encrypted = await aesGcmEncrypt(jsonStr, password);
      dataToCompress  = encrypted;                       // Uint8Array
      const compressed = await _compressBytes(dataToCompress);
      const encoded    = uint8ToBase64url(compressed);
      const base       = window.location.href.split('#')[0];
      _shareUrl        = `${base}#share=${encoded}`;
    } else {
      const compressed = await compress(jsonStr);
      const encoded    = uint8ToBase64url(compressed);
      const base       = window.location.href.split('#')[0];
      _shareUrl        = `${base}#share=${encoded}`;
    }

    if (_shareUrl.length > SHARE_LIMITS.maxHashChars) {
      throw new Error('Share URL exceeds safe size limit');
    }

    const displayEl = document.getElementById('share-url-display');
    if (displayEl) displayEl.value = _shareUrl;

    const kb     = (_shareUrl.length / 1024).toFixed(1);
    const sizeEl = document.getElementById('share-size-label');
    if (sizeEl) {
      sizeEl.textContent = `${kb} KB`;
      sizeEl.className   = parseFloat(kb) > 100 ? 'share-size-warn' : '';
    }
    const agentEl = document.getElementById('share-agent-count');
    if (agentEl) agentEl.textContent = `${generatedAgents.length} ${tr('agents', 'agentow')}`;
    const verEl   = document.getElementById('share-version-label');
    if (verEl)    verEl.textContent = `v${versionHistory.length || 1} (latest)`;
    trackEvent('share_created', {
      success: true,
      hash_kb: Number((_shareUrl.length / 1024).toFixed(1)),
      agents: generatedAgents.length
    });

  } catch(e) {
    const displayEl = document.getElementById('share-url-display');
    if (displayEl) displayEl.value = 'Error generating link: ' + e.message;
    trackEvent('share_created', {
      success: false,
      reason: String(e?.message || 'unknown_error').slice(0, 120)
    });
  }
}

// Compress raw Uint8Array (for encrypted binary blobs)
async function _compressBytes(bytes) {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n,c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let offset  = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

async function _decompressBytes(bytes) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = stream.readable.getReader();
  while(true) {
    const { done, value } = await reader.read();
    if(done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n,c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let offset  = 0;
  for(const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

function onShareModeChange() {
  const val = document.querySelector('input[name="share-mode"]:checked')?.value || 'open';
  _shareMode = val;

  document.getElementById('share-opt-open').classList.toggle('active', val === 'open');
  document.getElementById('share-opt-password').classList.toggle('active', val === 'password');

  const pwRow = document.getElementById('share-password-row');
  if(pwRow) pwRow.style.display = val === 'password' ? 'flex' : 'none';

  generateShareUrl();
}

function openShareModal() {
  if(!generatedAgents.length) {
    showNotif(lang==='en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  _shareMode = 'open';
  // Reset UI
  const openOpt = document.querySelector('input[name="share-mode"][value="open"]');
  if(openOpt) openOpt.checked = true;
  document.getElementById('share-opt-open').classList.add('active');
  document.getElementById('share-opt-password').classList.remove('active');
  document.getElementById('share-password-row').style.display = 'none';
  const pwInput = document.getElementById('share-password-input');
  if(pwInput) pwInput.value = '';

  const copyBtn = document.getElementById('share-copy-btn');
  if(copyBtn) { copyBtn.textContent = tr('📋 Copy', '📋 Kopiuj'); copyBtn.classList.remove('copied'); }

  // Reset gist UI
  const gistResult = document.getElementById('gist-result');
  if(gistResult) gistResult.style.display = 'none';
  const gistLabel = document.getElementById('gist-publish-label');
  if(gistLabel) gistLabel.textContent = tr('Publish Gist', 'Publikuj Gist');
  const gistBtn = document.getElementById('gist-publish-btn');
  if(gistBtn) gistBtn.disabled = false;

  document.getElementById('share-modal').classList.add('open');
  generateShareUrl();
}

function closeShareModal() {
  document.getElementById('share-modal').classList.remove('open');
}

// ─── ONBOARDING WIZARD ────────────────────────────────────

let _obStep = 0;
let _obProvider = null;

const OB_PROVIDER_CONFIG = {
  gemini:    { label: 'Gemini API Key', placeholder: 'AIza…', prefix: 'AIza', keyLink: 'https://aistudio.google.com/apikey', modelValue: 'gemini|gemini-2.5-flash-preview-05-20|https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}|gemini' },
  groq:      { label: 'Groq API Key', placeholder: 'gsk_…', prefix: 'gsk_', keyLink: 'https://console.groq.com/keys', modelValue: 'openai|llama-3.3-70b-versatile|https://api.groq.com/openai/v1/chat/completions|groq' },
  anthropic: { label: 'Anthropic API Key', placeholder: 'sk-ant-…', prefix: 'sk-ant-', keyLink: 'https://console.anthropic.com/settings/keys', modelValue: 'anthropic|claude-sonnet-4-5|https://api.anthropic.com/v1/messages|anthropic' },
  openai:    { label: 'OpenAI API Key', placeholder: 'sk-…', prefix: 'sk-', keyLink: 'https://platform.openai.com/api-keys', modelValue: 'openai|gpt-4o|https://api.openai.com/v1/chat/completions|openai' },
};

function maybeShowOnboarding() {
  const hasKey   = !!localStorage.getItem('agentspark-api-key');
  const hasSeen  = !!localStorage.getItem('agentspark-onboarding-done');
  const isShared = window.location.hash.startsWith('#share=');
  if (!hasKey && !hasSeen && !isShared) {
    setTimeout(() => {
      document.getElementById('onboarding-modal').classList.add('open');
    }, 600);
  }
}

function obSetStep(n) {
  _obStep = n;
  for (let i = 0; i < 3; i++) {
    document.getElementById(`ob-step-${i}`).style.display = i === n ? '' : 'none';
    document.getElementById(`ob-dot-${i}`).classList.toggle('active', i === n);
  }
}

function obNext() {
  if (_obStep === 0) { obSetStep(1); return; }
  if (_obStep === 1) {
    if (!_obProvider) {
      showNotif('⚠ Pick a provider first', true); return;
    }
    const cfg = OB_PROVIDER_CONFIG[_obProvider];
    document.getElementById('ob-step2-title').textContent = `Paste your ${cfg.label}`;
    document.getElementById('ob-key-link').href = cfg.keyLink;
    document.getElementById('ob-key-link').textContent = cfg.keyLink.replace('https://','');
    document.getElementById('ob-key-input').placeholder = cfg.placeholder;
    document.getElementById('ob-key-input').value = '';
    document.getElementById('ob-key-feedback').textContent = '';
    document.getElementById('ob-finish-btn').disabled = true;
    obSetStep(2);
  }
}

function obBack() {
  if (_obStep > 0) obSetStep(_obStep - 1);
}

function obCheckKey(val) {
  const feedback = document.getElementById('ob-key-feedback');
  const btn = document.getElementById('ob-finish-btn');
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

function obSelectProvider(provider) {
  _obProvider = provider;
  document.querySelectorAll('.ob-provider-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.provider === provider);
  });
}

function obFinish() {
  const keyVal = document.getElementById('ob-key-input').value.trim();
  if (keyVal.length < 10) { showNotif('⚠ Key too short', true); return; }

  // Apply key and model
  syncApiKey(keyVal);
  const cfg = OB_PROVIDER_CONFIG[_obProvider];
  const sel = document.getElementById('modelSelect');
  if (sel) {
    // Find matching option
    for (const opt of sel.options) {
      if (opt.value === cfg.modelValue) { opt.selected = true; break; }
    }
    onModelChange();
  }

  localStorage.setItem('agentspark-onboarding-done', '1');
  document.getElementById('onboarding-modal').classList.remove('open');
  showNotif(`✓ ${OB_PROVIDER_CONFIG[_obProvider].label} saved — ready to build!`);
  // Open API setup so key is visible
  const body = document.getElementById('api-setup-body');
  if (body && !body.classList.contains('open')) toggleApiSetup();
}

function obSkip() {
  localStorage.setItem('agentspark-onboarding-done', '1');
  document.getElementById('onboarding-modal').classList.remove('open');
}

// Wire up provider option clicks
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ob-provider-opt').forEach(el => {
    el.addEventListener('click', () => obSelectProvider(el.dataset.provider));
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
  currentTopic   = DEMO_TEAM.topic;
  currentLevel   = DEMO_TEAM.level;
  generatedAgents = JSON.parse(JSON.stringify(DEMO_TEAM.agents));
  generatedFiles  = JSON.parse(JSON.stringify(DEMO_TEAM.files));
  versionHistory  = [];
  traceSpans      = [];

  // Show demo banner on results screen
  const banner = document.getElementById('shared-banner');
  const bannerTitle = document.getElementById('shared-banner-title');
  const bannerSub   = document.getElementById('shared-banner-sub');
  if (banner) {
    bannerTitle.textContent = '🎮 Demo Mode — E-commerce Support Team';
    bannerSub.textContent   = 'This is a sample team. Add your API key and generate your own!';
    banner.style.display = 'flex';
  }

  showResults(false);
  showNotif('🎮 Demo loaded — explore the interface, then add your API key to generate your own team!');
}

// ─── GALLERY ─────────────────────────────────────────────

// ─── LOAD FROM GIST URL ───────────────────────────────────

async function loadFromGistUrl() {
  const raw = document.getElementById('gist-import-input')?.value?.trim();
  if (!raw) {
    _showGistImportError(tr('⚠ Paste a Gist URL or ID first.', '⚠ Najpierw wklej URL lub ID Gist.'));
    return;
  }

  // Extract Gist ID from URL or use as-is
  let gistId = raw;
  const urlMatch = raw.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i);
  if (urlMatch) gistId = urlMatch[1];
  // Also handle raw gist.githubusercontent.com URLs
  const rawMatch = raw.match(/gist\.githubusercontent\.com\/[^/]+\/([a-f0-9]+)/i);
  if (rawMatch) gistId = rawMatch[1];

  if (!/^[a-f0-9]{20,}$/i.test(gistId)) {
    _showGistImportError(tr('⚠ Could not extract a valid Gist ID from that input.', '⚠ Nie udalo sie wyodrebnic poprawnego ID Gist z podanych danych.'));
    return;
  }

  const btn = document.getElementById('gist-import-btn');
  const label = document.getElementById('gist-import-label');
  label.textContent = tr('⏳ Loading…', '⏳ Wczytywanie…');
  btn.disabled = true;
  _clearGistImportError();

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) {
      throw new Error(res.status === 404
        ? tr('Gist not found — check the URL or ID.', 'Nie znaleziono Gist — sprawdz URL lub ID.')
        : tr(`GitHub error ${res.status}`, `Blad GitHub ${res.status}`));
    }
    const data = await res.json();

    // Find agentspark-project.json in files
    const files = data.files || {};
    const asFile = files['agentspark-project.json'] || Object.values(files).find(f => f.filename?.includes('agentspark'));
    if (!asFile) throw new Error(tr('This Gist does not contain an AgentSpark project file.', 'Ten Gist nie zawiera pliku projektu AgentSpark.'));

    // Fetch raw content (may be truncated in API response)
    let content = asFile.content;
    if (asFile.truncated) {
      const rawRes = await fetch(asFile.raw_url);
      content = await rawRes.text();
    }

    let payload;
    try { payload = JSON.parse(content); }
    catch (e) { throw new Error(tr('Invalid JSON in Gist file.', 'Nieprawidlowy JSON w pliku Gist.')); }

    if (!payload.agents?.length) throw new Error(tr('No agents found in this Gist.', 'W tym Gist nie znaleziono agentow.'));

    // Show in import preview
    _importParsed = { ...payload, _sourceFile: `Gist: ${gistId.slice(0,8)}…` };
    _showImportPreview(payload, `Gist from ${data.owner?.login || 'unknown'}: ${data.description || gistId}`);

    label.textContent = tr('✓ Loaded', '✓ Wczytano');
    _clearGistImportError();
  } catch (e) {
    _showGistImportError(`⚠ ${e.message}`);
    label.textContent = tr('Load ->', 'Wczytaj ->');
    btn.disabled = false;
  }
}

function _showGistImportError(msg) {
  const el = document.getElementById('gist-import-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function _clearGistImportError() {
  const el = document.getElementById('gist-import-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
  // Also reset button if needed
  const btn = document.getElementById('gist-import-btn');
  const label = document.getElementById('gist-import-label');
  if (btn) btn.disabled = false;
  if (label && label.textContent !== tr('✓ Loaded', '✓ Wczytano')) {
    label.textContent = tr('Load ->', 'Wczytaj ->');
  }
}

// ─── GITHUB GIST PUBLISH ─────────────────────────────────
async function publishToGist() {
  const token = document.getElementById('gist-token-input').value.trim();
  if(!token) {
    showNotif(tr('⚠ Enter your GitHub token first', '⚠ Najpierw podaj token GitHub'), true); return;
  }
  if(!generatedAgents.length) {
    showNotif(tr('⚠ No agents to publish', '⚠ Brak agentow do publikacji'), true); return;
  }

  const btn = document.getElementById('gist-publish-btn');
  const label = document.getElementById('gist-publish-label');
  label.textContent = tr('⏳ Publishing…', '⏳ Publikowanie…');
  btn.disabled = true;

  const payload = {
    v: 3, source: 'agentspark',
    topic: currentTopic, level: currentLevel, lang,
    agents: generatedAgents, files: generatedFiles,
    ts: Date.now()
  };

  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        description: `AgentSpark: ${currentTopic}`,
        public: true,
        files: {
          'agentspark-project.json': { content: JSON.stringify(payload, null, 2) },
          'README.md': { content: `# AgentSpark Team: ${currentTopic}\n\nGenerated with [AgentSpark](${window.location.href.split('#')[0]})\n\n## Agents\n${generatedAgents.map(a => `- ${a.emoji || ''} **${a.name}** — ${a.description || ''}`).join('\n')}\n\n## Import\n1. Open AgentSpark\n2. Go to Results → Import\n3. Paste this Gist ID: \`{{GIST_ID}}\`` }
        }
      })
    });

    if(!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub error ${res.status}`);
    }

    const data = await res.json();
    const gistUrl = data.html_url;
    const gistId = data.id;

    // Update README with actual gist ID
    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${token}`
      },
      body: JSON.stringify({
        files: {
          'README.md': { content: `# AgentSpark Team: ${currentTopic}\n\nGenerated with [AgentSpark](${window.location.href.split('#')[0]})\n\n## Agents\n${generatedAgents.map(a => `- ${a.emoji || ''} **${a.name}** — ${a.description || ''}`).join('\n')}\n\n## Import\n1. Open AgentSpark\n2. Go to Results → Import\n3. Paste this Gist URL or ID: \`${gistId}\`` }
        }
      })
    });

    const resultEl = document.getElementById('gist-result');
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div style="background:rgba(124,196,42,0.1);border:1px solid rgba(124,196,42,0.3);border-radius:8px;padding:0.75rem 1rem;font-size:0.82rem;">
        <div style="color:var(--success);font-weight:700;margin-bottom:0.4rem;">${tr('✓ Published to GitHub Gist!', '✓ Opublikowano w GitHub Gist!')}</div>
        <a href="${gistUrl}" target="_blank" style="color:var(--accent);word-break:break-all;">${gistUrl}</a>
        <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
          <button onclick="navigator.clipboard.writeText('${gistUrl}').then(()=>showNotif('${tr('✓ URL copied!', '✓ URL skopiowany!')}'))"
            style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:0.3rem 0.7rem;font-size:0.75rem;cursor:pointer;">${tr('📋 Copy URL', '📋 Kopiuj URL')}</button>
          <button onclick="navigator.clipboard.writeText('${gistId}').then(()=>showNotif('${tr('✓ ID copied!', '✓ ID skopiowane!')}'))"
            style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:0.3rem 0.7rem;font-size:0.75rem;cursor:pointer;">${tr('📋 Copy ID', '📋 Kopiuj ID')}</button>
        </div>
      </div>`;
    label.textContent = tr('✓ Published', '✓ Opublikowano');
    showNotif(tr('✓ Gist published!', '✓ Gist opublikowany!'));
  } catch(e) {
    label.textContent = tr('⬆ Publish Gist', '⬆ Publikuj Gist');
    btn.disabled = false;
    showNotif(tr(`⚠ Gist error: ${e.message}`, `⚠ Blad Gist: ${e.message}`), true);
  }
}

// ─── PLAYGROUND ──────────────────────────────────────────
let _playgroundAgent = null;
let _playgroundHistory = [];

function openPlayground() {
  if(!generatedAgents.length) {
    showNotif(lang === 'en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  _playgroundHistory = [];
  _renderPlaygroundTabs();
  document.getElementById('playground-modal').classList.add('open');
  // Select first agent
  const firstTab = document.getElementById('playground-agent-tabs').querySelector('.pg-tab');
  if(firstTab) firstTab.click();
}

function exportPlaygroundChat() {
  if (!_playgroundHistory || _playgroundHistory.length === 0) {
    showNotif(tr('No messages to export yet.', 'Brak wiadomosci do eksportu.'), true);
    return;
  }
  const agentName  = _playgroundAgent ? _playgroundAgent.name  : 'Agent';
  const agentEmoji = _playgroundAgent ? (_playgroundAgent.emoji || '🤖') : '🤖';
  const date = new Date().toLocaleDateString('en-GB', {year:'numeric',month:'long',day:'numeric'});
  const time = new Date().toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});

  let md = '# 🧪 Playground Chat — ' + agentEmoji + ' ' + agentName + '\n\n';
  md += '**Project:** ' + (currentTopic || 'AgentSpark') + '  \n';
  md += '**Agent:** ' + agentName + '  \n';
  md += '**Exported:** ' + date + ' at ' + time + '  \n\n---\n\n';

  _playgroundHistory.forEach(msg => {
    const isUser  = msg.role === 'user';
    const speaker = isUser ? '👤 **You**' : (agentEmoji + ' **' + agentName + '**');
    md += '### ' + speaker + '\n\n' + msg.content + '\n\n---\n\n';
  });

  md += '*Generated by [AgentSpark](https://agentspark.app)*';

  const slug = (currentTopic || 'chat').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  const name = 'playground-' + slug + '-' + agentName.toLowerCase().replace(/\s+/g,'-') + '.md';
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
  showNotif(tr('💾 Chat exported as Markdown!', '💾 Czat wyeksportowany do Markdown!'));
}

function closePlayground() {
  document.getElementById('playground-modal').classList.remove('open');
}

function _renderPlaygroundTabs() {
  const container = document.getElementById('playground-agent-tabs');
  container.innerHTML = '';
  generatedAgents.forEach((agent, i) => {
    const btn = document.createElement('button');
    btn.className = 'pg-tab';
    btn.dataset.idx = i;
    btn.innerHTML = `<span>${agent.emoji || '🤖'}</span> ${agent.name}`;
    btn.style.cssText = `
      background:var(--surface2);border:1px solid var(--border);color:var(--muted);
      border-radius:20px;padding:0.3rem 0.75rem;font-size:0.78rem;cursor:pointer;
      font-family:'Manrope',sans-serif;transition:all 0.15s;white-space:nowrap;`;
    btn.onclick = () => _selectPlaygroundAgent(agent, btn);
    container.appendChild(btn);
  });
}

function _selectPlaygroundAgent(agent, btnEl) {
  _playgroundAgent = agent;
  _playgroundHistory = [];
  // Update tab styles
  document.querySelectorAll('.pg-tab').forEach(b => {
    b.style.background = 'var(--surface2)';
    b.style.borderColor = 'var(--border)';
    b.style.color = 'var(--muted)';
  });
  btnEl.style.background = 'rgba(242,185,13,0.12)';
  btnEl.style.borderColor = 'var(--accent)';
  btnEl.style.color = 'var(--accent)';

  // Clear messages and show welcome
  const msgs = document.getElementById('playground-messages');
  msgs.innerHTML = '';
  _pgAddMessage('system', tr(
    `You are now talking to **${agent.emoji || '🤖'} ${agent.name}**\n${agent.description || ''}`,
    `Rozmawiasz teraz z **${agent.emoji || '🤖'} ${agent.name}**\n${agent.description || ''}`
  ));
  document.getElementById('playground-status').textContent = '';
  document.getElementById('playground-input').focus();
}

function _pgAddMessage(role, text) {
  const msgs = document.getElementById('playground-messages');
  const div = document.createElement('div');
  div.style.cssText = `display:flex;gap:0.6rem;align-items:flex-start;${role === 'user' ? 'flex-direction:row-reverse;' : ''}`;

  const avatar = document.createElement('div');
  avatar.style.cssText = `width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:0.85rem;flex-shrink:0;
    ${role === 'user' ? 'background:rgba(242,185,13,0.15);border:1px solid rgba(242,185,13,0.3);' :
      role === 'system' ? 'background:rgba(100,120,255,0.1);border:1px solid rgba(100,120,255,0.2);' :
      'background:var(--surface2);border:1px solid var(--border);'}`;
  avatar.textContent = role === 'user' ? '👤' : role === 'system' ? 'ℹ' : (_playgroundAgent?.emoji || '🤖');

  const bubble = document.createElement('div');
  bubble.style.cssText = `max-width:80%;padding:0.6rem 0.9rem;border-radius:12px;font-size:0.85rem;line-height:1.55;
    ${role === 'user' ? 'background:rgba(242,185,13,0.12);border:1px solid rgba(242,185,13,0.2);color:var(--text);border-top-right-radius:3px;' :
      role === 'system' ? 'background:rgba(100,120,255,0.07);border:1px solid rgba(100,120,255,0.15);color:var(--muted);font-size:0.78rem;border-top-left-radius:3px;' :
      'background:var(--surface2);border:1px solid var(--border);color:var(--text);border-top-left-radius:3px;'}`;
  bubble.innerHTML = renderMarkdown(text);

  div.appendChild(avatar);
  div.appendChild(bubble);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

async function sendPlaygroundMessage() {
  if(!_playgroundAgent) {
    showNotif(tr('⚠ Select an agent first', '⚠ Najpierw wybierz agenta'), true); return;
  }
  const input = document.getElementById('playground-input');
  const text = input.value.trim();
  if(!text) return;

  input.value = '';
  input.style.height = 'auto';
  const sendBtn = document.getElementById('playground-send-btn');
  sendBtn.disabled = true;

  _pgAddMessage('user', text);
  _playgroundHistory.push({ role: 'user', content: text });

  // Typing indicator
  const typingDiv = document.createElement('div');
  typingDiv.style.cssText = 'display:flex;gap:0.6rem;align-items:center;';
  typingDiv.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);
      display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;">${_playgroundAgent.emoji || '🤖'}</div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;border-top-left-radius:3px;
      padding:0.6rem 0.9rem;font-size:0.85rem;color:var(--muted);">
      <span style="animation:pgDots 1.2s infinite">●</span>
      <span style="animation:pgDots 1.2s 0.4s infinite">●</span>
      <span style="animation:pgDots 1.2s 0.8s infinite">●</span>
    </div>`;
  const msgs = document.getElementById('playground-messages');
  msgs.appendChild(typingDiv);
  msgs.scrollTop = msgs.scrollHeight;

  document.getElementById('playground-status').textContent = `${_playgroundAgent.name} is thinking…`;

  // Build system prompt from agent's agentMd + skillMd
  const systemPrompt = [
    _playgroundAgent.agentMd || '',
    _playgroundAgent.skillMd || ''
  ].filter(Boolean).join('\n\n---\n\n') ||
  `You are ${_playgroundAgent.name}. ${_playgroundAgent.description || ''}`;

  try {
    const reply = await callGemini(systemPrompt, text, `🧪 Playground · ${_playgroundAgent.name}`, _playgroundHistory);
    msgs.removeChild(typingDiv);
    _pgAddMessage('assistant', reply);
    _playgroundHistory.push({ role: 'assistant', content: reply });
    document.getElementById('playground-status').textContent = `${_playgroundHistory.filter(m=>m.role==='assistant').length} responses`;
  } catch(e) {
    msgs.removeChild(typingDiv);
    _pgAddMessage('system', `⚠ Error: ${e.message}`);
    document.getElementById('playground-status').textContent = '';
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function clearPlayground() {
  _playgroundHistory = [];
  const msgs = document.getElementById('playground-messages');
  msgs.innerHTML = '';
  if(_playgroundAgent) {
    _pgAddMessage('system', `Chat cleared. You are talking to **${_playgroundAgent.emoji || '🤖'} ${_playgroundAgent.name}**`);
  }
  document.getElementById('playground-status').textContent = '';
}

async function copyShareUrl() {
  if(!_shareUrl) return;
  try {
    await navigator.clipboard.writeText(_shareUrl);
    const btn = document.getElementById('share-copy-btn');
    btn.textContent = tr('✓ Copied!', '✓ Skopiowano!');
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = tr('📋 Copy', '📋 Kopiuj'); btn.classList.remove('copied'); }, 2500);
    showNotif(lang==='en' ? '✓ Share link copied!' : '✓ Link skopiowany!');
  } catch(e) {
    showNotif(lang==='en' ? '⚠ Copy failed' : '⚠ Kopiowanie nieudane', true);
  }
}

// ── Load from URL hash on startup ──────────────────────────
async function loadFromHash() {
  const hash = window.location.hash;
  if(!hash.startsWith('#share=')) return false;
  if (hash.length > SHARE_LIMITS.maxHashChars) return false;

  const encoded = hash.slice('#share='.length);
  if(!encoded) return false;
  if (encoded.length > SHARE_LIMITS.maxEncodedChars) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return false;

  try {
    const bytes = base64urlToUint8(encoded);
    if (bytes.length > SHARE_LIMITS.maxDecodedBytes) return false;

    // Try 1: decompress as plain text (unencrypted, v1 or v2 open link)
    let payload = null;
    let jsonStr = null;
    try {
      jsonStr = await decompress(bytes);
      if (jsonStr && jsonStr.length > SHARE_LIMITS.maxJsonChars) return false;
      payload = JSON.parse(jsonStr);
    } catch(e) {
      // Not valid plain JSON after decompress — could be:
      // (a) v3 AES-GCM encrypted binary, or
      // (b) v2 XOR-obfuscated (legacy)
      // In both cases, decompress gave us bytes or garbled text.
      // We'll re-decompress the raw bytes and attempt AES-GCM first.
    }

    // If payload has pw:true it was flagged as password-protected
    if (payload && payload.pw) {
      // v2 legacy XOR path
      let pw;
      try {
        pw = await _promptPassword(
          lang === 'en'
            ? '🔒 This team is password protected. Enter the password to unlock it.'
            : '🔒 Ten zespół jest chroniony hasłem. Podaj hasło, aby go odblokować.'
        );
      } catch(e) { return false; } // user cancelled

      while (true) {
        const decrypted = xorObfuscate(jsonStr, pw);
        try {
          payload = JSON.parse(decrypted);
          break; // success
        } catch(e2) {
          _unlockShowError();
          try {
            pw = await _promptPassword();
          } catch(e3) { return false; }
        }
      }
    }

    // If no valid plain payload yet → treat as v3 AES-GCM encrypted binary
    if (!payload) {
      let decompressedBytes;
      try {
        decompressedBytes = await _decompressBytes(bytes);
      } catch(e) {
        decompressedBytes = bytes; // maybe not compressed
      }

      let pw;
      try {
        pw = await _promptPassword(
          lang === 'en'
            ? '🔒 This team is password protected (AES-256-GCM). Enter the password to unlock it.'
            : '🔒 Ten zespół jest zaszyfrowany (AES-256-GCM). Podaj hasło, aby go odblokować.'
        );
      } catch(e) { return false; }

      while (true) {
        try {
          const decrypted = await aesGcmDecrypt(decompressedBytes, pw);
          if (decrypted.length > SHARE_LIMITS.maxJsonChars) return false;
          payload = JSON.parse(decrypted);
          break; // success
        } catch(e) {
          _unlockShowError();
          try {
            pw = await _promptPassword();
          } catch(e2) { return false; }
        }
      }
    }

    const validated = validateSharePayload(payload);
    if(!validated) {
      trackEvent('share_loaded', { success: false, reason: 'invalid_schema' });
      return false;
    }

    // Restore state
    currentTopic = validated.topic || 'Shared Team';
    currentLevel = validated.level || 'iskra';
    if(validated.lang) lang = validated.lang;
    generatedAgents = validated.agents;
    generatedFiles  = validated.files || {};
    versionHistory  = [{
      id: Date.now(),
      label: lang==='en' ? `Shared: ${currentTopic}` : `Udostępniony: ${currentTopic}`,
      ts: new Date(validated.ts || Date.now()),
      agents: JSON.parse(JSON.stringify(generatedAgents)),
      files:  JSON.parse(JSON.stringify(generatedFiles)),
      diff: { added: [], removed: [], changed: [] },
      removedNames: {},
      agentNames: Object.fromEntries(generatedAgents.map(a => [a.id, a.name])),
      vNum: 1,
      isOrigin: true,
    }];

    // Show results
    showResults();

    // Show shared banner
    const banner = document.getElementById('shared-banner');
    const bannerTitle = document.getElementById('shared-banner-title');
    const bannerSub   = document.getElementById('shared-banner-sub');
    if(banner) {
      bannerTitle.textContent = lang==='en'
        ? `🔗 Shared team: "${currentTopic}"`
        : `🔗 Udostępniony zespół: "${currentTopic}"`;
      bannerSub.textContent = lang==='en'
        ? `${generatedAgents.length} agents · Read-only view · Start Over to create your own`
        : `${generatedAgents.length} agentów · Widok tylko do odczytu · Zacznij od nowa, by stworzyć własny`;
      banner.style.display = 'flex';
    }

    // Clean hash from URL (so refresh doesn't re-load)
    history.replaceState(null, '', window.location.pathname + window.location.search);
    trackEvent('share_loaded', { success: true, agents: generatedAgents.length });

    return true;
  } catch(e) {
    console.warn('[AgentSpark] Failed to load shared URL:', e);
    trackEvent('share_loaded', {
      success: false,
      reason: String(e?.message || 'exception').slice(0, 120)
    });
    return false;
  }
}

document.getElementById('share-modal').addEventListener('click', function(e) {
  if(e.target === this) closeShareModal();
});
document.getElementById('playground-modal').addEventListener('click', function(e) {
  if(e.target === this) closePlayground();
});
document.getElementById('template-detail-overlay').addEventListener('click', function(e) {
  if(e.target === this) closeTemplateDetail();
});
document.getElementById('unlock-modal').addEventListener('click', function(e) {
  if(e.target === this) _unlockReject();
});

// ─── THEME ────────────────────────────────────────────────
function _toggleThemeCore() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('agentspark-theme', next);
  document.getElementById('theme-toggle-btn').textContent = next === 'light' ? '☀️' : '🌙';
  // Sync PWA theme-color meta
  const metaTC = document.getElementById('meta-theme-color');
  if(metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
}

// Global wrapper called by onclick="toggleTheme()"
// Short click = toggle + save manual preference
// Long press (600ms) = reset to OS auto-detect
let _themeHoldTimer = null;
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
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
    showNotif(lang === 'en' ? '🎨 Theme: following OS preference' : '🎨 Motyw: podąża za ustawieniami systemu');
  }, 600);
}

// Init theme from localStorage or auto-detect from OS
(function() {
  const saved = localStorage.getItem('agentspark-theme');
  // If user never manually picked → follow OS preference
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  // Set correct icon after DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  });
  // Listen for OS-level theme changes — only apply if user hasn't manually overridden
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('agentspark-theme')) return; // user has manual pref — respect it
    const next = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.content = next === 'light' ? '#faf7ee' : '#1a170d';
  });
})();

// ─── INIT ─────────────────────────────────────────────────
(async () => {
  const loaded = await loadFromHash();
  if(!loaded) renderTopicScreen();
  refreshStaticI18n();
  maybeShowOnboarding();
  loadFeaturedTemplates();
})();

// ─── NEW FEATURES 2026 ──────────────────────────────────
function startQuickTeam(type) {
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
  
  const config = configs[type];
  if(!config) return;
  
  currentTopic = config.topic;
  showScreen('chat');
  renderProgressSteps(3); // Show full progress
  
  // Fake chat history for context
  chatHistory = [
    { role: 'user', text: `I need a ${config.topic}.` },
    { role: 'ai', text: `I'll create a team with: ${config.roles.join(', ')}.` }
  ];
  
  // Trigger generation
  generateAgents();
}

function regenerateTeam() {
  if(confirm(lang === 'en' ? 'Regenerate team with same settings?' : 'Wygenerować ponownie zespół z tymi samymi ustawieniami?')) {
    showScreen('chat');
    generateAgents();
  }
}

function loadPlaygroundExample(type) {
  const examples = {
    support: "**User:** Kupiłem produkt X, ale przyszedł uszkodzony. Co mam zrobić?\n**Agent:** Bardzo mi przykro z tego powodu. Proszę podać numer zamówienia, a natychmiast zajmę się procesem reklamacji i wymianą towaru na nowy.",
    content: "**User:** Przygotuj plan postów na LinkedIn na temat AI w marketingu.\n**Agent:** Oto propozycja na 4 tygodnie:\nTydzień 1: Wprowadzenie do AI (Post edukacyjny)\nTydzień 2: Case study wdrożenia (Dowód słuszności)\nTydzień 3: Narzędzia, których używamy (Praktyka)\nTydzień 4: Przyszłość AI w 2026 (Wizjonerski)",
    saas: "**User:** Przeanalizuj konkurencję dla CRM dla małych firm.\n**Agent:** Głośni konkurenci:\n1. HubSpot (Darmowy start, drogie skalowanie)\n2. Pipedrive (Skupienie na sprzedaży)\n3. Zoho (Wszystko w jednym)\nTwoja szansa: Prostota i AI-first podejście."
  };
  
  const text = examples[type];
  if(!text) return;
  
  const container = document.getElementById('playground-messages');
  container.innerHTML = '';
  
  text.split('\n').forEach(line => {
    if(!line.trim()) return;
    const isUser = line.startsWith('**User:**');
    const content = line.replace(/^\*\*(User|Agent):\*\*\s*/, '');
    const div = document.createElement('div');
    div.className = isUser ? 'msg-user' : 'msg-agent';
    div.textContent = content;
    container.appendChild(div);
  });
  
  document.getElementById('pg-examples').style.display = 'none';
}

// ─── PWA ──────────────────────────────────────────────────

(function initPWA() {

  // ── 1. Inline Manifest ────────────────────────────────
  const manifest = {
    name: 'AgentSpark',
    short_name: 'AgentSpark',
    description: 'Build your AI agent team in minutes',
    start_url: './',
    display: 'standalone',
    background_color: '#1a170d',
    theme_color: '#1a170d',
    orientation: 'any',
    categories: ['productivity', 'developer', 'utilities'],
    icons: [
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='40' fill='%231a170d'/%3E%3Crect width='192' height='192' rx='40' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='192' y2='192' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23f2b90d' stop-opacity='.3'/%3E%3Cstop offset='1' stop-color='%23c49a0a' stop-opacity='.3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ctext x='96' y='128' font-size='96' text-anchor='middle' fill='%23f2b90d'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E",
        sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable'
      },
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='100' fill='%231a170d'/%3E%3Crect width='512' height='512' rx='100' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='512' y2='512' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23f2b90d' stop-opacity='.3'/%3E%3Cstop offset='1' stop-color='%23c49a0a' stop-opacity='.3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ctext x='256' y='340' font-size='256' text-anchor='middle' fill='%23f2b90d'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E",
        sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable'
      }
    ],
    screenshots: [],
    shortcuts: [
      {
        name: 'New Team',
        short_name: 'New',
        description: 'Start building a new AI agent team',
        url: './',
        icons: [{ src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Ctext y='80' font-size='80'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E", sizes: '96x96' }]
      }
    ]
  };

  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const manifestURL  = URL.createObjectURL(manifestBlob);
  const manifestLink = document.getElementById('pwa-manifest');
  if(manifestLink) manifestLink.href = manifestURL;

  // ── 2. Service Worker (inline as Blob) ────────────────
  const CACHE_NAME = 'agentspark-v1';

  const swCode = `
const CACHE = '${CACHE_NAME}';
const FONTS = [
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;600;800&display=swap',
  'https://fonts.gstatic.com'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // Cache the app shell itself (the HTML)
      return c.addAll(['./']).catch(() => {});
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Network-first for API calls (never cache)
  if(url.hostname.includes('googleapis.com') && url.pathname.includes('generateContent')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if(url.hostname.includes('openai.com') ||
     url.hostname.includes('anthropic.com') ||
     url.hostname.includes('mistral.ai') ||
     url.hostname.includes('groq.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for fonts and static assets
  if(url.hostname.includes('fonts.g') || e.request.destination === 'font') {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // Stale-while-revalidate for the app shell
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if(res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached || new Response('Offline', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));
        return cached || fetchPromise;
      })
    )
  );
});

// Listen for skip-waiting message from update toast
self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
`;

  let swRegistration = null;
  let newWorker = null;

  if('serviceWorker' in navigator) {
    const swBlob = new Blob([swCode], { type: 'text/javascript' });
    const swURL  = URL.createObjectURL(swBlob);

    navigator.serviceWorker.register(swURL)
      .then(reg => {
        swRegistration = reg;

        // Detect update (new SW waiting)
        reg.addEventListener('updatefound', () => {
          newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if(newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast();
            }
          });
        });

        // Check for update on focus
        window.addEventListener('focus', () => reg.update());
      })
      .catch(err => console.warn('[AgentSpark SW]', err));

    // Reload page when new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // ── 3. Offline / Online detection ────────────────────
  const offlineBar = document.getElementById('offline-bar');

  function updateOnlineStatus() {
    if(!offlineBar) return;
    const isOffline = !navigator.onLine;
    if (isOffline) {
        offlineBar.classList.add('visible');
        setTimeout(() => offlineBar.classList.remove('visible'), 4000);
    } else {
        offlineBar.classList.remove('visible');
    }
  }

  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus(); // initial check

  // ── 4. Install prompt (A2HS) ─────────────────────────
  let deferredPrompt = null;
  const DISMISSED_KEY = 'agentspark-pwa-dismissed';

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;

    // Don't show if previously dismissed (within 7 days)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if(dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return;

    // Show install banner after a brief delay
    setTimeout(showInstallBanner, 3000);
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    if(typeof showNotif === 'function') {
      showNotif(tr('✓ AgentSpark installed!', '✓ AgentSpark zainstalowany!'));
    }
    deferredPrompt = null;
  });

  function showInstallBanner() {
    if(document.getElementById('pwa-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-install-icon">⚡</div>
      <div class="pwa-install-text">
        <div class="pwa-install-title">${tr('Install AgentSpark', 'Zainstaluj AgentSpark')}</div>
        <div class="pwa-install-sub">${tr('Add to home screen — works offline', 'Dodaj do ekranu glownego — dziala offline')}</div>
      </div>
      <div class="pwa-install-actions">
        <button class="pwa-install-btn" onclick="window._pwaInstall()">${tr('Install', 'Instaluj')}</button>
        <button class="pwa-dismiss-btn" onclick="window._pwaDismiss()">✕</button>
      </div>
    `;
    document.body.appendChild(banner);
  }

  function hideInstallBanner() {
    const b = document.getElementById('pwa-install-banner');
    if(b) {
      b.style.animation = 'none';
      b.style.opacity = '0';
      b.style.transform = 'translateY(20px)';
      b.style.transition = 'all 0.3s ease';
      setTimeout(() => b.remove(), 300);
    }
  }

  window._pwaInstall = async () => {
    if(!deferredPrompt) return;
    hideInstallBanner();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if(outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, Date.now());
    }
  };

  window._pwaDismiss = () => {
    hideInstallBanner();
    localStorage.setItem(DISMISSED_KEY, Date.now());
  };

  // ── 5. Update toast ───────────────────────────────────
  function showUpdateToast() {
    if(document.getElementById('pwa-update-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.className = 'pwa-update-toast pwa-bottom-sheet';
    toast.innerHTML = `
      <span>🔄 ${tr('New version available', 'Dostepna nowa wersja')}</span>
      <button class="pwa-update-btn" onclick="window._pwaUpdate()">${tr('Update', 'Aktualizuj')}</button>
      <button class="pwa-dismiss-btn" onclick="this.parentElement.remove()" style="font-size:0.7rem;padding:0.25rem 0.5rem;">✕</button>
    `;
    document.body.appendChild(toast);
    // Auto-hide after 15s
    setTimeout(() => toast.remove(), 15000);
  }

  window._pwaUpdate = () => {
    document.getElementById('pwa-update-toast')?.remove();
    if(newWorker) newWorker.postMessage('skipWaiting');
    else if(swRegistration?.waiting) swRegistration.waiting.postMessage('skipWaiting');
  };

  // ── 6. Theme-color sync with dark/light toggle ────────
  // Handled directly inside toggleTheme() / _toggleThemeCore()

  // Initial sync of meta theme-color on PWA startup
  (function() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const metaTC = document.getElementById('meta-theme-color');
    if(metaTC) metaTC.content = isDark ? '#1a170d' : '#faf7ee';
  })();

})();

document.getElementById('modal').addEventListener('click', function(e) {
  if(e.target === this) closeModal();
});
document.getElementById('md-browser-modal').addEventListener('click', function(e) {
  if(e.target === this) closeMdBrowser();
});

// ── iOS: tap backdrop to dismiss ALL modal-overlays ────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) {
      // Find and trigger the close button
      const closeBtn = this.querySelector('.modal-close');
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
  document.getElementById('nav-drawer').classList.add('open');
  document.getElementById('nav-drawer-overlay').classList.add('open');
  const btn = document.getElementById('burger-btn');
  if (btn) { btn.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  document.body.style.overflow = 'hidden';
  updateDrawerActive();
}

function closeDrawer() {
  _drawerOpen = false;
  document.getElementById('nav-drawer').classList.remove('open');
  const overlay = document.getElementById('nav-drawer-overlay');
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.classList.remove('open'); overlay.style.opacity = ''; }, 280);
  const btn = document.getElementById('burger-btn');
  if (btn) { btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  document.body.style.overflow = '';
}

function updateDrawerActive() {
  const screens = ['home','projects','chat','results'];
  let active = 'home';
  screens.forEach(s => {
    const screen = document.getElementById('screen-' + (s === 'home' ? 'topic' : s));
    if (screen && screen.classList.contains('active')) active = s;
  });
  document.querySelectorAll('.drawer-nav-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById('dnav-' + active);
  if (activeEl) activeEl.classList.add('active');
  // Badge
  const tabBadge = document.getElementById('tab-badge');
  const dnavBadge = document.getElementById('dnav-badge');
  if (dnavBadge && tabBadge) {
    dnavBadge.textContent = tabBadge.textContent;
    dnavBadge.style.display = tabBadge.style.display;
  }
  // Theme icon
  const themeIcon = document.getElementById('dnav-theme-icon');
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
    const btn = document.getElementById('back-to-top');
    if (btn) btn.classList.toggle('visible', visible);
  }
}
window.addEventListener('scroll', _syncBackToTop, { passive: true });

// ── CONTEXT BAR ────────────────────────────────────────────
const _ctxBarConfigs = {
  topic:    { btns: [
    { label: '⚡ Generate', cls: 'primary', fn: 'startWithTopic()' }
  ]},
  chat:     { btns: [
    { label: '↩ Cancel', cls: '', fn: 'restart()' },
  ]},
  results:  { btns: [
    { label: '↩ Start Over', cls: '', fn: 'restart()' }
  ]},
  projects: { btns: [
    { label: '+ New Project', cls: 'primary', fn: "showScreen('topic')" }
  ]},
};

function _updateContextBar(screenName) {
  const bar = document.getElementById('sticky-context-bar');
  if (!bar) return;
  const cfg = _ctxBarConfigs[screenName];
  if (!cfg) { bar.classList.remove('visible'); return; }
  bar.innerHTML = cfg.btns.map(b =>
    `<button class="ctx-btn ${b.cls}" onclick="${b.fn}">${b.label}</button>`
  ).join('');
  // small delay so spring animation triggers after paint
  requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add('visible')));
}

// ── HOME SEGMENTED NAVIGATION ──────────────────────────────
let _activeHomePanel = 'topics';

function switchHomePanel(panel) {
  _activeHomePanel = panel;
  ['topics','projects','custom'].forEach(p => {
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
  const list  = document.getElementById('home-projects-list');
  const empty = document.getElementById('home-projects-empty');
  const search = (document.getElementById('home-projects-search')?.value || '').toLowerCase();
  if (!list) return;
  let projects = [];
  try { projects = await dbGetAll(); } catch(e) {}
  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search) || (p.topic||'').toLowerCase().includes(search))
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
      <div class="project-card-topic">📌 ${_escHtml(p.topic||tr('No topic','Brak tematu'))}</div>
      <div class="project-card-meta">
        ${(p.agents||[]).length ? `<span class="project-card-tag">👥 ${(p.agents||[]).length}</span>` : ''}
        ${p.level ? `<span class="project-card-tag">${p.level}</span>` : ''}
      </div>
      <div class="project-card-date">${tr('Updated','Zaktualizowano')} ${_formatDate(p.updatedAt)}</div>
    </div>
  `).join('');
}

// ── SWIPE GESTURES ON PROJECT CARDS ───────────────────────
function _initSwipeGestures() {
  const list = document.getElementById('projects-list');
  if (!list || window.innerWidth > 768) return;

  let startX = 0, startY = 0, currentWrap = null, currentCard = null;
  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE = 216; // 3 × 72px

  list.addEventListener('touchstart', e => {
    const wrap = e.target.closest('.project-card-wrap');
    if (!wrap) return;
    currentWrap = wrap;
    currentCard = wrap.querySelector('.project-card');
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    if (currentCard) currentCard.style.transition = 'none';
  }, { passive: true });

  list.addEventListener('touchmove', e => {
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

  list.addEventListener('touchend', e => {
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
  document.addEventListener('touchstart', e => {
    if (!e.target.closest('.project-card-wrap')) {
      list.querySelectorAll('.project-card').forEach(c => {
        c.style.transition = '';
        c.style.transform = 'translateX(0)';
      });
    }
  }, { passive: true });
}

// ── ACCORDION INSTRUCTIONS ─────────────────────────────────
function _renderAccordionInstructions(steps) {
  const container = document.getElementById('instr-steps');
  if (!container) return;
  container.innerHTML = '';
  steps.forEach((step, i) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <div class="accordion-header" onclick="_toggleAccordion(this.parentElement)" role="button" tabindex="0"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();_toggleAccordion(this.parentElement)}">
        <div class="accordion-num">0${i+1}</div>
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

function _toggleAccordion(item) {
  const isOpen = item.classList.contains('open');
  // Close all siblings
  item.parentElement.querySelectorAll('.accordion-item.open').forEach(el => {
    el.classList.remove('open');
  });
  if (!isOpen) item.classList.add('open');
}

// ── PATCH showInstructions to use accordion ────────────────
const _origShowInstructions = window.showInstructions;
window.showInstructions = function() {
  const section = document.getElementById('instructions-section');
  const isHidden = getComputedStyle(section).display === 'none';
  section.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    document.getElementById('instr-title').textContent = t('instrTitle');
    _renderAccordionInstructions(t('instrSteps'));
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ── PATCH showScreen to update context bar + drawer ────────
const _origShowScreen = window.showScreen;
window.showScreen = function(name) {
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
(function() {
  let startY = 0, startScrollTop = 0, sheetEl = null, overlayEl = null;
  let isDragging = false;

  document.addEventListener('touchstart', function(e) {
    const overlay = e.target.closest('.modal-overlay.open, .ios-sheet-overlay.open');
    if (!overlay) return;
    const sheet = overlay.querySelector('.modal, .share-modal, .fw-modal, .ios-sheet');
    if (!sheet) return;
    // Only start if touch begins on the handle area (top 40px of sheet) or not in scrollable content
    const touch = e.touches[0];
    const sheetRect = sheet.getBoundingClientRect();
    const touchRelY = touch.clientY - sheetRect.top;
    const scrollable = e.target.closest('.modal-body, .ios-sheet-body, .fw-body');
    if (scrollable && scrollable.scrollTop > 0) return; // don't drag if scrolled
    if (touchRelY > 80 && !e.target.closest('.modal::before')) {
      // Only drag from top 80px
      if (touchRelY > 80 && scrollable) return;
    }
    startY = touch.clientY;
    sheetEl = sheet;
    overlayEl = overlay;
    isDragging = true;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!isDragging || !sheetEl) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0) {
      sheetEl.style.transform = `translateY(${Math.pow(delta, 0.8)}px)`;
      sheetEl.style.transition = 'none';
      overlayEl.style.background = `rgba(0,0,0,${Math.max(0, 0.55 - delta/400)})`;
    }
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
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
  btn.addEventListener('click', function() {
    this.querySelectorAll('.tab-icon').forEach(icon => {
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
function showSwToast(msg, isError = true) {
  const old = document.querySelector('.sw-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'sw-toast';
  el.innerHTML = `
    <span class="sw-toast-icon">${isError ? '⚠' : 'ℹ'}</span>
    <span>${msg}</span>
    <button class="sw-toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition='opacity 0.3s'; el.style.opacity='0'; setTimeout(()=>el.remove(),320); }, 6000);
}


// ── Bottom nav hide-on-scroll-down (mobile only) ──────────
(function() {
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

    const tabBar = document.getElementById('ios-tab-bar');
    const ctxBar = document.getElementById('sticky-context-bar');
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
  window.showScreen = function(name) {
    _origShowScreenP7(name);
    _tabHidden = false;
    document.getElementById('ios-tab-bar')?.classList.remove('hidden-by-scroll');
    document.getElementById('sticky-context-bar')?.classList.remove('tab-hidden');
    _lastScroll = 0;
  };
})();

</script>
