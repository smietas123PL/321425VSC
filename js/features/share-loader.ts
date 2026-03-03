// ─── FEATURES/SHARE-LOADER.TS ────────────────────────────
// Fixed: TS2339 .value/.disabled on HTMLElement → typed casts,
//        TS7006 implicit params, TS7034/7005 implicit vars,
//        TS18046 unknown errors, TS2304 missing names,
//        TS2554 _promptPassword() called with 0 args

// ─── Declarations for app.ts globals ─────────────────────
declare let _importParsed: any;
declare function _showImportPreview(payload: any, src: string): void;
declare function _showImportError(msg: string): void;
declare function _clearImportError(): void;

// ─── SHARE LIMITS ─────────────────────────────────────────
const SHARE_LIMITS = {
  maxHashChars: 24000,
  maxEncodedChars: 22000,
  maxDecodedBytes: 160000,
  maxJsonChars: 160000,
};

// ─── Compress/Decompress helpers ──────────────────────────
async function compress(str: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(enc.encode(str));
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

async function decompress(bytes: Uint8Array): Promise<string> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes as any);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return new TextDecoder().decode(out);
}

function uint8ToBase64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToUint8(str: string): Uint8Array {
  const padLen = (4 - (str.length % 4)) % 4;
  const b64 = (str + '='.repeat(padLen)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── Payload helpers ──────────────────────────────────────
// Prefixed _sl to avoid duplicate function conflict with gallery.ts
function _slCleanStr(val: any, maxLen = 180): string {
  if (!val || typeof val !== 'string') return '';
  return val.slice(0, maxLen);
}

function _slCleanList(arr: any, maxItems = 12, maxLen = 120): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxItems).map((s: any) => _slCleanStr(String(s || ''), maxLen)).filter(Boolean);
}

function validateSharePayload(raw: any): any | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!Number.isInteger(raw.v) || raw.v < 2 || raw.v > 3) return null;
  if (!Array.isArray(raw.agents) || raw.agents.length === 0 || raw.agents.length > 24) return null;
  if (raw.files && typeof raw.files !== 'object') return null;

  const topic = _slCleanStr(raw.topic || 'Shared Team', 160);
  const level = _slCleanStr(raw.level || 'iskra', 24);
  const payloadLang = raw.lang === 'pl' ? 'pl' : 'en';
  const agents = raw.agents.map((a: any) => {
    if (!a || typeof a !== 'object') return null;
    return {
      ...a,
      id: _slCleanStr(a.id, 80),
      name: _slCleanStr(a.name, 120),
      role: _slCleanStr(a.role, 120),
      description: _slCleanStr(a.description, 1000),
    };
  }).filter((a: any) => a && a.id && a.name);
  if (!agents.length) return null;

  return {
    v: raw.v,
    topic,
    level,
    lang: payloadLang,
    agents,
    files: (raw.files && typeof raw.files === 'object') ? raw.files : {},
    ts: Number.isFinite(raw.ts) ? raw.ts : Date.now(),
    pw: !!raw.pw,
  };
}

// ─── XOR legacy ───────────────────────────────────────────
function xorObfuscate(str: string, password: string): string {
  const key = password.split('').map((c: string) => c.charCodeAt(0));
  return str.split('').map((c: string, i: number) =>
    String.fromCharCode(c.charCodeAt(0) ^ key[i % key.length])
  ).join('');
}

// ─── AES-GCM helpers ──────────────────────────────────────
async function _aesKeyFromPassword(password: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password) as any, 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes as any, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function aesGcmEncrypt(plaintext: string, password: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await _aesKeyFromPassword(password, salt);
  const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const ct = new Uint8Array(ctBuf);
  const packed = new Uint8Array(salt.length + iv.length + ct.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(ct, salt.length + iv.length);
  return packed;
}

async function aesGcmDecrypt(packedBytes: Uint8Array, password: string): Promise<string> {
  const salt = packedBytes.slice(0, 16);
  const iv = packedBytes.slice(16, 28);
  const ct = packedBytes.slice(28);
  const key = await _aesKeyFromPassword(password, salt);
  const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(ptBuf);
}

// ─── Compress bytes helpers ───────────────────────────────
async function _compressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes as any);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

async function _decompressBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes as any);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

// ─── Password unlock modal ────────────────────────────────
// TS7034 fix: explicit types on resolve/reject callbacks
let _unlockResolve: ((pw: string) => void) | null = null;
let _unlockRejectCb: ((err: Error) => void) | null = null;

function _unlockReject(): void {
  (document.getElementById('unlock-modal') as HTMLElement).classList.remove('open');
  // TS7005 fix: _unlockRejectCb is now typed
  if (_unlockRejectCb) { _unlockRejectCb(new Error('cancelled')); _unlockRejectCb = null; }
}

// TS2554 fix: descText is optional with default
function _promptPassword(descText?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    _unlockResolve = resolve;
    _unlockRejectCb = reject;
    const descEl = document.getElementById('unlock-modal-desc') as HTMLElement | null;
    if (descEl && descText) descEl.textContent = descText;
    // TS2339 fix: cast to HTMLInputElement for .value
    const input = document.getElementById('unlock-password-input') as HTMLInputElement | null;
    if (input) input.value = '';
    const errEl = document.getElementById('unlock-error') as HTMLElement | null;
    if (errEl) errEl.style.display = 'none';
    (document.getElementById('unlock-modal') as HTMLElement).classList.add('open');
    setTimeout(() => input?.focus(), 80);
  });
}

function _unlockConfirm(): void {
  // TS2339 fix: HTMLInputElement
  const pw = (document.getElementById('unlock-password-input') as HTMLInputElement)?.value || '';
  if (!pw) return;
  (document.getElementById('unlock-modal') as HTMLElement).classList.remove('open');
  // TS7005 fix: _unlockResolve is now typed
  if (_unlockResolve) { _unlockResolve(pw); _unlockResolve = null; }
}

function _unlockShowError(): void {
  const errEl = document.getElementById('unlock-error') as HTMLElement | null;
  if (errEl) errEl.style.display = 'block';
  // TS2339 fix: HTMLInputElement
  const input = document.getElementById('unlock-password-input') as HTMLInputElement | null;
  if (input) { input.value = ''; input.focus(); }
  (document.getElementById('unlock-modal') as HTMLElement).classList.add('open');
}

// ─── Gist error helpers ───────────────────────────────────
function _showGistImportError(msg: string): void {
  const el = document.getElementById('gist-import-error') as HTMLElement | null;
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function _clearGistImportError(): void {
  const el = document.getElementById('gist-import-error') as HTMLElement | null;
  if (el) { el.textContent = ''; el.style.display = 'none'; }
  const btn = document.getElementById('gist-import-btn') as HTMLButtonElement | null;
  const label = document.getElementById('gist-import-label') as HTMLElement | null;
  if (btn) btn.disabled = false;
  if (label && label.textContent !== tr('✓ Loaded', '✓ Wczytano')) {
    label.textContent = tr('Load ->', 'Wczytaj ->');
  }
}

// ─── Load from Gist URL ───────────────────────────────────
async function loadFromGistUrl(): Promise<void> {
  // TS2339 fix: HTMLInputElement for .value
  const raw = (document.getElementById('gist-import-input') as HTMLInputElement)?.value?.trim();
  if (!raw) {
    _showGistImportError(tr('⚠ Paste a Gist URL or ID first.', '⚠ Najpierw wklej URL lub ID Gist.'));
    return;
  }

  let gistId = raw;
  const urlMatch = raw.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i);
  if (urlMatch) gistId = urlMatch[1];
  const rawMatch = raw.match(/gist\.githubusercontent\.com\/[^/]+\/([a-f0-9]+)/i);
  if (rawMatch) gistId = rawMatch[1];

  if (!/^[a-f0-9]{20,}$/i.test(gistId)) {
    _showGistImportError(tr('⚠ Could not extract a valid Gist ID.', '⚠ Nie udalo sie wyodrebnic poprawnego ID Gist.'));
    return;
  }

  // TS2339 fix: HTMLButtonElement for .disabled
  const btn = document.getElementById('gist-import-btn') as HTMLButtonElement;
  const label = document.getElementById('gist-import-label') as HTMLElement;
  label.textContent = tr('⏳ Loading…', '⏳ Wczytywanie…');
  btn.disabled = true;
  _clearGistImportError();

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!res.ok) {
      throw new Error(res.status === 404
        ? tr('Gist not found — check the URL or ID.', 'Nie znaleziono Gist — sprawdz URL lub ID.')
        : tr(`GitHub error ${res.status}`, `Blad GitHub ${res.status}`));
    }
    const data = await res.json();
    const files = data.files || {};
    // TS18046 fix: explicit type annotation on find callback
    const asFile: any = files['agentspark-project.json']
      || Object.values(files).find((f: unknown) => (f as any)?.filename?.includes('agentspark'));
    if (!asFile) throw new Error(tr('This Gist does not contain an AgentSpark project file.', 'Ten Gist nie zawiera pliku projektu AgentSpark.'));

    let content = asFile.content;
    if (asFile.truncated) {
      const rawRes = await fetch(asFile.raw_url);
      content = await rawRes.text();
    }

    let payload: any;
    try { payload = JSON.parse(content); }
    catch (e) { throw new Error(tr('Invalid JSON in Gist file.', 'Nieprawidlowy JSON w pliku Gist.')); }

    if (!payload.agents?.length) throw new Error(tr('No agents found in this Gist.', 'W tym Gist nie znaleziono agentow.'));

    _importParsed = { ...payload, _sourceFile: `Gist: ${gistId.slice(0, 8)}…` };
    _showImportPreview(payload, `Gist from ${data.owner?.login || 'unknown'}: ${data.description || gistId}`);

    label.textContent = tr('✓ Loaded', '✓ Wczytano');
    _clearGistImportError();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    _showGistImportError(`⚠ ${msg}`);
    label.textContent = tr('Load ->', 'Wczytaj ->');
    btn.disabled = false;
  }
}

// ─── Publish to Gist ──────────────────────────────────────
async function publishToGist(): Promise<void> {
  // TS2339 fix: HTMLInputElement for .value
  const token = (document.getElementById('gist-token-input') as HTMLInputElement).value.trim();
  if (!token) {
    showNotif(tr('⚠ Enter your GitHub token first', '⚠ Najpierw podaj token GitHub'), true);
    return;
  }
  if (!generatedAgents.length) {
    showNotif(tr('⚠ No agents to publish', '⚠ Brak agentow do publikacji'), true);
    return;
  }

  // TS2339 fix: HTMLButtonElement for .disabled
  const btn = document.getElementById('gist-publish-btn') as HTMLButtonElement;
  const label = document.getElementById('gist-publish-label') as HTMLElement;
  label.textContent = tr('⏳ Publishing…', '⏳ Publikowanie…');
  btn.disabled = true;

  const payload = {
    v: 3, source: 'agentspark',
    topic: currentTopic, level: currentLevel, lang,
    agents: generatedAgents, files: generatedFiles,
    ts: Date.now(),
  };

  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        description: `AgentSpark: ${currentTopic}`,
        public: true,
        files: {
          'agentspark-project.json': { content: JSON.stringify(payload, null, 2) },
          'README.md': { content: `# AgentSpark Team: ${currentTopic}\n\n## Import\n1. Open AgentSpark\n2. Go to Results → Import\n3. Paste this Gist ID: \`{{GIST_ID}}\`` },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).message || `GitHub error ${res.status}`);
    }

    const data = await res.json();
    const gistUrl = data.html_url;
    const gistId = data.id;

    // Update README with actual gist ID
    await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `token ${token}` },
      body: JSON.stringify({
        files: { 'README.md': { content: `# AgentSpark Team: ${currentTopic}\n\n## Import\n1. Open AgentSpark\n2. Paste this Gist URL or ID: \`${gistId}\`` } },
      }),
    });

    // XSS fix: gistUrl and gistId come from external GitHub API \u2014
    // never insert them directly into innerHTML or onclick attributes.
    const resultEl = document.getElementById('gist-result') as HTMLElement;
    resultEl.style.display = 'block';
    resultEl.innerHTML = ''; // clear

    const resultBox = document.createElement('div');
    resultBox.style.cssText = 'background:rgba(124,196,42,0.1);border:1px solid rgba(124,196,42,0.3);border-radius:8px;padding:0.75rem 1rem;font-size:0.82rem;';

    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'color:var(--success);font-weight:700;margin-bottom:0.4rem;';
    successMsg.textContent = tr('✓ Published to GitHub Gist!', '✓ Opublikowano w GitHub Gist!');

    const link = document.createElement('a');
    // XSS: only allow https:// URLs — reject anything else (e.g. javascript:)
    link.href = gistUrl.startsWith('https://') ? gistUrl : '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.cssText = 'color:var(--accent);word-break:break-all;display:block;margin:0.3rem 0;';
    link.textContent = gistUrl; // textContent \u2014 safe even if URL is malformed

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:0.5rem;display:flex;gap:0.5rem;';

    const copyUrlBtn = document.createElement('button');
    copyUrlBtn.style.cssText = 'background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:0.3rem 0.7rem;font-size:0.75rem;cursor:pointer;';
    copyUrlBtn.textContent = tr('📋 Copy URL', '📋 Kopiuj URL');
    copyUrlBtn.onclick = () => navigator.clipboard.writeText(gistUrl)
      .then(() => showNotif(tr('✓ URL copied!', '✓ URL skopiowany!')));

    const copyIdBtn = document.createElement('button');
    copyIdBtn.style.cssText = 'background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:0.3rem 0.7rem;font-size:0.75rem;cursor:pointer;';
    copyIdBtn.textContent = tr('📋 Copy ID', '📋 Kopiuj ID');
    copyIdBtn.onclick = () => navigator.clipboard.writeText(gistId)
      .then(() => showNotif(tr('✓ ID copied!', '✓ ID skopiowane!')));

    btnRow.appendChild(copyUrlBtn);
    btnRow.appendChild(copyIdBtn);
    resultBox.appendChild(successMsg);
    resultBox.appendChild(link);
    resultBox.appendChild(btnRow);
    resultEl.appendChild(resultBox);

    label.textContent = tr('✓ Published', '✓ Opublikowano');
    showNotif(tr('✓ Gist published!', '✓ Gist opublikowany!'));
  } catch (e: any) {
    // TS2339 fix: catch typed as any → .message is safe
    label.textContent = tr('⬆ Publish Gist', '⬆ Publikuj Gist');
    btn.disabled = false;
    showNotif(tr(`⚠ Gist error: ${e?.message}`, `⚠ Blad Gist: ${e?.message}`), true);
  }
}

// ─── Load from URL hash ───────────────────────────────────
async function loadFromHash(): Promise<boolean> {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return false;
  if (hash.length > SHARE_LIMITS.maxHashChars) return false;

  const encoded = hash.slice('#share='.length);
  if (!encoded) return false;
  if (encoded.length > SHARE_LIMITS.maxEncodedChars) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return false;

  try {
    const bytes = base64urlToUint8(encoded);
    if (bytes.length > SHARE_LIMITS.maxDecodedBytes) return false;

    let payload: any = null;
    let jsonStr: string | null = null;
    try {
      jsonStr = await decompress(bytes);
      if (jsonStr && jsonStr.length > SHARE_LIMITS.maxJsonChars) return false;
      payload = JSON.parse(jsonStr);
    } catch (e) { /* might be encrypted */ }

    if (payload && payload.pw) {
      let pw: string;
      try {
        // TS2554 fix: descText is now optional
        pw = await _promptPassword(
          lang === 'en'
            ? '🔒 This team is password protected. Enter the password to unlock it.'
            : '🔒 Ten zespół jest chroniony hasłem. Podaj hasło, aby go odblokować.'
        );
      } catch (e) { return false; }

      while (true) {
        const decrypted = xorObfuscate(jsonStr || '', pw);
        try {
          payload = JSON.parse(decrypted);
          break;
        } catch (e2) {
          _unlockShowError();
          try {
            // TS2554 fix: 0-arg call now valid with optional param
            pw = await _promptPassword();
          } catch (e3) { return false; }
        }
      }
    }

    if (!payload) {
      let decompressedBytes: Uint8Array;
      try {
        decompressedBytes = await _decompressBytes(bytes);
      } catch (e) {
        decompressedBytes = bytes;
      }

      let pw: string;
      try {
        pw = await _promptPassword(
          lang === 'en'
            ? '🔒 This team is password protected (AES-256-GCM). Enter the password to unlock it.'
            : '🔒 Ten zespół jest zaszyfrowany (AES-256-GCM). Podaj hasło, aby go odblokować.'
        );
      } catch (e) { return false; }

      while (true) {
        try {
          const decrypted = await aesGcmDecrypt(decompressedBytes, pw);
          if (decrypted.length > SHARE_LIMITS.maxJsonChars) return false;
          payload = JSON.parse(decrypted);
          break;
        } catch (e) {
          _unlockShowError();
          try {
            pw = await _promptPassword();
          } catch (e2) { return false; }
        }
      }
    }

    const validated = validateSharePayload(payload);
    if (!validated) {
      trackEvent('share_loaded', { success: false, reason: 'invalid_schema' });
      return false;
    }

    currentTopic = validated.topic || 'Shared Team';
    currentLevel = validated.level || 'iskra';
    if (validated.lang) lang = validated.lang;
    generatedAgents = validated.agents;
    generatedFiles = validated.files || {};

    // TS2304 fix: versionHistory declared in globals.d.ts
    versionHistory = [{
      id: Date.now(),
      label: lang === 'en' ? 'Shared (original)' : 'Udostępniony (oryginał)',
      agents: JSON.parse(JSON.stringify(generatedAgents)),
      files: JSON.parse(JSON.stringify(generatedFiles)),
      ts: Date.now(),
    }];

    if (typeof renderProjectsList === 'function') await renderProjectsList();
    if (typeof showResults === 'function') showResults();

    trackEvent('share_loaded', { success: true, agents: generatedAgents.length, encrypted: !!payload.pw });
    return true;
  } catch (e: unknown) {
    // TS2339 fix: typed catch
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Share load error:', msg);
    trackEvent('share_loaded', { success: false, reason: msg.slice(0, 120) });
    return false;
  }
}

// ─── Window exports ───────────────────────────────────────
window.loadFromGistUrl = loadFromGistUrl;
window.publishToGist = publishToGist;
window.loadFromHash = loadFromHash;
window.aesGcmEncrypt = aesGcmEncrypt;
window.aesGcmDecrypt = aesGcmDecrypt;
window._unlockConfirm = _unlockConfirm;
window._unlockReject = _unlockReject;
window._unlockShowError = _unlockShowError;
