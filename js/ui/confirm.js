(function () {
  let resolveCb = null;
  let rejectCb = null;

  function closeConfirmModal() {
    document.getElementById('confirm-modal')?.classList.remove('open');
  }

  function confirmReject() {
    closeConfirmModal();
    if (rejectCb) rejectCb(false);
    resolveCb = null;
    rejectCb = null;
  }

  function confirmResolve() {
    closeConfirmModal();
    if (resolveCb) resolveCb(true);
    resolveCb = null;
    rejectCb = null;
  }

  function uiConfirm(messageEn, messagePl, titleEn = 'Confirm', titlePl = 'Potwierdzenie') {
    const currentLang = document.getElementById('btn-pl')?.classList.contains('active') ? 'pl' : 'en';
    const msg = currentLang === 'en' ? messageEn : messagePl;
    const title = currentLang === 'en' ? titleEn : titlePl;
    const modal = document.getElementById('confirm-modal');

    if (!modal) {
      return Promise.resolve(window.confirm(msg));
    }

    return new Promise((resolve) => {
      resolveCb = resolve;
      rejectCb = resolve;

      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const cancelBtn = document.getElementById('confirm-modal-cancel');
      const okBtn = document.getElementById('confirm-modal-ok');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = msg;
      if (cancelBtn) cancelBtn.textContent = currentLang === 'en' ? 'Cancel' : 'Anuluj';
      if (okBtn) okBtn.textContent = 'OK';

      modal.classList.add('open');
      setTimeout(() => okBtn?.focus(), 50);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) confirmReject();
    });
  });

  window.closeConfirmModal = closeConfirmModal;
  window._confirmReject = confirmReject;
  window._confirmResolve = confirmResolve;
  window.uiConfirm = uiConfirm;
})();
