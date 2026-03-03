// ─── FEATURES/PLAYGROUND.TS ──────────────────────────────
// Fixed: TS7034/7005 implicit typed vars, TS2339 .value/.disabled/.style,
//        TS2322 dataset.idx number, TS7006 implicit params, TS7053 index type,
//        TS18046 unknown error, TS2339 .click on Element
// Fixed (XSS): pgAddMessage used innerHTML with user text — replaced with
//        _pgEsc() HTML-escaped insertions to prevent stored/reflected XSS.

// XSS-safe HTML escape helper (module scope, used inside IIFE)
function _pgEsc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


(function () {
  // TS7034 fix: explicit types
  let playgroundAgent: any = null;
  let playgroundHistory: any[] = [];

  function openPlayground(): void {
    if (!generatedAgents.length) {
      showNotif(lang === 'en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
      return;
    }
    playgroundHistory = [];
    renderPlaygroundTabs();
    (document.getElementById('playground-modal') as HTMLElement).classList.add('open');
    // TS2339 fix: cast querySelectorAll result element to HTMLElement for .click()
    const firstTab = (document.getElementById('playground-agent-tabs') as HTMLElement)
      .querySelector('.pg-tab') as HTMLElement | null;
    if (firstTab) firstTab.click();
  }

  function closePlayground(): void {
    (document.getElementById('playground-modal') as HTMLElement).classList.remove('open');
  }

  function renderPlaygroundTabs(): void {
    const container = document.getElementById('playground-agent-tabs') as HTMLElement;
    container.innerHTML = '';
    generatedAgents.forEach((agent: any, i: number) => {
      const btn = document.createElement('button');
      btn.className = 'pg-tab';
      // TS2322 fix: dataset values are strings
      btn.dataset.idx = String(i);
      // XSS fix: DOM API construction — agent.name/emoji come from LLM output
      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = agent.emoji || '🤖';
      btn.appendChild(emojiSpan);
      btn.appendChild(document.createTextNode(' ' + (agent.name || '')));
      btn.style.cssText = `
        background:var(--surface2);border:1px solid var(--border);color:var(--muted);
        border-radius:20px;padding:0.3rem 0.75rem;font-size:0.78rem;cursor:pointer;
        font-family:'Manrope',sans-serif;transition:all 0.15s;white-space:nowrap;`;
      btn.onclick = () => selectPlaygroundAgent(agent, btn);
      container.appendChild(btn);
    });
  }

  // TS7006 fix: explicit types for agent and btnEl params
  function selectPlaygroundAgent(agent: any, btnEl: HTMLElement): void {
    playgroundAgent = agent;
    playgroundHistory = [];
    // TS2339 fix: forEach element cast to HTMLElement for .style
    document.querySelectorAll('.pg-tab').forEach((b: Element) => {
      const el = b as HTMLElement;
      el.style.background = 'var(--surface2)';
      el.style.borderColor = 'var(--border)';
      el.style.color = 'var(--muted)';
    });
    btnEl.style.background = 'rgba(242,185,13,0.12)';
    btnEl.style.borderColor = 'var(--accent)';
    btnEl.style.color = 'var(--accent)';

    const msgs = document.getElementById('playground-messages') as HTMLElement;
    msgs.innerHTML = '';
    pgAddMessage('system', tr(
      `You are now talking to **${agent.emoji || '🤖'} ${agent.name}**\n${agent.description || ''}`,
      `Rozmawiasz teraz z **${agent.emoji || '🤖'} ${agent.name}**\n${agent.description || ''}`
    ));
    (document.getElementById('playground-status') as HTMLElement).textContent = '';
    (document.getElementById('playground-input') as HTMLInputElement).focus();
  }

  // TS7006 fix: explicit params
  function pgAddMessage(role: string, text: string): void {
    const msgs = document.getElementById('playground-messages') as HTMLElement;
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;gap:0.6rem;align-items:flex-start;${role === 'user' ? 'justify-content:flex-end;' : ''}`;
    const bubble = document.createElement('div');
    bubble.style.cssText = role === 'user'
      ? `max-width:78%;background:var(--accent);color:#1a170d;border-radius:12px 12px 4px 12px;padding:0.7rem 0.85rem;font-size:0.86rem;line-height:1.45;white-space:pre-wrap;`
      : `max-width:78%;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:12px 12px 12px 4px;padding:0.7rem 0.85rem;font-size:0.86rem;line-height:1.45;white-space:pre-wrap;`;
    // XSS fix: escape all dynamic text first, then convert newlines to <br> safely.
    // Previously: bubble.innerHTML = text.replace(/\n/g, '<br>') allowed XSS
    //             via any user message containing <script> or <img onerror=...>.
    bubble.innerHTML = _pgEsc(text).replace(/\n/g, '<br>');

    const avatar = document.createElement('div');
    avatar.style.cssText = `width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;flex-shrink:0;${role === 'user' ? 'order:2;background:rgba(242,185,13,0.15);' : 'background:var(--surface2);border:1px solid var(--border);'}`;
    // TS7005 fix: playgroundAgent is now typed any
    avatar.textContent = role === 'user' ? '👤' : role === 'system' ? 'ℹ' : (playgroundAgent?.emoji || '🤖');

    if (role === 'user') { wrap.appendChild(bubble); wrap.appendChild(avatar); }
    else { wrap.appendChild(avatar); wrap.appendChild(bubble); }
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function sendPlaygroundMessage(): Promise<void> {
    if (!playgroundAgent) {
      showNotif(tr('⚠ Select an agent first', '⚠ Najpierw wybierz agenta'), true);
      return;
    }
    // TS2339 fix: HTMLInputElement for .value, HTMLButtonElement for .disabled
    const inp = document.getElementById('playground-input') as HTMLInputElement;
    const sendBtn = document.getElementById('playground-send-btn') as HTMLButtonElement;
    const text = inp.value.trim();
    if (!text) return;

    pgAddMessage('user', text);
    // TS7005 fix: playgroundHistory is typed any[]
    playgroundHistory.push({ role: 'user', content: text });
    inp.value = '';
    inp.style.height = '44px';
    sendBtn.disabled = true;
    (document.getElementById('playground-status') as HTMLElement).textContent =
      `${playgroundAgent.name} is thinking…`;

    const msgs = document.getElementById('playground-messages') as HTMLElement;
    const typingDiv = document.createElement('div');
    typingDiv.style.cssText = 'display:flex;gap:0.6rem;align-items:center;';
    typingDiv.innerHTML = `
      <div style="width:26px;height:26px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);
      display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;">${playgroundAgent.emoji || '🤖'}</div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px 12px 12px 4px;padding:0.55rem 0.75rem;display:flex;gap:0.35rem;">
        <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
      </div>`;
    msgs.appendChild(typingDiv);
    msgs.scrollTop = msgs.scrollHeight;

    try {
      const systemPrompt = [
        playgroundAgent.agentMd || '',
        playgroundAgent.skillMd || '',
      ].join('\n\n') || `You are ${playgroundAgent.name}.\n${playgroundAgent.description || ''}`;

      const reply = await callGemini(
        systemPrompt,
        text,
        `🧪 Playground · ${playgroundAgent.name}`,
        // TS7005 fix: playgroundHistory typed any[]
        playgroundHistory
      );
      if (typingDiv.parentNode) msgs.removeChild(typingDiv);
      pgAddMessage('assistant', reply);
      playgroundHistory.push({ role: 'assistant', content: reply });
      (document.getElementById('playground-status') as HTMLElement).textContent =
        `${playgroundHistory.filter((m: any) => m.role === 'assistant').length} responses`;
    } catch (e: unknown) {
      // TS18046 fix: typed catch
      if (typingDiv.parentNode) msgs.removeChild(typingDiv);
      const msg = e instanceof Error ? e.message : String(e);
      pgAddMessage('system', `⚠ Error: ${msg}`);
      (document.getElementById('playground-status') as HTMLElement).textContent = 'Error';
    } finally {
      // TS2339 fix: sendBtn already typed as HTMLButtonElement
      sendBtn.disabled = false;
      inp.focus();
    }
  }

  function clearPlayground(): void {
    playgroundHistory = [];
    const msgs = document.getElementById('playground-messages') as HTMLElement;
    msgs.innerHTML = '';
    // TS7005 fix: playgroundAgent typed any
    if (playgroundAgent) {
      pgAddMessage('system', `Chat cleared. You are talking to **${playgroundAgent.emoji || '🤖'} ${playgroundAgent.name}**`);
    }
    (document.getElementById('playground-status') as HTMLElement).textContent = '';
  }

  function exportPlaygroundChat(): void {
    // TS7005 fix: playgroundHistory typed
    if (!playgroundHistory || playgroundHistory.length === 0) {
      showNotif(tr('No messages to export yet.', 'Brak wiadomosci do eksportu.'), true);
      return;
    }
    // TS7005 fix: playgroundAgent typed
    const agentName = playgroundAgent ? playgroundAgent.name : 'Agent';
    const agentEmoji = playgroundAgent ? (playgroundAgent.emoji || '🤖') : '🤖';
    const date = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    let md = `# 🧪 Playground Chat — ${agentEmoji} ${agentName}\n\n`;
    md += `**Project:** ${currentTopic || 'AgentSpark'}  \n`;
    md += `**Agent:** ${agentName}  \n`;
    md += `**Exported:** ${date} at ${time}  \n\n---\n\n`;

    playgroundHistory.forEach((msg: any) => {
      const isUser = msg.role === 'user';
      const speaker = isUser ? '👤 **You**' : `${agentEmoji} **${agentName}**`;
      md += `### ${speaker}\n\n${msg.content}\n\n---\n\n`;
    });
    md += '*Generated by [AgentSpark](https://agentspark.app)*';

    const slug = (currentTopic || 'chat').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const name = `playground-${slug}-${agentName.toLowerCase().replace(/\s+/g, '-')}.md`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    showNotif(tr('💾 Chat exported as Markdown!', '💾 Czat wyeksportowany do Markdown!'));
  }

  // TS7006 fix: explicit type param
  function loadPlaygroundExample(type: string): void {
    // TS7053 fix: typed Record so any key is valid
    const examples: Record<string, string> = {
      support: '**User:** Kupiłem produkt X, ale przyszedł uszkodzony. Co mam zrobić?\n**Agent:** Bardzo mi przykro. Proszę podać numer zamówienia.',
      content: '**User:** Przygotuj plan postów na LinkedIn na temat AI w marketingu.\n**Agent:** Oto propozycja na 4 tygodnie:\nTydzień 1: Wprowadzenie do AI.',
      saas: '**User:** Przeanalizuj konkurencję dla CRM.\n**Agent:** Głośni konkurenci:\n1. HubSpot\n2. Pipedrive\n3. Zoho.',
    };

    const text = examples[type];
    if (!text) return;

    const container = document.getElementById('playground-messages') as HTMLElement;
    container.innerHTML = '';
    // TS7006 fix: explicit param type
    text.split('\n').forEach((line: string) => {
      if (!line.trim()) return;
      const isUser = line.startsWith('**User:**');
      const content = line.replace(/^\*\*(User|Agent):\*\*\s*/, '');
      const div = document.createElement('div');
      div.className = isUser ? 'msg-user' : 'msg-agent';
      div.textContent = content;
      container.appendChild(div);
    });

    const pgExamples = document.getElementById('pg-examples') as HTMLElement | null;
    if (pgExamples) pgExamples.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const playgroundModal = document.getElementById('playground-modal') as HTMLElement | null;
    if (playgroundModal) {
      playgroundModal.addEventListener('click', function (e) {
        if (e.target === this) closePlayground();
      });
    }
  });

  window.openPlayground = openPlayground;
  window.closePlayground = closePlayground;
  window.sendPlaygroundMessage = sendPlaygroundMessage;
  window.clearPlayground = clearPlayground;
  window.exportPlaygroundChat = exportPlaygroundChat;
  window.loadPlaygroundExample = loadPlaygroundExample;
})();
