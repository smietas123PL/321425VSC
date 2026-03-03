// ─── FEATURES/SHARE.TS ───────────────────────────────────
// Fixed: TS2339 .value on HTMLElement → cast to HTMLInputElement,
//        .disabled on HTMLElement → cast to HTMLButtonElement,
//        TS2339 .message on {} → err as Error

(function () {
  let shareUrl = '';
  let shareMode = 'open';

  async function generateShareUrl(): Promise<void> {
    // TS2339 fix: cast to HTMLInputElement for .value
    const password = (document.getElementById('share-password-input') as HTMLInputElement)?.value?.trim() || '';
    const usePassword = shareMode === 'password' && password.length > 0;

    const payload = {
      v: 3,
      topic: currentTopic,
      level: currentLevel,
      lang,
      agents: generatedAgents,
      files: generatedFiles,
      ts: Date.now(),
      pw: usePassword,
    };

    try {
      const jsonStr = JSON.stringify(payload);
      let encoded: string;

      if (usePassword) {
        const encrypted = await aesGcmEncrypt(jsonStr, password);
        // M-11: Use chunked btoa to avoid call stack overflow on large Uint8Arrays
        // btoa(String.fromCharCode(...largeArray)) throws RangeError when array > ~125k bytes
        const CHUNK = 8192;
        let binary = '';
        for (let i = 0; i < encrypted.length; i += CHUNK) {
          binary += String.fromCharCode(...encrypted.slice(i, i + CHUNK));
        }
        encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      } else {
        encoded = btoa(unescape(encodeURIComponent(jsonStr)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      const base = window.location.href.split('#')[0];
      shareUrl = `${base}#share=${encoded}`;

      // Check URL length (L-07: removed dead SHARE_LIMITS check — define the limit inline)
      const MAX_SHARE_CHARS = 250_000; // ~250KB URL limit
      if (shareUrl.length > MAX_SHARE_CHARS) {
        throw new Error(tr('Share payload too large for URL.', 'Payload udostepniania jest zbyt duzy dla URL.'));
      }

      const displayEl = document.getElementById('share-url-display') as HTMLInputElement | null;
      if (displayEl) displayEl.value = shareUrl;

      const kb = (shareUrl.length / 1024).toFixed(1);
      const sizeEl = document.getElementById('share-size-label') as HTMLElement | null;
      if (sizeEl) {
        sizeEl.textContent = `${kb} KB`;
        sizeEl.className = parseFloat(kb) > 100 ? 'share-size-warn' : '';
      }

      const agentEl = document.getElementById('share-agent-count') as HTMLElement | null;
      if (agentEl) agentEl.textContent = `${generatedAgents.length} ${tr('agents', 'agentow')}`;
      const verEl = document.getElementById('share-version-label') as HTMLElement | null;
      if (verEl) verEl.textContent = 'v3';

      trackEvent('share_created', {
        success: true,
        hash_kb: Number((shareUrl.length / 1024).toFixed(1)),
        encrypted: usePassword,
      });
    } catch (e: unknown) {
      const displayEl = document.getElementById('share-url-display') as HTMLInputElement | null;
      if (displayEl) displayEl.value = tr('Error generating URL', 'Blad generowania URL');
      // TS2339 fix: cast e to Error for .message
      const msg = e instanceof Error ? e.message : String(e);
      trackEvent('share_created', { success: false, reason: msg.slice(0, 120) });
    }
  }

  function onShareModeChange(): void {
    const val = (document.querySelector('input[name="share-mode"]:checked') as HTMLInputElement)?.value || 'open';
    shareMode = val;

    (document.getElementById('share-opt-open') as HTMLElement).classList.toggle('active', val === 'open');
    (document.getElementById('share-opt-password') as HTMLElement).classList.toggle('active', val === 'password');

    const pwRow = document.getElementById('share-password-row') as HTMLElement | null;
    if (pwRow) pwRow.style.display = val === 'password' ? 'block' : 'none';

    generateShareUrl();
  }

  function openShareModal(): void {
    if (!generatedAgents.length) {
      showNotif(lang === 'en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
      return;
    }
    shareMode = 'open';

    const openOpt = document.querySelector('input[name="share-mode"][value="open"]') as HTMLInputElement | null;
    if (openOpt) openOpt.checked = true;

    (document.getElementById('share-opt-open') as HTMLElement).classList.add('active');
    (document.getElementById('share-opt-password') as HTMLElement).classList.remove('active');
    (document.getElementById('share-password-row') as HTMLElement).style.display = 'none';

    // TS2339 fix: HTMLInputElement for .value
    const pwInput = document.getElementById('share-password-input') as HTMLInputElement | null;
    if (pwInput) pwInput.value = '';

    const copyBtn = document.getElementById('share-copy-btn') as HTMLElement | null;
    if (copyBtn) { copyBtn.textContent = tr('📋 Copy', '📋 Kopiuj'); copyBtn.classList.remove('copied'); }

    const gistResult = document.getElementById('gist-result') as HTMLElement | null;
    if (gistResult) gistResult.style.display = 'none';
    const gistLabel = document.getElementById('gist-publish-label') as HTMLElement | null;
    if (gistLabel) gistLabel.textContent = tr('⬆ Publish Gist', '⬆ Publikuj Gist');

    // TS2339 fix: HTMLButtonElement for .disabled
    const gistBtn = document.getElementById('gist-publish-btn') as HTMLButtonElement | null;
    if (gistBtn) gistBtn.disabled = false;

    (document.getElementById('share-modal') as HTMLElement).classList.add('open');
    generateShareUrl();
  }

  function closeShareModal(): void {
    (document.getElementById('share-modal') as HTMLElement).classList.remove('open');
  }

  async function copyShareUrl(): Promise<void> {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      const btn = document.getElementById('share-copy-btn') as HTMLElement | null;
      if (btn) {
        btn.textContent = tr('✓ Copied!', '✓ Skopiowano!');
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = tr('📋 Copy', '📋 Kopiuj');
          btn.classList.remove('copied');
        }, 1500);
      }
      showNotif(lang === 'en' ? '✓ Share link copied!' : '✓ Link skopiowany!');
    } catch {
      showNotif(lang === 'en' ? '⚠ Copy failed' : '⚠ Kopiowanie nieudane', true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shareModal = document.getElementById('share-modal') as HTMLElement | null;
    if (shareModal) {
      shareModal.addEventListener('click', function (e) {
        if (e.target === this) closeShareModal();
      });
    }
  });

  window.generateShareUrl = generateShareUrl;
  window.onShareModeChange = onShareModeChange;
  window.openShareModal = openShareModal;
  window.closeShareModal = closeShareModal;
  window.copyShareUrl = copyShareUrl;
})();

// ─── AES-GCM encryption helper (declared in globals) ─────
// aesGcmEncrypt / aesGcmDecrypt are declared in share-loader.ts
declare function aesGcmEncrypt(plaintext: string, password: string): Promise<Uint8Array>;
