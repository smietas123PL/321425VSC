// ─── FEATURES/INTERVIEW.TS ───────────────────────────────
// Fixed: TS7006 implicit params, TS2554 callGemini arg count,
//        TS2345 chatHistory push never, TS18046 unknown err,
//        TS7015/2339 generatedFiles/generatedAgents access

// NOTE: This file uses global vars declared in db.ts / globals.d.ts:
//   chatHistory, questionCount, conversationState, MAX_QUESTIONS
//   generatedAgents, generatedFiles, currentTopic, lang

// ─── Chat message type ────────────────────────────────────
interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
}

let _isGeneratingTeam = false;

// ─── Message rendering ────────────────────────────────────
function addMessage(role: string, text: string): void {
  const container = document.getElementById('chat-messages') as HTMLElement | null;
  if (!container) return;
  const cleanText = text.replace('[INTERVIEW_COMPLETE]', '').trim();
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  const sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = role === 'ai'
    ? '⚡ AgentSpark'
    : (lang === 'en' ? 'You' : 'Ty');

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (role === 'user') {
    bubble.textContent = cleanText;
  } else {
    // AI messages: use sanitizer when available; otherwise escape before innerHTML
    if (window.sanitizeRichText) {
      bubble.innerHTML = window.sanitizeRichText(cleanText);
    } else {
      // XSS-safe fallback: escape HTML entities, convert newlines to <br>
      const esc = cleanText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      bubble.innerHTML = esc;
    }
  }


  div.appendChild(sender);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addTypingIndicator(): void {
  removeTypingIndicator();
  const container = document.getElementById('chat-messages') as HTMLElement | null;
  if (!container) return;
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

function removeTypingIndicator(): void {
  const el = document.getElementById('typing-indicator') as HTMLElement | null;
  if (el) el.remove();
}

// ─── Start chat ───────────────────────────────────────────
function startChat(): void {
  showScreen('chat');
  // chatHistory is declared as var any[] in globals.d.ts
  (chatHistory as ChatMsg[]).length = 0;
  questionCount = 0;
  conversationState = 'interview';

  const apiKeyHeader = document.getElementById('apiKeyHeader') as HTMLElement | null;
  if (apiKeyHeader) apiKeyHeader.style.display = 'flex';
  const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement | null;
  if (apiKeyInput) apiKeyInput.value = apiKey || '';

  const sidebarTopic = document.getElementById('sidebar-topic') as HTMLElement | null;
  if (sidebarTopic) sidebarTopic.textContent = currentTopic || '';

  const chatTitle = document.getElementById('chat-title') as HTMLElement | null;
  if (chatTitle) chatTitle.textContent = t('chatTitle') || 'Interview';

  if (window.renderProgressSteps) window.renderProgressSteps(0);

  const systemPrompt = window.getSystemPrompt ? window.getSystemPrompt() : '';
  addTypingIndicator();

  // callGemini requires 4 args: sysPrompt, userMsg, traceLabel, multiTurn[]
  callGemini(
    systemPrompt,
    `The user wants to build: "${currentTopic}". Start the interview with your FIRST question. Respond ONLY with the JSON object as specified.`,
    '🎤 Interview · Start',
    []
  )
    .then((reply: string) => {
      removeTypingIndicator();
      let parsed: any = null;
      try {
        const m = reply.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      } catch (e) { /* fallback */ }

      if (parsed && parsed.question && parsed.options) {
        addMessage('ai', parsed.question);
        if (window.renderOptions) window.renderOptions(parsed);
      } else {
        addMessage('ai', reply);
        if (window.renderOptionsLegacy) window.renderOptionsLegacy(reply);
      }
    })
    .catch((err: unknown) => {
      removeTypingIndicator();
      const msg = err instanceof Error ? err.message : String(err);
      addMessage('ai', `Error: ${msg}. Please check your API key.`);
    });
}

// ─── Submit answer ────────────────────────────────────────
async function submitAnswer(answer: string): Promise<void> {
  if (window.clearOptions) window.clearOptions();
  addMessage('user', answer);

  // chatHistory typed as any[] — push typed msg object
  (chatHistory as ChatMsg[]).push({ role: 'user', text: answer });
  questionCount++;

  if (conversationState === 'interview') {
    addTypingIndicator();
    try {
      const historyStr = (chatHistory as ChatMsg[])
        .map((m: ChatMsg) => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`)
        .join('\n');
      const prompt = `${historyStr}\n\nThis was answer ${questionCount} of ${MAX_QUESTIONS}. Ask next question or finalize.`;

      const reply = await callGemini(
        window.getSystemPrompt ? window.getSystemPrompt() : '',
        prompt,
        `🎤 Interview · Q${questionCount} of ${MAX_QUESTIONS}`,
        []
      );
      removeTypingIndicator();

      let parsed: any = null;
      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (e) { /* fallback */ }

      if (parsed && parsed.complete) {
        if (parsed.summary) addMessage('ai', parsed.summary);
        (chatHistory as ChatMsg[]).push({ role: 'ai', text: parsed.summary || 'Interview complete.' });
        conversationState = 'generating';
        if (window.renderProgressSteps) window.renderProgressSteps(1);
        if (window.clearOptions) window.clearOptions();
        setTimeout(generateAgents, 1200);
      } else if (parsed && parsed.question && parsed.options) {
        addMessage('ai', parsed.question);
        (chatHistory as ChatMsg[]).push({ role: 'ai', text: parsed.question });
        if (window.renderOptions) window.renderOptions(parsed);
      } else {
        addMessage('ai', reply);
        (chatHistory as ChatMsg[]).push({ role: 'ai', text: reply });
        if (reply.includes('[INTERVIEW_COMPLETE]') || questionCount >= MAX_QUESTIONS) {
          conversationState = 'generating';
          if (window.renderProgressSteps) window.renderProgressSteps(1);
          if (window.clearOptions) window.clearOptions();
          setTimeout(generateAgents, 1200);
        } else {
          if (window.renderOptionsLegacy) window.renderOptionsLegacy(reply);
        }
      }
    } catch (err: unknown) {
      removeTypingIndicator();
      const msg = err instanceof Error ? err.message : String(err);
      addMessage('ai', `Error: ${msg}`);
    }
  }
}

// ─── Generate agents ──────────────────────────────────────
async function generateAgents(): Promise<void> {
  if (_isGeneratingTeam) return;
  _isGeneratingTeam = true;

  showLoader(lang === 'en' ? 'Generating team...' : 'Generowanie zespołu...', true);
  addTypingIndicator();

  const historyStr = (chatHistory as ChatMsg[])
    .map((m: ChatMsg) => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`)
    .join('\n');
  const prompt = `Here is the complete interview:\n${historyStr}\n\n[GENERATE]\nGenerate the agent team JSON now based on the interview.`;

  try {
    const raw = await callGemini(
      window.getSystemPrompt ? window.getSystemPrompt() : '',
      prompt,
      '⚡ Generate Team',
      []
    );
    removeTypingIndicator();
    hideLoader();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse agent data');
    const data = JSON.parse(jsonMatch[0]);

    generatedAgents = data.agents || [];
    // generatedFiles declared as Record<string, string> — safe to assign
    generatedFiles = {} as Record<string, string>;

    generatedAgents.forEach((a: any) => {
      (generatedFiles as Record<string, string>)[`agent-${a.id}.md`] =
        a.agentMd || `# Agent: ${a.name}`;
      (generatedFiles as Record<string, string>)[`skill-${a.id}.md`] =
        a.skillMd || `# Skill: ${a.name}`;
    });
    (generatedFiles as Record<string, string>)['team-config.md'] =
      data.teamConfig || `# Team Configuration`;
    (generatedFiles as Record<string, string>)['README.md'] =
      typeof generateReadme === 'function' ? generateReadme() : '';

    if (window.renderProgressSteps) window.renderProgressSteps(3);
    addMessage('ai', lang === 'en' ? '✅ Done!' : '✅ Gotowe!');

    setTimeout(() => {
      if (typeof showResults === 'function') showResults();
    }, 1800);
  } catch (err: unknown) {
    removeTypingIndicator();
    hideLoader();
    const msg = err instanceof Error ? err.message : String(err);
    addMessage('ai', `Generation error: ${msg}`);
  } finally {
    _isGeneratingTeam = false;
  }
}

// ─── Window exports ───────────────────────────────────────
window.startChat = startChat;
window.submitAnswer = submitAnswer;
window.generateAgents = generateAgents;
window.addMessage = addMessage;
window.addTypingIndicator = addTypingIndicator;
window.removeTypingIndicator = removeTypingIndicator;
