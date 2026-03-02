import { state, updateState } from '../core/state.js';

let _isGeneratingTeam = false;

function addMessage(role: string, text: string) {
    const container = (document.getElementById('chat-messages') as HTMLElement);
    if (!container) return;
    const cleanText = text.replace('[INTERVIEW_COMPLETE]', '').trim();
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = role === 'ai' ? '⚡ AgentSpark' : (state.lang === 'en' ? 'You' : 'Ty');
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (role === 'user') {
        bubble.textContent = cleanText;
    } else {
        bubble.innerHTML = window.sanitizeRichText ? window.sanitizeRichText(cleanText) : cleanText;
    }
    div.appendChild(sender);
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
    removeTypingIndicator();
    const container = (document.getElementById('chat-messages') as HTMLElement);
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

function removeTypingIndicator() {
    const el = (document.getElementById('typing-indicator') as HTMLElement);
    if (el) el.remove();
}

function startChat() {
    if (window.showScreen) window.showScreen('chat');
    chatHistory = [];
    questionCount = 0;
    conversationState = 'interview';

    // UI Updates
    const apiKeyHeader = (document.getElementById('apiKeyHeader') as HTMLElement);
    if (apiKeyHeader) apiKeyHeader.style.display = 'flex';
    const apiKeyInput = (document.getElementById('apiKeyInput') as HTMLInputElement);
    if (apiKeyInput) apiKeyInput.value = state.apiKey || '';

    const sidebarTopic = (document.getElementById('sidebar-topic') as HTMLElement);
    if (sidebarTopic) sidebarTopic.textContent = state.currentTopic || '';

    const chatTitle = (document.getElementById('chat-title') as HTMLElement);
    if (chatTitle) chatTitle.textContent = window.t ? window.t('chatTitle') : 'Interview';

    if (window.renderProgressSteps) window.renderProgressSteps(0);

    const systemPrompt = window.getSystemPrompt();
    addTypingIndicator();

    window.callGemini(systemPrompt, `The user wants to build: "${state.currentTopic}". Start the interview with your FIRST question. Respond ONLY with the JSON object as specified.`, '🎤 Interview · Start', [])
        .then(reply => {
            removeTypingIndicator();
            let parsed = null;
            try {
                const m = reply.match(/\{[\s\S]*\}/);
                if (m) parsed = JSON.parse(m[0]);
            } catch (e) { }
            if (parsed && parsed.question && parsed.options) {
                addMessage('ai', parsed.question);
                window.renderOptions(parsed);
            } else {
                addMessage('ai', reply);
                window.renderOptionsLegacy(reply);
            }
        })
        .catch(err => {
            removeTypingIndicator();
            addMessage('ai', `Error: ${err.message}. Please check your API key.`);
        });
}

async function submitAnswer(answer: string) {
    if (window.clearOptions) window.clearOptions();
    addMessage('user', answer);

    state.chatHistory.push({ role: 'user', text: answer });
    state.questionCount++;

    if (state.conversationState === 'interview') {
        addTypingIndicator();
        try {
            const historyStr = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
            const prompt = `${historyStr}\n\nThis was answer ${state.questionCount} of ${window.MAX_QUESTIONS}. Ask next question or finalize.`;
            const reply = await window.callGemini(window.getSystemPrompt(), prompt, `🎤 Interview · Q${state.questionCount} of ${window.MAX_QUESTIONS}`, []);
            removeTypingIndicator();

            let parsed = null;
            try {
                const jsonMatch = reply.match(/\{[\s\S]*\}/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            } catch (e) { }

            if (parsed && parsed.complete) {
                if (parsed.summary) addMessage('ai', parsed.summary);
                state.chatHistory.push({ role: 'ai', text: parsed.summary || 'Interview complete.' });
                state.conversationState = 'generating';
                if (window.renderProgressSteps) window.renderProgressSteps(1);
                if (window.clearOptions) window.clearOptions();
                setTimeout(generateAgents, 1200);
            } else if (parsed && parsed.question && parsed.options) {
                addMessage('ai', parsed.question);
                state.chatHistory.push({ role: 'ai', text: parsed.question });
                window.renderOptions(parsed);
            } else {
                addMessage('ai', reply);
                state.chatHistory.push({ role: 'ai', text: reply });
                if (reply.includes('[INTERVIEW_COMPLETE]') || state.questionCount >= window.MAX_QUESTIONS) {
                    state.conversationState = 'generating';
                    if (window.renderProgressSteps) window.renderProgressSteps(1);
                    if (window.clearOptions) window.clearOptions();
                    setTimeout(generateAgents, 1200);
                } else {
                    window.renderOptionsLegacy(reply);
                }
            }
        } catch (err: any) {
            removeTypingIndicator();
            addMessage('ai', `Error: ${err.message}`);
        }
    }
}

async function generateAgents() {
    if (_isGeneratingTeam) return;
    _isGeneratingTeam = true;

    if (window.showLoader) window.showLoader(state.lang === 'en' ? 'Generating team...' : 'Generowanie zespołu...', true);
    addTypingIndicator();

    const historyStr = state.chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AgentSpark'}: ${m.text}`).join('\n');
    const prompt = `Here is the complete interview:\n${historyStr}\n\n[GENERATE]\nGenerate the agent team JSON now based on the interview.`;

    try {
        const raw = await window.callGemini(window.getSystemPrompt(), prompt, `⚡ Generate Team`, []);
        removeTypingIndicator();
        if (window.hideLoader) window.hideLoader();

        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Could not parse agent data');
        const data = JSON.parse(jsonMatch[0]);

        updateState({ generatedAgents: data.agents || [], generatedFiles: {} });

        state.generatedAgents.forEach((a: any) => {
            state.generatedFiles[`agent-${a.id}.md`] = a.agentMd || `# Agent: ${a.name}`;
            state.generatedFiles[`skill-${a.id}.md`] = a.skillMd || `# Skill: ${a.name}`;
        });
        state.generatedFiles['team-config.md'] = data.teamConfig || `# Team Configuration`;
        state.generatedFiles['README.md'] = window.generateReadme ? window.generateReadme() : '';

        if (window.renderProgressSteps) window.renderProgressSteps(3);
        addMessage('ai', state.lang === 'en' ? '✅ Done!' : '✅ Gotowe!');

        setTimeout(() => {
            if (window.showResults) window.showResults();
        }, 1800);
    } catch (err: any) {
        removeTypingIndicator();
        if (window.hideLoader) window.hideLoader();
        addMessage('ai', `Generation error: ${err.message}`);
    } finally {
        _isGeneratingTeam = false;
    }
}

// Export
window.startChat = startChat;
window.submitAnswer = submitAnswer;
window.generateAgents = generateAgents;
window.addMessage = addMessage;
window.addTypingIndicator = addTypingIndicator;
window.removeTypingIndicator = removeTypingIndicator;
