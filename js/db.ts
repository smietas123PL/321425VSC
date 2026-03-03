// ─── DB.TS — AgentSpark IndexedDB layer ──────────────────
// Fixed: TS2451 duplicate _currentProjectId, TS18047 EventTarget null,
//        TS18046 unknown type, TS2304 versionHistory, TS2339 property errors

const DB_NAME = 'agentspark-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let _db: IDBDatabase | null = null;
// TS2451 fix: declare once here; remove any re-declaration elsewhere in this file
let _currentProjectId: string | null = null;

// ─── IndexedDB helpers ────────────────────────────────────
function dbOpen(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    req.onsuccess = (e: Event) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = (e: Event) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

async function dbGetAll(): Promise<any[]> {
  const db = await dbOpen();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).index('updatedAt').getAll();
    req.onsuccess = (e: Event) => resolve(((e.target as IDBRequest).result as any[]).reverse());
    req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
  });
}

async function dbGet(id: string): Promise<any> {
  const db = await dbOpen();
  return new Promise<any>((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    req.onsuccess = (e: Event) => resolve((e.target as IDBRequest).result);
    req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
  });
}

async function dbPut(project: any): Promise<any> {
  const db = await dbOpen();
  return new Promise<any>((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(project);
    req.onsuccess = (e: Event) => resolve((e.target as IDBRequest).result);
    req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await dbOpen();
  return new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e: Event) => reject((e.target as IDBRequest).error);
  });
}

// ─── Project snapshot ─────────────────────────────────────
function _projectSnapshot(): any {
  return {
    topic: currentTopic,
    level: currentLevel,
    lang: lang,
    modelProvider: selectedModel.provider,
    modelId: selectedModel.model,
    agents: JSON.parse(JSON.stringify(generatedAgents)),
    files: JSON.parse(JSON.stringify(generatedFiles)),
    // versionHistory declared as var in globals.d.ts — access safely
    versionHistory: JSON.parse(JSON.stringify(typeof versionHistory !== 'undefined' ? versionHistory : [])),
    chatHistory: JSON.parse(JSON.stringify(chatHistory)),
  };
}

function _projectName(topic: string): string {
  return topic || 'Untitled Project';
}

// ─── Auto-save ────────────────────────────────────────────
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSave(): void {
  if (!generatedAgents.length) return;
  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => saveCurrentProject(true), 2000);
}

// ─── Save / Update ────────────────────────────────────────
async function saveCurrentProject(silent = false): Promise<void> {
  if (!generatedAgents.length) {
    if (!silent) showNotif(lang === 'en' ? '⚠ Generate a team first before saving' : '⚠ Najpierw wygeneruj zespół', true);
    return;
  }
  try {
    const now = Date.now();
    const snap = _projectSnapshot();

    if (_currentProjectId) {
      const existing = await dbGet(_currentProjectId);
      if (existing) {
        await dbPut({ ...existing, ...snap, updatedAt: now });
      } else {
        _currentProjectId = null;
      }
    }

    if (!_currentProjectId) {
      _currentProjectId = 'proj_' + now + '_' + Math.random().toString(36).slice(2, 7);
      await dbPut({
        id: _currentProjectId,
        name: _projectName(currentTopic),
        createdAt: now,
        updatedAt: now,
        ...snap,
      });
    } else {
      const existing = await dbGet(_currentProjectId);
      if (existing) await dbPut({ ...existing, name: _projectName(currentTopic), updatedAt: now, ...snap });
    }

    _showSaveIndicator();
    await _updateProjectsBadge();
    if (!silent) showNotif(lang === 'en' ? '✓ Project saved!' : '✓ Projekt zapisany!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AgentSpark] Save failed:', err);
    if (!silent) showNotif(lang === 'en' ? '⚠ Save failed: ' + msg : '⚠ Błąd zapisu: ' + msg, true);
  }
}

// Timer helper with typed property
interface SaveIndicatorFn {
  (): void;
  _t?: ReturnType<typeof setTimeout>;
}

const _showSaveIndicator: SaveIndicatorFn = function (): void {
  const el = document.getElementById('save-indicator') as HTMLElement | null;
  if (!el) return;
  el.textContent = '✓ saved';
  el.classList.add('visible');
  if (_showSaveIndicator._t) clearTimeout(_showSaveIndicator._t);
  _showSaveIndicator._t = setTimeout(() => el.classList.remove('visible'), 2500);
};

// ─── Load ─────────────────────────────────────────────────
async function loadProject(id: string): Promise<void> {
  try {
    const proj = await dbGet(id);
    if (!proj) { showNotif('⚠ Project not found', true); return; }

    currentTopic = proj.topic || '';
    currentLevel = proj.level || 'beginner'; // M-05: was 'iskra' (Polish) — use English default
    lang = proj.lang || 'en';
    generatedAgents = proj.agents || [];
    generatedFiles = proj.files || {};
    chatHistory = proj.chatHistory || [];
    // versionHistory is var — assign via window to keep globals in sync
    (window as any).versionHistory = proj.versionHistory || [];
    _currentProjectId = proj.id;

    if (proj.modelId) {
      const opt = document.querySelector(`#modelSelect option[value*="${proj.modelId}"]`) as HTMLOptionElement | null;
      if (opt) { opt.selected = true; if (typeof onModelChange === 'function') onModelChange(); }
    }
    if (typeof setLang === 'function') setLang(lang);

    showScreen('results');
    const apiKeyHeader = document.getElementById('apiKeyHeader') as HTMLElement | null;
    if (apiKeyHeader) apiKeyHeader.style.display = 'flex';
    if (typeof renderResults === 'function') renderResults();
    _showSaveIndicator();
    showNotif(lang === 'en' ? `📂 "${proj.name}" loaded` : `📂 Załadowano "${proj.name}"`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AgentSpark] Load failed:', err);
    showNotif('⚠ Failed to load project: ' + msg, true);
  }
}

// ─── Delete ───────────────────────────────────────────────
async function deleteProject(id: string, name: string): Promise<void> {
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showNotif('⚠ Delete failed: ' + msg, true);
  }
}

// ─── Fork ─────────────────────────────────────────────────
async function forkProject(id: string): Promise<void> {
  try {
    const proj = await dbGet(id);
    if (!proj) return;
    const now = Date.now();
    const newId = 'proj_' + now + '_' + Math.random().toString(36).slice(2, 7);
    await dbPut({ ...proj, id: newId, name: proj.name + ' (copy)', createdAt: now, updatedAt: now });
    await renderProjectsList();
    await _updateProjectsBadge();
    showNotif(lang === 'en' ? '✓ Project duplicated' : '✓ Projekt zduplikowany');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    showNotif('⚠ Fork failed: ' + msg, true);
  }
}

// ─── Projects screen ──────────────────────────────────────
async function openProjectsScreen(): Promise<void> {
  if (window._updateContextBar) window._updateContextBar('projects');
  showScreen('projects');
  await renderProjectsList();
}

async function renderProjectsList(): Promise<void> {
  const list = document.getElementById('projects-list') as HTMLElement | null;
  const empty = document.getElementById('projects-empty') as HTMLElement | null;
  const searchEl = document.getElementById('projects-search') as HTMLInputElement | null;
  const search = (searchEl?.value || '').toLowerCase();
  if (!list) return;

  let projects: any[] = [];
  try { projects = await dbGetAll(); } catch (e) { console.error(e); }

  const filtered = search
    ? projects.filter((p: any) =>
      (p.name || '').toLowerCase().includes(search) ||
      (p.topic || '').toLowerCase().includes(search)
    )
    : projects;

  if (!filtered.length) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = '';
  filtered.forEach((p: any) => {
    // C-04: Build card using DOM APIs only — never inject user data via innerHTML
    const card = document.createElement('div');
    card.className = 'project-card';
    const agentCount = (p.agents || []).length;
    const updatedStr = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—';

    // Header row
    const header = document.createElement('div');
    header.className = 'project-card-header';

    const nameEl = document.createElement('div');
    nameEl.className = 'project-name';
    nameEl.textContent = p.name || 'Untitled'; // safe: textContent never executes scripts

    const dateEl = document.createElement('div');
    dateEl.className = 'project-date';
    dateEl.textContent = updatedStr;

    header.appendChild(nameEl);
    header.appendChild(dateEl);

    // Meta row
    const meta = document.createElement('div');
    meta.className = 'project-meta';

    const agentsSpan = document.createElement('span');
    agentsSpan.textContent = `🤖 ${agentCount} ${lang === 'en' ? 'agents' : 'agentów'}`;

    const levelSpan = document.createElement('span');
    levelSpan.textContent = p.level || '';

    meta.appendChild(agentsSpan);
    meta.appendChild(levelSpan);

    // Actions row
    const actions = document.createElement('div');
    actions.className = 'project-card-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-primary';
    loadBtn.style.cssText = 'font-size:0.8rem;padding:0.35rem 0.9rem;';
    loadBtn.textContent = lang === 'en' ? 'Load' : 'Załaduj';
    loadBtn.addEventListener('click', () => loadProject(p.id));

    const forkBtn = document.createElement('button');
    forkBtn.className = 'btn-secondary';
    forkBtn.style.cssText = 'font-size:0.8rem;padding:0.35rem 0.75rem;';
    forkBtn.textContent = '⎇';
    forkBtn.addEventListener('click', () => forkProject(p.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-secondary';
    deleteBtn.style.cssText = 'font-size:0.8rem;padding:0.35rem 0.75rem;color:var(--accent2);';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => deleteProject(p.id, p.name || 'Untitled'));

    actions.appendChild(loadBtn);
    actions.appendChild(forkBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

async function _updateProjectsBadge(): Promise<void> {
  try {
    const all = await dbGetAll();
    const count = all.length;
    const badge = document.getElementById('tab-badge') as HTMLElement | null;
    const countBadge = document.getElementById('projects-count-badge') as HTMLElement | null;
    if (badge) {
      badge.textContent = count > 0 ? String(count) : '';
      badge.style.display = count > 0 ? '' : 'none';
    }
    if (countBadge) {
      countBadge.textContent = count > 0 ? String(count) : '';
      countBadge.style.display = count > 0 ? '' : 'none';
    }
    if (typeof window.updateDrawerActive === 'function') window.updateDrawerActive();
  } catch (e) { /* badge update is non-critical */ }
}

// Hook called after agents are generated
function _onAgentsReady(): void {
  scheduleAutoSave();
}

// ─── Window exports ───────────────────────────────────────
window.saveCurrentProject = saveCurrentProject;
window.loadProject = loadProject;
window.deleteProject = deleteProject;
window.forkProject = forkProject;
window.openProjectsScreen = openProjectsScreen;
window.renderProjectsList = renderProjectsList;
window.scheduleAutoSave = scheduleAutoSave;
window._onAgentsReady = _onAgentsReady;
window._updateProjectsBadge = _updateProjectsBadge;

// ─── Init on load ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await _updateProjectsBadge();

  // Restore API key from sessionStorage (migrated from localStorage for security)
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
    const inp = document.getElementById('apiKeySetupInput') as HTMLInputElement | null;
    if (inp) inp.value = savedKey;
    const demoCta = document.getElementById('demo-cta') as HTMLElement | null;
    if (demoCta) demoCta.style.display = 'none';
    if (typeof checkApiKey === 'function') checkApiKey();
  }
});
