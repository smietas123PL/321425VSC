// js/features/share-loader.js

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
// moved to js/features/playground.js

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
window.loadFromGistUrl = loadFromGistUrl;
window.publishToGist = publishToGist;
window.loadFromHash = loadFromHash;