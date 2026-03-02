const DB_NAME    = 'agentspark-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
let _db = null;
let _currentProjectId = null;  // null = unsaved/new session

// ── IndexedDB init ────────────────────────────────────────
function dbOpen() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbGetAll() {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).index('updatedAt').getAll();
    req.onsuccess = e => resolve(e.target.result.reverse()); // newest first
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbGet(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbPut(project) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(project);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbDelete(id) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    req.onsuccess = e => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Project helpers ───────────────────────────────────────
function _projectSnapshot() {
  return {
    topic:          currentTopic,
    level:          currentLevel,
    lang:           lang,
    modelProvider:  selectedModel.provider,
    modelId:        selectedModel.model,
    agents:         JSON.parse(JSON.stringify(generatedAgents)),
    files:          JSON.parse(JSON.stringify(generatedFiles)),
    versionHistory: JSON.parse(JSON.stringify(versionHistory)),
    chatHistory:    JSON.parse(JSON.stringify(chatHistory)),
  };
}

function _projectName(topic) {
  return topic || 'Untitled Project';
}

// ── Save / Auto-save ──────────────────────────────────────
let _autoSaveTimer = null;
function scheduleAutoSave() {
  if (!generatedAgents.length) return; // nothing to save yet
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveCurrentProject(true), 2000);
}

async function saveCurrentProject(silent = false) {
  if (!generatedAgents.length) {
    if (!silent) showNotif(lang === 'en' ? '⚠ Generate a team first before saving' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  try {
    const now = Date.now();
    const snap = _projectSnapshot();
    if (_currentProjectId) {
      // Update existing
      const existing = await dbGet(_currentProjectId);
      if (existing) {
        await dbPut({ ...existing, ...snap, updatedAt: now });
      } else {
        _currentProjectId = null; // was deleted externally — create new
      }
    }
    if (!_currentProjectId) {
      // Create new
      _currentProjectId = 'proj_' + now + '_' + Math.random().toString(36).slice(2,7);
      await dbPut({
        id:        _currentProjectId,
        name:      _projectName(currentTopic),
        createdAt: now,
        updatedAt: now,
        ...snap
      });
    } else {
      // Just update name in case topic changed
      const existing = await dbGet(_currentProjectId);
      if (existing) await dbPut({ ...existing, name: _projectName(currentTopic), updatedAt: now, ...snap });
    }
    _showSaveIndicator();
    await _updateProjectsBadge();
    if (!silent) showNotif(lang === 'en' ? '✓ Project saved!' : '✓ Projekt zapisany!');
  } catch(e) {
    console.error('[AgentSpark] Save failed:', e);
    if (!silent) showNotif(lang === 'en' ? '⚠ Save failed: ' + e.message : '⚠ Błąd zapisu: ' + e.message, true);
  }
}

function _showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = '✓ saved';
  el.classList.add('visible');
  clearTimeout(_showSaveIndicator._t);
  _showSaveIndicator._t = setTimeout(() => el.classList.remove('visible'), 2500);
}

// ── Load project ──────────────────────────────────────────
async function loadProject(id) {
  try {
    const proj = await dbGet(id);
    if (!proj) { showNotif('⚠ Project not found', true); return; }

    // Restore all state
    currentTopic      = proj.topic      || '';
    currentLevel      = proj.level      || 'iskra';
    lang              = proj.lang       || 'en';
    generatedAgents   = proj.agents     || [];
    generatedFiles    = proj.files      || {};
    versionHistory    = proj.versionHistory || [];
    chatHistory       = proj.chatHistory    || [];
    _currentProjectId = proj.id;

    // Restore model if stored
    if (proj.modelId) {
      const opt = document.querySelector(`#modelSelect option[value*="${proj.modelId}"]`);
      if (opt) { opt.selected = true; onModelChange(); }
    }
    // Restore lang
    setLang(lang);

    // Show results screen
    showScreen('results');
    document.getElementById('apiKeyHeader').style.display = 'flex';
    renderResults();
    _showSaveIndicator();
    showNotif(lang === 'en' ? `📂 "${proj.name}" loaded` : `📂 Załadowano "${proj.name}"`);
  } catch(e) {
    console.error('[AgentSpark] Load failed:', e);
    showNotif('⚠ Failed to load project: ' + e.message, true);
  }
}

// ── Delete project ────────────────────────────────────────
async function deleteProject(id, name) {
  const confirmed = await (window.uiConfirm
    ? window.uiConfirm(
      `Delete project "${name}"? This cannot be undone.`,
      `Usunąć projekt "${name}"? Tej operacji nie można cofnąć.`,
      'Delete Project',
      'Usuwanie projektu'
    )
    : Promise.resolve(window.confirm(
      lang === 'en'
        ? `Delete project "${name}"? This cannot be undone.`
        : `Usunąć projekt "${name}"? Tej operacji nie można cofnąć.`
    )));
  if (!confirmed) return;
  try {
    await dbDelete(id);
    if (_currentProjectId === id) _currentProjectId = null;
    await renderProjectsList();
    await _updateProjectsBadge();
    showNotif(lang === 'en' ? '🗑 Project deleted' : '🗑 Projekt usunięty');
  } catch(e) {
    showNotif('⚠ Delete failed: ' + e.message, true);
  }
}

// ── Duplicate / Fork project ──────────────────────────────
async function forkProject(id) {
  try {
    const proj = await dbGet(id);
    if (!proj) return;
    const now = Date.now();
    const newId = 'proj_' + now + '_' + Math.random().toString(36).slice(2,7);
    await dbPut({
      ...proj,
      id:        newId,
      name:      proj.name + ' (copy)',
      createdAt: now,
      updatedAt: now,
    });
    await renderProjectsList();
    await _updateProjectsBadge();
    showNotif(lang === 'en' ? '✓ Project duplicated' : '✓ Projekt zduplikowany');
  } catch(e) {
    showNotif('⚠ Fork failed: ' + e.message, true);
  }
}

// ── Projects screen ───────────────────────────────────────
async function openProjectsScreen() {
  _updateContextBar('projects');
  showScreen('projects');
  await renderProjectsList();
}

async function renderProjectsList() {
  const list    = document.getElementById('projects-list');
  const empty   = document.getElementById('projects-empty');
  const search  = (document.getElementById('projects-search')?.value || '').toLowerCase();
  if (!list) return;

  let projects = [];
  try { projects = await dbGetAll(); } catch(e) { console.error(e); }

  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search) || (p.topic||'').toLowerCase().includes(search))
    : projects;

  if (!filtered.length) {
    list.innerHTML  = '';
    list.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }
  list.style.display  = 'grid';
  empty.style.display = 'none';

  list.innerHTML = filtered.map(p => {
    const updated = _formatDate(p.updatedAt);
    const agentCount = (p.agents||[]).length;
    const isCurrent = p.id === _currentProjectId;
    return `
    <div class="project-card-wrap" id="wrap-${p.id}">
    <div class="project-swipe-actions" aria-hidden="true">
      <button class="swipe-action-btn open-btn" onclick="loadProject('${p.id}')"><span class="sa-icon">▶</span>Open</button>
      <button class="swipe-action-btn fork-btn" onclick="forkProject('${p.id}')"><span class="sa-icon">⎘</span>Fork</button>
      <button class="swipe-action-btn del-btn" onclick="deleteProject('${p.id}', '${_escHtml(p.name).replace(/'/g,"\\'")}')"><span class="sa-icon">🗑</span>Del</button>
    </div>
    <div class="project-card" tabindex="0" role="button" aria-label="${_escHtml(p.name)}" onclick="loadProject('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();loadProject('${p.id}')}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
        <div class="project-card-name">${_escHtml(p.name)}${isCurrent ? '<span class="project-unsaved-dot" title="Current project"></span>' : ''}</div>
      </div>
      <div class="project-card-topic">📌 ${_escHtml(p.topic||tr('No topic','Brak tematu'))}</div>
      <div class="project-card-meta">
        ${agentCount ? `<span class="project-card-tag">👥 ${agentCount} agents</span>` : ''}
        ${p.level ? `<span class="project-card-tag">${p.level}</span>` : ''}
        ${p.lang  ? `<span class="project-card-tag">${p.lang.toUpperCase()}</span>` : ''}
      </div>
      <div class="project-card-date">${tr('Updated','Zaktualizowano')} ${updated}</div>
      <div class="project-card-actions" onclick="event.stopPropagation()">
        <button class="project-card-btn" onclick="loadProject('${p.id}')">▶ Open</button>
        <button class="project-card-btn" onclick="forkProject('${p.id}')">⎘ Fork</button>
        <button class="project-card-btn danger" onclick="deleteProject('${p.id}', '${_escHtml(p.name).replace(/'/g,'\\\'') }')">🗑</button>
      </div>
    </div>
    </div>`;
  }).join('');
  _localizeProjectCards(list);
}

function _localizeProjectCards(rootEl) {
  if (!rootEl) return;
  const openLabel = tr('Open', 'Otworz');
  const forkLabel = tr('Fork', 'Kopia');
  const delLabel = tr('Del', 'Usun');
  const currentProjectTitle = tr('Current project', 'Aktualny projekt');

  rootEl.querySelectorAll('.project-unsaved-dot').forEach(dot => {
    dot.setAttribute('title', currentProjectTitle);
  });

  rootEl.querySelectorAll('.project-card-topic').forEach(el => {
    el.innerHTML = el.innerHTML.replace('No topic', tr('No topic', 'Brak tematu'));
  });
  rootEl.querySelectorAll('.project-card-tag').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\bagents\b/g, tr('agents', 'agentow'));
  });
  rootEl.querySelectorAll('.project-card-date').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/^Updated\s+/i, tr('Updated ', 'Zaktualizowano '));
  });

  const setButtonLabel = (btn, label) => {
    if (!btn) return;
    const icon = btn.querySelector('.sa-icon');
    if (icon) {
      btn.textContent = '';
      btn.appendChild(icon);
      btn.appendChild(document.createTextNode(label));
      return;
    }
    btn.textContent = label;
  };

  rootEl.querySelectorAll('.swipe-action-btn.open-btn').forEach(btn => setButtonLabel(btn, openLabel));
  rootEl.querySelectorAll('.swipe-action-btn.fork-btn').forEach(btn => setButtonLabel(btn, forkLabel));
  rootEl.querySelectorAll('.swipe-action-btn.del-btn').forEach(btn => setButtonLabel(btn, delLabel));
  rootEl.querySelectorAll('.project-card-btn').forEach(btn => {
    btn.textContent = btn.textContent
      .replace(/\bOpen\b/g, openLabel)
      .replace(/\bFork\b/g, forkLabel);
  });
}

async function _updateProjectsBadge() {
  try {
    const all = await dbGetAll();
    const badge = document.getElementById('projects-count-badge');
    const tabBadge = document.getElementById('tab-badge');
    if (!badge) return;
    if (all.length > 0) {
      badge.textContent = all.length + ' ';
      badge.style.display = 'inline';
      if (tabBadge) { tabBadge.textContent = all.length; tabBadge.style.display = ''; }
    } else {
      badge.style.display = 'none';
      if (tabBadge) tabBadge.style.display = 'none';
    }
  } catch(e) {}
}

function _formatDate(ts) {
  if (!ts) return '—';
  const d   = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff/86400000) + 'd ago';
  return d.toLocaleDateString();
}

function _escHtml(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Wire auto-save into agent generation ─────────────────
// Called after generatedAgents is populated (patched into renderResults)
function _onAgentsReady() {
  scheduleAutoSave();
  _updateProjectsBadge();
}

// ── Init on load ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  try {
    await dbOpen();
    await _updateProjectsBadge();
  } catch(e) {
    console.warn('[AgentSpark] IndexedDB init failed:', e);
  }
  // Initialize collapsible API setup — open by default
  toggleApiSetup(true);
  // Restore session API key; migrate legacy localStorage value once.
  let savedKey = sessionStorage.getItem('agentspark-api-key');
  if (!savedKey) {
    const legacyKey = localStorage.getItem('agentspark-api-key');
    if (legacyKey) {
      savedKey = legacyKey;
      sessionStorage.setItem('agentspark-api-key', legacyKey);
      localStorage.removeItem('agentspark-api-key');
    }
  }
  if (savedKey) {
    apiKey = savedKey;
    const inp = document.getElementById('apiKeySetupInput');
    if (inp) inp.value = savedKey;
    // Hide demo CTA when key already present
    const demoCta = document.getElementById('demo-cta');
    if (demoCta) demoCta.style.display = 'none';
    checkApiKey();
  }
});

// ─── STATE ───────────────────────────────────────────────
let lang = 'en';
let apiKey = '';
let selectedModel = {
  provider: 'gemini',
  model: 'gemini-2.5-flash-preview-05-20',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}',
  tag: 'gemini'
};
let currentTopic = '';
let currentLevel = 'iskra';
let chatHistory = [];
let conversationState = 'interview';
let questionCount = 0;
let MAX_QUESTIONS = 6;
let generatedAgents = [];
let generatedFiles = {};
let refineHistory = [];
let isRefining = false;
const APP_VERSION = '1.1.0';
let _lastScreenName = 'topic';
let _teamGeneratedSig = '';

function getActiveScreenName() {
  const active = document.querySelector('.screen.active');
  if (!active || !active.id) return _lastScreenName;
  return active.id.replace(/^screen-/, '');
}

function trackEvent(eventName, data = {}) {
  const payload = {
    event: String(eventName || 'unknown'),
    timestamp: new Date().toISOString(),
    app_version: APP_VERSION,
    provider: selectedModel?.tag || 'unknown',
    screen: getActiveScreenName(),
    success: data.success !== false,
    ...data
  };
  if (window.plausible && typeof window.plausible === 'function') {
    try { window.plausible(payload.event, { props: payload }); } catch(e) {}
  }
  if (window.gtag && typeof window.gtag === 'function') {
    try { window.gtag('event', payload.event, payload); } catch(e) {}
  }
  console.debug('[AgentSpark event]', payload);
}

window.addEventListener('error', (e) => {
  trackEvent('runtime_error', {
    success: false,
    message: String(e.message || 'window_error').slice(0, 220),
    source: String(e.filename || '').slice(0, 140),
    line: e.lineno || 0,
    col: e.colno || 0
  });
});

window.addEventListener('unhandledrejection', (e) => {
  trackEvent('runtime_error', {
    success: false,
    message: String(e.reason?.message || e.reason || 'unhandled_rejection').slice(0, 220)
  });
});

// Modal state
let currentModalFile = '';
let currentModalTab = 'preview';
let mdBrowserActiveFile = '';

// ─── I18N ─────────────────────────────────────────────────
