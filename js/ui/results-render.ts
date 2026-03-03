import { state } from '../core/state';
// ─── RESULTS SCREEN ───────────────────────────────────────
// All declare statements moved to js/globals.d.ts — do NOT re-declare here.

function showResults(skipReset = false): void {
  showScreen('results');
  if (window._updateContextBar) window._updateContextBar('results');
  // Show skeleton while agents render
  if (!skipReset && typeof window._renderSkeletonCards === 'function') {
    window._renderSkeletonCards(4);
  }

  (document.getElementById('result-badge') as HTMLElement).textContent = t('resultBadge');
  (document.getElementById('result-title') as HTMLElement).textContent = t('resultTitle');
  (document.getElementById('result-sub') as HTMLElement).textContent = t('resultSub');
  (document.getElementById('download-btn') as HTMLElement).textContent = t('downloadBtn');
  (document.getElementById('instr-btn') as HTMLElement).textContent = t('instrBtn');
  (document.getElementById('refine-btn') as HTMLElement).textContent = t('refineBtn');
  (document.getElementById('md-preview-btn') as HTMLElement).textContent = state.lang === 'en' ? '📄 Preview Docs' : '📄 Podgląd Docs';
  (document.getElementById('fw-export-btn') as HTMLElement).textContent = state.lang === 'en' ? '🚀 Export Framework' : '🚀 Eksport Framework';

  if (typeof renderVersionPanel === 'function') renderVersionPanel();
  if (typeof renderTraceLive === 'function') renderTraceLive();

  if (!skipReset) {
    state.refineHistory = [];
    state.isRefining = false;
    refineSnapshots = [];
    selectedRefineAction = null;
    (document.getElementById('refine-panel') as HTMLElement).style.display = 'none';
    (document.getElementById('refine-history') as HTMLElement).innerHTML = '';
  }

  const lvl = t('levels').find((l: any) => l.id === state.currentLevel);
  if (lvl) {
    const badge = document.getElementById('result-badge') as HTMLElement;
    badge.textContent = lvl.emoji + ' ' + lvl.name.toUpperCase() + ' — ' + t('resultBadge');
    badge.style.borderColor = lvl.color + '66';
    badge.style.color = lvl.color;
  }

  if (!skipReset) {
    let scoringAttempts = 0;
    const tryRenderScoring = (): void => {
      scoringAttempts++;
      if (window._scoringData !== undefined) {
        if (typeof renderScoring === 'function') renderScoring(window._scoringData);
      } else if (scoringAttempts < 30) {
        setTimeout(tryRenderScoring, 400);
      }
    };
    setTimeout(tryRenderScoring, 300);
  }

  // Always ensure graph section is visible when results are shown
  (document.getElementById('graph-title') as HTMLElement).textContent = state.lang === 'en'
    ? 'Agent Dependency Graph' : 'Graf Zależności Agentów';
  (document.getElementById('graph-section') as HTMLElement).style.display = 'block';

  // Auto-save hook
  if (typeof _onAgentsReady === 'function') _onAgentsReady();

  const grid = document.getElementById('agents-grid') as HTMLElement;
  grid.innerHTML = '';

  const technical = state.generatedAgents.filter((a: any) => a.type === 'technical');
  const business = state.generatedAgents.filter((a: any) => a.type !== 'technical');

  // XSS-safe HTML escape helper for results-render (LLM output hardening)
  function _rrEsc(s: string): string {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function makeAgentCard(agent: any): HTMLElement {
    const isTech = agent.type === 'technical';
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.dataset.type = agent.type || 'technical';
    card.dataset.agentId = agent.id;
    // XSS hardening: all agent fields escaped — LLM output may contain HTML
    const eName = _rrEsc(agent.name);
    const eRole = _rrEsc(agent.role);
    const eDesc = _rrEsc(agent.description);
    const eId = _rrEsc(agent.id);
    const eEmoji = _rrEsc(agent.emoji || '🤖');
    card.innerHTML = `
      <div class="agent-card-header">
        <div class="agent-avatar" style="background:${isTech
        ? 'linear-gradient(145deg,#c49a0a,#f2b90d)'
        : 'linear-gradient(145deg,#c44010,#e05a1a)'}">${eEmoji}</div>
        <div class="agent-card-meta">
          <div class="agent-name">${eName}</div>
          <div class="agent-role">${eRole}</div>
          <div class="agent-type-badge ${isTech ? 'badge-tech' : 'badge-biz'}" style="display:inline-block;margin-top:0.4rem;">
            ${isTech
        ? (state.lang === 'en' ? 'Technical' : 'Techniczny')
        : (state.lang === 'en' ? 'Business' : 'Biznesowy')}
          </div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button class="feedback-btn" onclick="event.stopPropagation();this.innerText='👍';this.style.color='var(--success)';this.style.transform='scale(1.2)'" style="background:none;border:none;cursor:pointer;font-size:1.1rem;opacity:0.6;transition:all 0.2s;" title="Like">👍</button>
          <button class="feedback-btn" onclick="event.stopPropagation();this.innerText='👎';this.style.color='var(--accent2)';this.style.transform='scale(1.2)'" style="background:none;border:none;cursor:pointer;font-size:1.1rem;opacity:0.6;transition:all 0.2s;" title="Dislike">👎</button>
        </div>
      </div>
      <div class="agent-card-divider"></div>
      <div class="agent-card-body">
        <div class="agent-desc">${eDesc}</div>
        <div class="file-chips-group">
          <span class="file-chips-label">Files</span>
          <div class="file-chips">
            <div class="file-chip" tabindex="0" role="button"
              onclick="previewFile('agent-${eId}.md')"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();previewFile('agent-${eId}.md')}">agent-${eId}.md</div>
            <div class="file-chip" tabindex="0" role="button"
              onclick="previewFile('skill-${eId}.md')"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();previewFile('skill-${eId}.md')}">skill-${eId}.md</div>
          </div>
        </div>
      </div>
    `;
    card.tabIndex = 0;
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `${eName} — ${eRole}`);
    return card;
  }


  function makeSection(title: string, icon: string, agents: any[], colorClass: string): void {
    if (agents.length === 0) return;
    const section = document.createElement('div');
    section.className = 'agent-section';
    section.innerHTML = `<div class="agent-section-header ${colorClass}"><span>${icon}</span><span>${title}</span><span class="section-count">${agents.length}</span></div>`;
    const sg = document.createElement('div');
    sg.className = 'agents-grid';
    agents.forEach((a: any) => sg.appendChild(makeAgentCard(a)));
    section.appendChild(sg);
    grid.appendChild(section);
  }

  makeSection(
    state.lang === 'en' ? 'Technical Agents — Build your app' : 'Agenci Techniczni — Budują aplikację',
    '⚙️', technical, 'section-tech'
  );
  makeSection(
    state.lang === 'en' ? 'Business Agents — Shape your vision' : 'Agenci Biznesowi — Nadają kontekst',
    '💼', business, 'section-biz'
  );

  const configWrap = document.createElement('div');
  configWrap.className = 'agent-section';
  configWrap.innerHTML = `<div class="agent-section-header section-config"><span>🔗</span><span>${state.lang === 'en' ? 'Team Configuration' : 'Konfiguracja Zespołu'}</span></div>`;
  const configGrid = document.createElement('div');
  configGrid.className = 'agents-grid';
  const configCard = document.createElement('div');
  configCard.className = 'agent-card';
  configCard.innerHTML = `
    <div class="agent-card-header">
      <div class="agent-avatar" style="background:linear-gradient(145deg,#2a2510,#3a3218)">🔗</div>
      <div class="agent-card-meta">
        <div class="agent-name">${state.lang === 'en' ? 'Team Configuration' : 'Konfiguracja Zespołu'}</div>
        <div class="agent-role">Orchestration</div>
      </div>
    </div>
    <div class="agent-card-divider"></div>
    <div class="agent-card-body">
      <div class="agent-desc">${state.lang === 'en' ? 'Defines how all agents connect and collaborate.' : 'Definiuje jak agenci się łączą i współpracują.'}</div>
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

  if (typeof _syncFab === 'function') _syncFab();

  setTimeout(() => {
    // buildGraphFromAgents is declared in globals.d.ts with optional agents param
    if (typeof buildGraphFromAgents === 'function') buildGraphFromAgents(state.generatedAgents);
    const gc = document.querySelector('.graph-container') as HTMLElement | null;
    if (gc && !gc.querySelector('.graph-legend')) {
      const leg = document.createElement('div');
      leg.className = 'graph-legend';
      leg.innerHTML = `
        <span><div class="legend-dot" style="background:#f2b90d"></div>${state.lang === 'en' ? 'Technical agent' : 'Agent techniczny'}</span>
        <span><div class="legend-dot" style="background:#e05a1a"></div>${state.lang === 'en' ? 'Business agent' : 'Agent biznesowy'}</span>
        <span style="font-size:0.65rem;margin-left:auto;color:var(--muted)">— — ${state.lang === 'en' ? 'context flow' : 'przepływ kontekstu'} &nbsp;&nbsp;—— ${state.lang === 'en' ? 'pipeline' : 'pipeline'}</span>
      `;
      gc.appendChild(leg);
    }
  }, 100);
}

function showInstructions(): void {
  const section = document.getElementById('instructions-section') as HTMLElement;
  const isHidden = getComputedStyle(section).display === 'none';
  section.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    (document.getElementById('instr-title') as HTMLElement).textContent = t('instrTitle');
    const steps = document.getElementById('instr-steps') as HTMLElement;
    steps.innerHTML = '';
    t('instrSteps').forEach((step: any, i: number) => {
      const div = document.createElement('div');
      div.className = 'instruction-step';
      div.innerHTML = `<div class="num">0${i + 1}</div><div class="content"><strong>${step.title}</strong><p>${step.body}</p></div>`;
      steps.appendChild(div);
    });
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function downloadZip(): Promise<void> {
  if (typeof JSZip === 'undefined') {
    showNotif('JSZip not loaded', true);
    trackEvent('export_zip', { success: false, reason: 'jszip_missing' });
    return;
  }
  const zip = new JSZip();

  Object.entries(state.generatedFiles).forEach(([name, content]) => {
    zip.file(name, content);
  });

  const cfg = {
    name: state.currentTopic,
    version: '1.0.0',
    generated_by: 'AgentSpark v1.1.0',
    generated_at: new Date().toISOString(),
    level: state.currentLevel,
    agents: state.generatedAgents.map((a: any) => ({
      id: a.id, name: a.name, role: a.role,
      description: a.description,
      agent_file: 'agent-' + a.id + '.md',
      skill_file: 'skill-' + a.id + '.md'
    })),
    usage: {
      primary_model: 'claude-sonnet-4-6 / gpt-4o / gemini-2.5-flash',
      pattern: 'Each agent file is a system prompt. Load into your preferred AI platform.'
    }
  };
  zip.file('config.json', JSON.stringify(cfg, null, 2));

  const manifest = {
    v: 2, source: 'agentspark', topic: state.currentTopic,
    level: state.currentLevel, lang: state.lang, agents: state.generatedAgents,
    files: state.generatedFiles, ts: Date.now()
  };
  zip.file('agentspark.json', JSON.stringify(manifest, null, 2));

  const firstId: string = state.generatedAgents[0] ? state.generatedAgents[0].id : 'agent';
  const pyAgents: string = state.generatedAgents.map((a: any) =>
    `    "${a.id}": open("agent-${a.id}.md").read(),`
  ).join('\n');
  const pyCode: string = [
    `# ${state.currentTopic} — AgentSpark Team`,
    '# pip install anthropic',
    '',
    'import anthropic',
    '',
    'AGENTS = {',
    pyAgents,
    '}',
    '',
    'client = anthropic.Anthropic()  # set ANTHROPIC_API_KEY env var',
    '',
    'def chat_with_agent(agent_id: str, user_message: str, history: list = []):',
    '    system_prompt = AGENTS[agent_id]',
    '    messages = history + [{"role": "user", "content": user_message}]',
    '    response = client.messages.create(',
    '        model="claude-sonnet-4-6", max_tokens=2048,',
    '        system=system_prompt, messages=messages',
    '    )',
    '    return response.content[0].text',
    '',
    `agent_id = "${firstId}"`,
    'print(f"Chatting with: {agent_id}\\n")',
    'reply = chat_with_agent(agent_id, "Hello! What can you help me with?")',
    'print(f"Agent: {reply}")',
    ''
  ].join('\n');
  zip.file('examples/python_example.py', pyCode);

  const jsAgents: string = state.generatedAgents.map((a: any) =>
    `  "${a.id}": fs.readFileSync(path.join(__dirname, "..", "agent-${a.id}.md"), "utf8"),`
  ).join('\n');
  const jsCode: string = [
    `// ${state.currentTopic} — AgentSpark Team`,
    '// npm install @anthropic-ai/sdk',
    '',
    'import Anthropic from "@anthropic-ai/sdk";',
    'import fs from "fs";',
    'import path from "path";',
    'import { fileURLToPath } from "url";',
    '',
    'const __dirname = path.dirname(fileURLToPath(import.meta.url));',
    'const AGENTS = {',
    jsAgents,
    '};',
    '',
    'const client = new Anthropic();',
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
    `const agentId = "${firstId}";`,
    'console.log(`Chatting with: ${agentId}\\n`);',
    'const reply = await chatWithAgent(agentId, "Hello! What can you help me with?");',
    'console.log(`Agent: ${reply}`);',
    ''
  ].join('\n');
  zip.file('examples/node_example.mjs', jsCode);

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agentspark-' + state.currentTopic.toLowerCase().replace(/\s+/g, '-') + '.zip';
  a.click();
  showNotif(state.lang === 'en' ? '✓ ZIP downloaded! Includes Python & Node.js examples.' : '✓ ZIP pobrany z przykładami Python i Node.js!');
  trackEvent('export_zip', {
    success: true,
    agents: state.generatedAgents.length,
    files: Object.keys(state.generatedFiles || {}).length
  });
}

// ─── MARKDOWN RENDERER ────────────────────────────────────
function renderMarkdown(md: string): string {
  if (!md) return '';

  // Step 1: Extract fenced code blocks and inline code first
  const codeBlocks: string[] = [];
  const inlineCodes: string[] = [];

  let text: string = md
    .replace(/```([\w]*)\n?([\s\S]*?)```/g, (_: string, lang: string, code: string) => {
      const escaped = code.trim()
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
      return `\x02CODE_BLOCK_${idx}\x03`;
    })
    .replace(/`([^`\n]+)`/g, (_: string, code: string) => {
      const escaped = code
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const idx = inlineCodes.length;
      inlineCodes.push(`<code>${escaped}</code>`);
      return `\x02INLINE_CODE_${idx}\x03`;
    });

  // Step 2: Escape remaining HTML
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Step 3: Apply markdown transformations
  text = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/^\s*[-+] (.+)$/gm, '<li>$1</li>')
    .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Step 4: Line-by-line block wrapping
  const outLines: string[] = [];
  let inList = false;
  let paraAcc: string[] = [];

  const flushPara = (): void => {
    if (paraAcc.length) {
      outLines.push('<p>' + paraAcc.join('<br>') + '</p>');
      paraAcc = [];
    }
  };
  const flushList = (): void => {
    if (inList) { outLines.push('</ul>'); inList = false; }
  };

  text.split('\n').forEach((rawLine: string) => {
    const line = rawLine.trim();

    if (!line) {
      flushPara();
      flushList();
      return;
    }

    if (line.startsWith('<h') || line.startsWith('<pre') ||
      line.startsWith('<hr') || line.startsWith('<blockquote') ||
      line.startsWith('\x02CODE_BLOCK_')) {
      flushPara();
      flushList();
      outLines.push(line);
      return;
    }

    if (line.startsWith('<li>')) {
      flushPara();
      if (!inList) { outLines.push('<ul>'); inList = true; }
      outLines.push(line);
      return;
    }

    flushList();
    paraAcc.push(line);
  });

  flushPara();
  flushList();

  text = outLines.join('\n');

  // Step 5: Restore code placeholders
  codeBlocks.forEach((html: string, i: number) => {
    text = text.replace(`\x02CODE_BLOCK_${i}\x03`, html);
  });
  inlineCodes.forEach((html: string, i: number) => {
    text = text.replace(`\x02INLINE_CODE_${i}\x03`, html);
  });

  return text;
}

// ─── FILE PREVIEW MODAL ───────────────────────────────────
function previewFile(filename: string): void {
  const content = state.generatedFiles[filename];
  if (!content) return;

  state.currentModalFile = filename;
  state.currentModalTab = 'preview';

  (document.getElementById('modal-title') as HTMLElement).textContent = filename;
  (document.getElementById('modal-filesize') as HTMLElement).textContent =
    `${(new Blob([content]).size / 1024).toFixed(1)} KB`;

  (document.getElementById('modal-preview-pane') as HTMLElement).innerHTML = renderMarkdown(content);
  (document.getElementById('modal-raw-pane') as HTMLElement).textContent = content;

  switchModalTab('preview');
  (document.getElementById('modal') as HTMLElement).classList.add('open');
}

function switchModalTab(tab: string): void {
  state.currentModalTab = tab;
  const previewPane = document.getElementById('modal-preview-pane') as HTMLElement;
  const rawPane = document.getElementById('modal-raw-pane') as HTMLElement;
  const tabPreview = document.getElementById('tab-preview') as HTMLElement;
  const tabRaw = document.getElementById('tab-raw') as HTMLElement;

  if (tab === 'preview') {
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

function downloadCurrentFile(): void {
  if (!state.currentModalFile || !state.generatedFiles[state.currentModalFile]) return;
  const blob = new Blob([state.generatedFiles[state.currentModalFile]], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = state.currentModalFile;
  a.click();
  showNotif(`✓ ${state.currentModalFile} downloaded`);
}

function closeModal(): void {
  (document.getElementById('modal') as HTMLElement).classList.remove('open');
}

// ─── MARKDOWN BROWSER (all files) ─────────────────────────
function openMarkdownPreview(): void {
  if (!Object.keys(state.generatedFiles).length) {
    showNotif(state.lang === 'en' ? '⚠ No files yet — generate a team first' : '⚠ Brak plików — najpierw wygeneruj zespół', true);
    return;
  }
  const modal = document.getElementById('md-browser-modal') as HTMLElement;
  modal.classList.add('open');

  const mdFiles = Object.keys(state.generatedFiles).filter(f => f.endsWith('.md'));
  const sidebar = document.getElementById('md-browser-sidebar') as HTMLElement;
  sidebar.innerHTML = '';

  const groups = [
    { label: state.lang === 'en' ? '📋 Config' : '📋 Konfiguracja', files: mdFiles.filter(f => f === 'README.md' || f === 'team-config.md') },
    { label: state.lang === 'en' ? '⚙️ Agents' : '⚙️ Agenci', files: mdFiles.filter(f => f.startsWith('agent-')) },
    { label: state.lang === 'en' ? '🎯 Skills' : '🎯 Umiejętności', files: mdFiles.filter(f => f.startsWith('skill-')) },
  ];

  groups.forEach(group => {
    if (!group.files.length) return;

    const groupLabel = document.createElement('div');
    groupLabel.style.cssText = 'font-size:0.6rem;font-family:"Space Mono",monospace;color:var(--muted);padding:0.6rem 1rem 0.3rem;letter-spacing:0.1em;text-transform:uppercase;';
    groupLabel.textContent = group.label;
    sidebar.appendChild(groupLabel);

    group.files.forEach((f: string) => {
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
      item.onmouseenter = () => { if (f !== state.mdBrowserActiveFile) item.style.color = 'var(--text)'; };
      item.onmouseleave = () => { if (f !== state.mdBrowserActiveFile) item.style.color = 'var(--muted)'; };
      item.onclick = () => selectMdBrowserFile(f);
      sidebar.appendChild(item);
    });
  });

  if (mdFiles.length > 0) {
    selectMdBrowserFile('README.md' in state.generatedFiles ? 'README.md' : mdFiles[0]);
  }
}

function selectMdBrowserFile(filename: string): void {
  state.mdBrowserActiveFile = filename;
  const content = state.generatedFiles[filename] || '';

  // Update sidebar active state — cast to HTMLElement to access .dataset / .style
  document.querySelectorAll('#md-browser-sidebar button').forEach((btn: Element) => {
    const el = btn as HTMLElement;
    const isActive = el.dataset.file === filename;
    el.style.borderLeftColor = isActive ? 'var(--accent)' : 'transparent';
    el.style.color = isActive ? 'var(--accent)' : 'var(--muted)';
    el.style.background = isActive ? 'rgba(242,185,13,0.06)' : 'none';
  });

  (document.getElementById('md-browser-rendered') as HTMLElement).innerHTML = renderMarkdown(content);
  (document.getElementById('md-browser-active-file') as HTMLElement).textContent =
    `${filename} · ${(new Blob([content]).size / 1024).toFixed(1)} KB`;

  const contentPane = document.getElementById('md-browser-content') as HTMLElement;
  contentPane.scrollTop = 0;
}

function closeMdBrowser(): void {
  (document.getElementById('md-browser-modal') as HTMLElement).classList.remove('open');
}

async function downloadAllMd(): Promise<void> {
  if (typeof JSZip === 'undefined') {
    showNotif('JSZip not loaded', true); return;
  }
  const zip = new JSZip();
  Object.entries(state.generatedFiles)
    .filter(([name]) => name.endsWith('.md'))
    .forEach(([name, content]) => zip.file(name, content));

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agentspark-docs-${state.currentTopic.toLowerCase().replace(/\s+/g, '-')}.zip`;
  a.click();
  showNotif(state.lang === 'en' ? '✓ Docs ZIP downloaded!' : '✓ Docs ZIP pobrany!');
}

// ─── WINDOW EXPORTS ───────────────────────────────────────
window.showResults = showResults;
window.showInstructions = showInstructions;
window.downloadZip = downloadZip;
window.renderMarkdown = renderMarkdown;
window.previewFile = previewFile;
window.switchModalTab = switchModalTab;
window.downloadCurrentFile = downloadCurrentFile;
window.closeModal = closeModal;
window.openMarkdownPreview = openMarkdownPreview;
window.selectMdBrowserFile = selectMdBrowserFile;
window.closeMdBrowser = closeMdBrowser;
window.downloadAllMd = downloadAllMd;
