
// js/ui/error-modal.ts
interface AgentSparkWindow extends Window {
    appAlert: (message: string, title?: string) => void;
    closeErrorModal: () => void;
}
declare let window: AgentSparkWindow;

export function showErrorModal(message: string, title = 'Error') {
    let modal = (document.getElementById('global-error-modal') as HTMLElement);
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

    const titleEl = (document.getElementById('global-error-title') as HTMLElement);
    const msgEl = (document.getElementById('global-error-message') as HTMLElement);
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    modal.classList.add('open');
}

export function closeErrorModal() {
    const modal = (document.getElementById('global-error-modal') as HTMLElement);
    if (modal) {
        modal.classList.remove('open');
    }
}

window.appAlert = showErrorModal;
window.closeErrorModal = closeErrorModal;
