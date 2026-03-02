(function () {
  let playgroundAgent: any = null;
  let playgroundHistory: any[] = [];

  function openPlayground() {
    if (!generatedAgents.length) {
      showNotif(lang === 'en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
      return;
    }
    playgroundHistory = [];
    renderPlaygroundTabs();
    (document.getElementById('playground-modal') as HTMLElement).classList.add('open');
    const firstTab = (document.getElementById('playground-agent-tabs') as HTMLElement).querySelector('.pg-tab');
    if (firstTab) (firstTab as HTMLElement).click();
  }

  function closePlayground() {
    (document.getElementById('playground-modal') as HTMLElement).classList.remove('open');
  }

  function renderPlaygroundTabs() {
    const container = (document.getElementById('playground-agent-tabs') as HTMLElement);
    container.innerHTML = '';
    generatedAgents.forEach((agent, i) => {
      const btn = document.createElement('button');
      btn.className = 'pg-tab';
      btn.dataset.idx = String(i);
      btn.innerHTML = `<span>${agent.emoji || '🤖'}</span> ${agent.name}`;
      btn.style.cssText = `
        background:var(--surface2);border:1px solid var(--border);color:var(--muted);
        border-radius:20px;padding:0.3rem 0.75rem;font-size:0.78rem;cursor:pointer;
        font-family:'Manrope',sans-serif;transition:all 0.15s;white-space:nowrap;`;
      btn.onclick = () => selectPlaygroundAgent(agent, btn);
      container.appendChild(btn);
    });
  }

  function selectPlaygroundAgent(agent: any, btnEl: HTMLElement) {
    playgroundAgent = agent;
    playgroundHistory = [];
    document.querySelectorAll('.pg-tab').forEach((b: any) => {
      b.style.background = 'var(--surface2)';
      b.style.borderColor = 'var(--border)';
      b.style.color = 'var(--muted)';
    });
    btnEl.style.background = 'rgba(242,185,13,0.12)';
    btnEl.style.borderColor = 'var(--accent)';
    btnEl.style.color = 'var(--accent)';

    const msgs = (document.getElementById('playground-messages') as HTMLElement);
    msgs.innerHTML = '';
    pgAddMessage('system', tr(
      `You are now talking to **${agent.emoji || '🤖'} ${agent.name}**\n${agent.description || ''}`,
      `Rozmawiasz teraz z **${agent.emoji || '🤖'} ${agent.name}**\n${agent.description || ''}`
    ));
    (document.getElementById('playground-status') as HTMLElement).textContent = '';
    (document.getElementById('playground-input') as HTMLElement).focus();
  }

  function pgAddMessage(role: string, text: string) {
    const msgs = (document.getElementById('playground-messages') as HTMLElement);
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;gap:0.6rem;align-items:flex-start;${role === 'user' ? 'justify-content:flex-end;' : ''}`;
    const bubble = document.createElement('div');
    bubble.style.cssText = role === 'user'
      ? `max-width:78%;background:var(--accent);color:#1a170d;border-radius:12px 12px 4px 12px;padding:0.7rem 0.85rem;font-size:0.86rem;line-height:1.45;white-space:pre-wrap;`
      : `max-width:78%;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:12px 12px 12px 4px;padding:0.7rem 0.85rem;font-size:0.86rem;line-height:1.45;white-space:pre-wrap;`;
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    const avatar = document.createElement('div');
    avatar.style.cssText = `width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;flex-shrink:0;${role === 'user' ? 'order:2;background:rgba(242,185,13,0.15);' : 'background:var(--surface2);border:1px solid var(--border);'}`;
    avatar.textContent = role === 'user' ? '👤' : role === 'system' ? 'ℹ' : (playgroundAgent?.emoji || '🤖');

    if (role === 'user') { wrap.appendChild(bubble); wrap.appendChild(avatar); }
    else { wrap.appendChild(avatar); wrap.appendChild(bubble); }
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function sendPlaygroundMessage() {
    if (!playgroundAgent) {
      showNotif(tr('⚠ Select an agent first', '⚠ Najpierw wybierz agenta'), true); return;
    }
    const inp = (document.getElementById('playground-input') as HTMLInputElement);
    const sendBtn = (document.getElementById('playground-send-btn') as HTMLButtonElement);
    const text = inp.value.trim();
    if (!text) return;

    pgAddMessage('user', text);
    playgroundHistory.push({ role: 'user', content: text });
    inp.value = '';
    inp.style.height = '44px';
    sendBtn.disabled = true;
    (document.getElementById('playground-status') as HTMLElement).textContent = `${playgroundAgent.name} is thinking…`;

    const msgs = (document.getElementById('playground-messages') as HTMLElement);
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
        playgroundAgent.skillMd || ''
      ].join('\n\n') || `You are ${playgroundAgent.name}. ${playgroundAgent.description || ''}`;

      const reply = await callGemini(systemPrompt, text, `🧪 Playground · ${playgroundAgent.name}`, playgroundHistory);
      if (typingDiv.parentNode) msgs.removeChild(typingDiv);
      pgAddMessage('assistant', reply);
      playgroundHistory.push({ role: 'assistant', content: reply });
      (document.getElementById('playground-status') as HTMLElement).textContent = `${playgroundHistory.filter((m) => m.role === 'assistant').length} responses`;
    } catch (e: any) {
      if (typingDiv.parentNode) msgs.removeChild(typingDiv);
      pgAddMessage('system', `⚠ Error: ${e.message}`);
      (document.getElementById('playground-status') as HTMLElement).textContent = 'Error';
    } finally {
      sendBtn.disabled = false;
      inp.focus();
    }
  }

  function clearPlayground() {
    playgroundHistory = [];
    const msgs = (document.getElementById('playground-messages') as HTMLElement);
    msgs.innerHTML = '';
    if (playgroundAgent) {
      pgAddMessage('system', `Chat cleared. You are talking to **${playgroundAgent.emoji || '🤖'} ${playgroundAgent.name}**`);
    }
    (document.getElementById('playground-status') as HTMLElement).textContent = '';
  }

  function exportPlaygroundChat() {
    if (!playgroundHistory || playgroundHistory.length === 0) {
      showNotif(tr('No messages to export yet.', 'Brak wiadomosci do eksportu.'), true);
      return;
    }
    const agentName = playgroundAgent ? playgroundAgent.name : 'Agent';
    const agentEmoji = playgroundAgent ? (playgroundAgent.emoji || '🤖') : '🤖';
    const date = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    let md = `# 🧪 Playground Chat — ${agentEmoji} ${agentName}\n\n`;
    md += `**Project:** ${currentTopic || 'AgentSpark'}  \n`;
    md += `**Agent:** ${agentName}  \n`;
    md += `**Exported:** ${date} at ${time}  \n\n---\n\n`;

    playgroundHistory.forEach((msg) => {
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

  function loadPlaygroundExample(type: string) {
    const examples: any = {
      support: "**User:** Kupiłem produkt X, ale przyszedł uszkodzony. Co mam zrobić?\n**Agent:** Bardzo mi przykro z tego powodu. Proszę podać numer zamówienia, a natychmiast zajmę się procesem reklamacji i wymianą towaru na nowy.",
      content: "**User:** Przygotuj plan postów na LinkedIn na temat AI w marketingu.\n**Agent:** Oto propozycja na 4 tygodnie:\nTydzień 1: Wprowadzenie do AI (Post edukacyjny)\nTydzień 2: Case study wdrożenia (Dowód słuszności)\nTydzień 3: Narzędzia, których używamy (Praktyka)\nTydzień 4: Przyszłość AI w 2026 (Wizjonerski)",
      saas: "**User:** Przeanalizuj konkurencję dla CRM dla małych firm.\n**Agent:** Głośni konkurenci:\n1. HubSpot (Darmowy start, drogie skalowanie)\n2. Pipedrive (Skupienie na sprzedaży)\n3. Zoho (Wszystko w jednym)\nTwoja szansa: Prostota i AI-first podejście."
    };

    const text = examples[type];
    if (!text) return;

    const container = (document.getElementById('playground-messages') as HTMLElement);
    container.innerHTML = '';
    text.split('\n').forEach((line: string) => {
      if (!line.trim()) return;
      const isUser = line.startsWith('**User:**');
      const content = line.replace(/^\*\*(User|Agent):\*\*\s*/, '');
      const div = document.createElement('div');
      div.className = isUser ? 'msg-user' : 'msg-agent';
      div.textContent = content;
      container.appendChild(div);
    });

    (document.getElementById('pg-examples') as HTMLElement).style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const playgroundModal = (document.getElementById('playground-modal') as HTMLElement);
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

