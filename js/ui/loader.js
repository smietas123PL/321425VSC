// js/ui/loader.js
function showGlobalLoader(message = 'Processing...', overlay = true) {
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
    msgEl.textContent = message;

    if (!overlay) {
        loader.style.backgroundColor = 'transparent';
        loader.style.pointerEvents = 'none';
    } else {
        loader.style.backgroundColor = '';
        loader.style.pointerEvents = 'auto';
    }

    loader.classList.add('open');
}

function hideGlobalLoader() {
    const loader = document.getElementById('global-spinner-modal');
    if (loader) {
        loader.classList.remove('open');
    }
}

// Attach globally
window.showLoader = showGlobalLoader;
window.hideLoader = hideGlobalLoader;
