// js/features/share-loader.js

declare let _importParsed: any;
declare function _showImportPreview(payload: any, src: string): void;

async function loadFromGistUrl() {
  const raw = (document.getElementById('gist-import-input') as HTMLInputElement)?.value?.trim();
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

  const btn = (document.getElementById('gist-import-btn') as HTMLButtonElement);
  const label = (document.getElementById('gist-import-label') as HTMLElement);
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
    const asFile = files['agentspark-project.json'] || Object.values(files).find((f: any) => f.filename?.includes('agentspark'));
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
    _importParsed = { ...payload, _sourceFile: `Gist: ${gistId.slice(0, 8)}…` };
    _showImportPreview(payload, `Gist from ${data.owner?.login || 'unknown'}: ${data.description || gistId}`);

    label.textContent = tr('✓ Loaded', '✓ Wczytano');
    _clearGistImportError();
  } catch (e: any) {
    _showGistImportError(`⚠ ${e.message}`);
    label.textContent = tr('Load ->', 'Wczytaj ->');
    btn.disabled = false;
  }
}

function _showGistImportError(msg: string) {
  const el = (document.getElementById('gist-import-error') as HTMLElement);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function _clearGistImportError() {
  const el = (document.getElementById('gist-import-error') as HTMLElement);
  if (el) { el.textContent = ''; el.style.display = 'none'; }
  // Also reset button if needed
  const btn = (document.getElementById('gist-import-btn') as HTMLButtonElement);
  const label = (document.getElementById('gist-import-label') as HTMLElement);
  if (btn) btn.disabled = false;
  if (label && label.textContent !== tr('✓ Loaded', '✓ Wczytano')) {
    label.textContent = tr('Load ->', 'Wczytaj ->');
  }
}

// ─── GITHUB GIST PUBLISH ─────────────────────────────────
async function publishToGist() {
  const token = (document.getElementById('gist-token-input') as HTMLInputElement).value.trim();
  if (!token) {
    showNotif(tr('⚠ Enter your GitHub token first', '⚠ Najpierw podaj token GitHub'), true); return;
  }
  if (!generatedAgents.length) {
    showNotif(tr('⚠ No agents to publish', '⚠ Brak agentow do publikacji'), true); return;
  }

  const btn = (document.getElementById('gist-publish-btn') as HTMLButtonElement);
  const label = (document.getElementById('gist-publish-label') as HTMLElement);
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

    if (!res.ok) {
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

    const resultEl = (document.getElementById('gist-result') as HTMLElement);
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
  } catch (e: any) {
    label.textContent = tr('⬆ Publish Gist', '⬆ Publikuj Gist');
    btn.disabled = false;
    showNotif(tr(`⚠ Gist error: ${e.message}`, `⚠ Blad Gist: ${e.message}`), true);
  }
}

// ─── PLAYGROUND ──────────────────────────────────────────
// moved to js/features/playground.js

// ── Load from URL hash on startup ──────────────────────────
async function loadFromHash() {
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

    // Try 1: decompress as plain text (unencrypted, v1 or v2 open link)
    let payload = null;
    let jsonStr = null;
    try {
      jsonStr = await decompress(bytes);
      if (jsonStr && jsonStr.length > SHARE_LIMITS.maxJsonChars) return false;
      payload = JSON.parse(jsonStr);
    } catch (e) {
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
      } catch (e) { return false; } // user cancelled

      while (true) {
        const decrypted = xorObfuscate(jsonStr || '', pw as string);
        try {
          payload = JSON.parse(decrypted);
          break; // success
        } catch (e2) {
          _unlockShowError();
          try {
            pw = await _promptPassword();
          } catch (e3) { return false; }
        }
      }
    }

    // If no valid plain payload yet → treat as v3 AES-GCM encrypted binary
    if (!payload) {
      let decompressedBytes;
      try {
        decompressedBytes = await _decompressBytes(bytes);
      } catch (e) {
        decompressedBytes = bytes; // maybe not compressed
      }

      let pw;
      try {
        pw = await _promptPassword(
          lang === 'en'
            ? '🔒 This team is password protected (AES-256-GCM). Enter the password to unlock it.'
            : '🔒 Ten zespół jest zaszyfrowany (AES-256-GCM). Podaj hasło, aby go odblokować.'
        );
      } catch (e) { return false; }

      while (true) {
        try {
          const decrypted = await aesGcmDecrypt(decompressedBytes, pw as string);
          if (decrypted.length > SHARE_LIMITS.maxJsonChars) return false;
          payload = JSON.parse(decrypted);
          break; // success
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

    // Restore state
    currentTopic = validated.topic || 'Shared Team';
    currentLevel = validated.level || 'iskra';
    if (validated.lang) lang = validated.lang;
    generatedAgents = validated.agents;
    generatedFiles = validated.files || {};
    versionHistory = [{
      id: Date.now(),
      label: lang === 'en' ? `Shared: ${currentTopic}` : `Udostępniony: ${currentTopic}`,
      ts: new Date(validated.ts || Date.now()),
      agents: JSON.parse(JSON.stringify(generatedAgents)),
      files: JSON.parse(JSON.stringify(generatedFiles)),
      diff: { added: [], removed: [], changed: [] },
      removedNames: {},
      agentNames: Object.fromEntries(generatedAgents.map(a => [a.id, a.name])),
      vNum: 1,
      isOrigin: true,
    }];

    // Show results
    showResults();

    // Show shared banner
    const banner = (document.getElementById('shared-banner') as HTMLElement);
    const bannerTitle = (document.getElementById('shared-banner-title') as HTMLElement);
    const bannerSub = (document.getElementById('shared-banner-sub') as HTMLElement);
    if (banner) {
      bannerTitle.textContent = lang === 'en'
        ? `🔗 Shared team: "${currentTopic}"`
        : `🔗 Udostępniony zespół: "${currentTopic}"`;
      bannerSub.textContent = lang === 'en'
        ? `${generatedAgents.length} agents · Read-only view · Start Over to create your own`
        : `${generatedAgents.length} agentów · Widok tylko do odczytu · Zacznij od nowa, by stworzyć własny`;
      banner.style.display = 'flex';
    }

    // Clean hash from URL (so refresh doesn't re-load)
    history.replaceState(null, '', window.location.pathname + window.location.search);
    trackEvent('share_loaded', { success: true, agents: generatedAgents.length });

    return true;
  } catch (e) {
    console.warn('[AgentSpark] Failed to load shared URL:', e);
    trackEvent('share_loaded', {
      success: false,
      reason: String((e as any)?.message || 'exception').slice(0, 120)
    });
    return false;
  }
}

// ─── SHARING VIA URL ──────────────────────────────────────

// Compress string → Uint8Array (gzip via CompressionStream)
async function compress(str: string) {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const enc = new TextEncoder();
  writer.write(enc.encode(str));
  writer.close();
  const chunks = [];
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

// Decompress Uint8Array → string
async function decompress(bytes: Uint8Array) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes as any);
  writer.close();
  const chunks = [];
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

// Uint8Array → URL-safe base64
function uint8ToBase64url(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// URL-safe base64 → Uint8Array
function base64urlToUint8(str: string) {
  const padLen = (4 - (str.length % 4)) % 4;
  const b64 = (str + '='.repeat(padLen)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const SHARE_LIMITS = {
  maxHashChars: 24000,
  maxEncodedChars: 22000,
  maxDecodedBytes: 160000,
  maxJsonChars: 160000
};

function validateSharePayload(raw: any) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Number.isInteger(raw.v) || raw.v < 2 || raw.v > 3) return null;
  if (!Array.isArray(raw.agents) || raw.agents.length === 0 || raw.agents.length > 24) return null;
  if (raw.files && typeof raw.files !== 'object') return null;

  const topic = _cleanStr(raw.topic || 'Shared Team', 160);
  const level = _cleanStr(raw.level || 'iskra', 24);
  const payloadLang = raw.lang === 'pl' ? 'pl' : 'en';
  const agents = raw.agents.map((a: any) => {
    if (!a || typeof a !== 'object') return null;
    return {
      ...a,
      id: _cleanStr(a.id, 80),
      name: _cleanStr(a.name, 120),
      role: _cleanStr(a.role, 120),
      description: _cleanStr(a.description, 1000)
    };
  }).filter((a: any) => a && a.id && a.name);
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
function xorObfuscate(str: string, password: string) {
  const key = password.split('').map(c => c.charCodeAt(0));
  return str.split('').map((c: string, i: number) =>
    String.fromCharCode(c.charCodeAt(0) ^ key[i % key.length])
  ).join('');
}

// ── AES-256-GCM helpers (#3) ──────────────────────────────
// Derive a 256-bit key from a password using PBKDF2 + a fixed app salt
async function _aesKeyFromPassword(password: string, saltBytes: Uint8Array) {
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

async function aesGcmEncrypt(plaintext: string, password: string) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV
  const salt = crypto.getRandomValues(new Uint8Array(16));  // 128-bit PBKDF2 salt
  const key = await _aesKeyFromPassword(password, salt);
  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  // Pack: [salt 16B][iv 12B][ciphertext …]
  const ct = new Uint8Array(ctBuf);
  const packed = new Uint8Array(salt.length + iv.length + ct.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(ct, salt.length + iv.length);
  return packed;
}

async function aesGcmDecrypt(packedBytes: Uint8Array, password: string) {
  const salt = packedBytes.slice(0, 16);
  const iv = packedBytes.slice(16, 28);
  const ct = packedBytes.slice(28);
  const key = await _aesKeyFromPassword(password, salt);
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  );
  return new TextDecoder().decode(ptBuf);
}

// ── Password unlock modal promise ─────────────────────────
let _unlockResolve: any = null;
let _unlockRejectCb: any = null;

function _unlockReject() {
  (document.getElementById('unlock-modal') as HTMLElement).classList.remove('open');
  if (_unlockRejectCb) { _unlockRejectCb(new Error('cancelled')); _unlockRejectCb = null; }
}

function _promptPassword(descText?: string) {
  return new Promise((resolve, reject) => {
    _unlockResolve = resolve;
    _unlockRejectCb = reject;
    const descEl = (document.getElementById('unlock-modal-desc') as HTMLElement);
    if (descEl && descText) descEl.textContent = descText;
    const input = (document.getElementById('unlock-password-input') as HTMLInputElement);
    if (input) input.value = '';
    const errEl = (document.getElementById('unlock-error') as HTMLElement);
    if (errEl) errEl.style.display = 'none';
    (document.getElementById('unlock-modal') as HTMLElement).classList.add('open');
    setTimeout(() => input?.focus(), 80);
  });
}

function _unlockConfirm() {
  const pw = (document.getElementById('unlock-password-input') as HTMLInputElement)?.value || '';
  if (!pw) return;
  (document.getElementById('unlock-modal') as HTMLElement).classList.remove('open');
  if (_unlockResolve) { _unlockResolve(pw); _unlockResolve = null; }
}

function _unlockShowError() {
  const errEl = (document.getElementById('unlock-error') as HTMLElement);
  if (errEl) errEl.style.display = 'block';
  const input = (document.getElementById('unlock-password-input') as HTMLInputElement);
  if (input) { input.value = ''; input.focus(); }
  (document.getElementById('unlock-modal') as HTMLElement).classList.add('open');
}


// Compress raw Uint8Array (for encrypted binary blobs)
async function _compressBytes(bytes: Uint8Array) {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes as any);
  writer.close();
  const chunks = [];
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

async function _decompressBytes(bytes: Uint8Array) {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes as any);
  writer.close();
  const chunks = [];
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


window.loadFromGistUrl = loadFromGistUrl;
window.publishToGist = publishToGist;
window.loadFromHash = loadFromHash;