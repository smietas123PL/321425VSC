(function () {
  let shareUrl = '';
  let shareMode = 'open';

  async function generateShareUrl() {
    const password = document.getElementById('share-password-input')?.value?.trim() || '';
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

      let encoded;
      if (usePassword) {
        const encrypted = await aesGcmEncrypt(jsonStr, password);
        encoded = btoa(String.fromCharCode(...encrypted)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
      } else {
        encoded = btoa(unescape(encodeURIComponent(jsonStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
      }

      const base = window.location.href.split('#')[0];
      shareUrl = `${base}#share=${encoded}`;

      if (shareUrl.length > SHARE_LIMITS.maxHashChars) {
        throw new Error(tr('Share payload too large for URL.', 'Payload udostepniania jest zbyt duzy dla URL.'));
      }

      const displayEl = document.getElementById('share-url-display');
      if (displayEl) displayEl.value = shareUrl;

      const kb = (shareUrl.length / 1024).toFixed(1);
      const sizeEl = document.getElementById('share-size-label');
      if (sizeEl) {
        sizeEl.textContent = `${kb} KB`;
        sizeEl.className = parseFloat(kb) > 100 ? 'share-size-warn' : '';
      }

      const agentEl = document.getElementById('share-agent-count');
      if (agentEl) agentEl.textContent = `${generatedAgents.length} ${tr('agents', 'agentow')}`;
      const verEl = document.getElementById('share-version-label');
      if (verEl) verEl.textContent = 'v3';

      trackEvent('share_created', {
        success: true,
        hash_kb: Number((shareUrl.length / 1024).toFixed(1)),
        encrypted: usePassword,
      });
    } catch (e) {
      const displayEl = document.getElementById('share-url-display');
      if (displayEl) displayEl.value = tr('Error generating URL', 'Blad generowania URL');
      trackEvent('share_created', {
        success: false,
        reason: String(e?.message || 'share_error').slice(0, 120),
      });
    }
  }

  function onShareModeChange() {
    const val = document.querySelector('input[name="share-mode"]:checked')?.value || 'open';
    shareMode = val;

    document.getElementById('share-opt-open').classList.toggle('active', val === 'open');
    document.getElementById('share-opt-password').classList.toggle('active', val === 'password');

    const pwRow = document.getElementById('share-password-row');
    if (pwRow) pwRow.style.display = val === 'password' ? 'block' : 'none';

    generateShareUrl();
  }

  function openShareModal() {
    if (!generatedAgents.length) {
      showNotif(lang==='en' ? '⚠ Generate a team first' : '⚠ Najpierw wygeneruj zespół', true);
      return;
    }
    shareMode = 'open';

    const openOpt = document.querySelector('input[name="share-mode"][value="open"]');
    if (openOpt) openOpt.checked = true;
    document.getElementById('share-opt-open').classList.add('active');
    document.getElementById('share-opt-password').classList.remove('active');
    document.getElementById('share-password-row').style.display = 'none';
    const pwInput = document.getElementById('share-password-input');
    if (pwInput) pwInput.value = '';

    const copyBtn = document.getElementById('share-copy-btn');
    if (copyBtn) { copyBtn.textContent = tr('📋 Copy', '📋 Kopiuj'); copyBtn.classList.remove('copied'); }

    const gistResult = document.getElementById('gist-result');
    if (gistResult) gistResult.style.display = 'none';
    const gistLabel = document.getElementById('gist-publish-label');
    if (gistLabel) gistLabel.textContent = tr('⬆ Publish Gist', '⬆ Publikuj Gist');
    const gistBtn = document.getElementById('gist-publish-btn');
    if (gistBtn) gistBtn.disabled = false;

    document.getElementById('share-modal').classList.add('open');
    generateShareUrl();
  }

  function closeShareModal() {
    document.getElementById('share-modal').classList.remove('open');
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      const btn = document.getElementById('share-copy-btn');
      if (btn) {
        btn.textContent = tr('✓ Copied!', '✓ Skopiowano!');
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = tr('📋 Copy', '📋 Kopiuj');
          btn.classList.remove('copied');
        }, 1500);
      }
      showNotif(lang==='en' ? '✓ Share link copied!' : '✓ Link skopiowany!');
    } catch {
      showNotif(lang==='en' ? '⚠ Copy failed' : '⚠ Kopiowanie nieudane', true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shareModal = document.getElementById('share-modal');
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

