
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
    (document.getElementById('confirm-modal') as HTMLElement)?.classList.remove('open');
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
    const currentLang = (document.getElementById('btn-pl') as HTMLElement)?.classList.contains('active') ? 'pl' : 'en';
    const msg = currentLang === 'en' ? messageEn : messagePl;
    const title = currentLang === 'en' ? titleEn : titlePl;
    const modal = (document.getElementById('confirm-modal') as HTMLElement);

    if (!modal) {
        return Promise.resolve(window.confirm(msg));
    }

    return new Promise((resolve) => {
        resolveCb = resolve;
        rejectCb = resolve;

        const titleEl = (document.getElementById('confirm-modal-title') as HTMLElement);
        const msgEl = (document.getElementById('confirm-modal-message') as HTMLElement);
        const cancelBtn = (document.getElementById('confirm-modal-cancel') as HTMLElement);
        const okBtn = (document.getElementById('confirm-modal-ok') as HTMLElement);

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = msg;
        if (cancelBtn) cancelBtn.textContent = currentLang === 'en' ? 'Cancel' : 'Anuluj';
        if (okBtn) okBtn.textContent = 'OK';

        modal.classList.add('open');
        setTimeout(() => okBtn?.focus(), 50);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = (document.getElementById('confirm-modal') as HTMLElement);
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) confirmReject();
    });
});

window.closeConfirmModal = closeConfirmModal;
window._confirmReject = confirmReject;
window._confirmResolve = confirmResolve;
window.uiConfirm = uiConfirm;
