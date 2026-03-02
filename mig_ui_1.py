import os
import pathlib

# error-modal
error_modal = """
// js/ui/error-modal.ts
interface AgentSparkWindow extends Window {
    appAlert: (message: string, title?: string) => void;
    closeErrorModal: () => void;
}
declare let window: AgentSparkWindow;

export function showErrorModal(message: string, title = 'Error') {
    let modal = document.getElementById('global-error-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-error-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-header" style="border-bottom: 1px solid var(--border);">
          <div class="modal-title" id="global-error-title" style="color: var(--accent2);"></div>
          <button class="modal-close" onclick="closeErrorModal()" aria-label="Close error modal">✕</button>
        </div>
        <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1.5rem;">
          <p id="global-error-message" style="font-size:0.95rem;color:var(--text);line-height:1.5;"></p>
          <button class="btn-primary" onclick="closeErrorModal()" style="align-self: flex-end;">OK</button>
        </div>
      </div>
    `;
        document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('global-error-title');
    const msgEl = document.getElementById('global-error-message');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    modal.classList.add('open');
}

export function closeErrorModal() {
    const modal = document.getElementById('global-error-modal');
    if (modal) {
        modal.classList.remove('open');
    }
}

window.appAlert = showErrorModal;
window.closeErrorModal = closeErrorModal;
"""
pathlib.Path(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\ui\error-modal.ts').write_text(error_modal, encoding='utf-8')

# loader 
loader = """
// js/ui/loader.ts
interface AgentSparkWindow extends Window {
    showLoader: (message?: string, overlay?: boolean) => void;
    hideLoader: () => void;
}
declare let window: AgentSparkWindow;

export function showGlobalLoader(message = 'Processing...', overlay = true) {
    let loader = document.getElementById('global-spinner-modal');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-spinner-modal';
        loader.className = 'modal-overlay';
        loader.style.zIndex = '9999';
        loader.innerHTML = `
      <div class="modal" style="background:transparent;box-shadow:none;border:none;display:flex;flex-direction:column;align-items:center;gap:1.5rem;">
        <div class="spinner global-spinner"></div>
        <div id="global-loader-message" style="color:var(--text);font-weight:700;letter-spacing:0.05em;background:var(--surface);padding:0.5rem 1rem;border-radius:2rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
      </div>
      <style>
        .global-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(242, 185, 13, 0.2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      </style>
    `;
        document.body.appendChild(loader);
    }

    const msgEl = document.getElementById('global-loader-message');
    if (msgEl) msgEl.textContent = message;

    if (!overlay) {
        loader.style.backgroundColor = 'transparent';
        loader.style.pointerEvents = 'none';
    } else {
        loader.style.backgroundColor = '';
        loader.style.pointerEvents = 'auto';
    }

    loader.classList.add('open');
}

export function hideGlobalLoader() {
    const loader = document.getElementById('global-spinner-modal');
    if (loader) {
        loader.classList.remove('open');
    }
}

window.showLoader = showGlobalLoader;
window.hideLoader = hideGlobalLoader;
"""
pathlib.Path(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\ui\loader.ts').write_text(loader, encoding='utf-8')

# confirm
confirm = """
interface AgentSparkWindow extends Window {
    closeConfirmModal: () => void;
    _confirmReject: () => void;
    _confirmResolve: () => void;
    uiConfirm: (messageEn: string, messagePl: string, titleEn?: string, titlePl?: string) => Promise<boolean>;
}
declare let window: AgentSparkWindow;

let resolveCb: any = null;
let rejectCb: any = null;

export function closeConfirmModal() {
    document.getElementById('confirm-modal')?.classList.remove('open');
}

export function confirmReject() {
    closeConfirmModal();
    if (rejectCb) rejectCb(false);
    resolveCb = null;
    rejectCb = null;
}

export function confirmResolve() {
    closeConfirmModal();
    if (resolveCb) resolveCb(true);
    resolveCb = null;
    rejectCb = null;
}

export function uiConfirm(messageEn: string, messagePl: string, titleEn = 'Confirm', titlePl = 'Potwierdzenie'): Promise<boolean> {
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
"""
pathlib.Path(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\ui\confirm.ts').write_text(confirm, encoding='utf-8')

for name in ['error-modal.js', 'loader.js', 'confirm.js']:
    f = os.path.join(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\ui', name)
    if os.path.exists(f): os.remove(f)

print("Migrated 3 UI files.")
