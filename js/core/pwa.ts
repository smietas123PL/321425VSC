
declare let showNotif: any;
declare let tr: any;

interface AgentSparkWindow extends Window {
    _pwaInstall: () => Promise<void>;
    _pwaDismiss: () => void;
    _pwaUpdate: () => void;
}
declare let window: AgentSparkWindow;

const manifest = {
    name: 'AgentSpark',
    short_name: 'AgentSpark',
    description: 'Build your AI agent team in minutes',
    start_url: './',
    display: 'standalone',
    background_color: '#1a170d',
    theme_color: '#1a170d',
    orientation: 'any',
    categories: ['productivity', 'developer', 'utilities'],
    icons: [
        {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='40' fill='%231a170d'/%3E%3Crect width='192' height='192' rx='40' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='192' y2='192' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23f2b90d' stop-opacity='.3'/%3E%3Cstop offset='1' stop-color='%23c49a0a' stop-opacity='.3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ctext x='96' y='128' font-size='96' text-anchor='middle' fill='%23f2b90d'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E",
            sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable'
        },
        {
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='100' fill='%231a170d'/%3E%3Crect width='512' height='512' rx='100' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='512' y2='512' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23f2b90d' stop-opacity='.3'/%3E%3Cstop offset='1' stop-color='%23c49a0a' stop-opacity='.3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ctext x='256' y='340' font-size='256' text-anchor='middle' fill='%23f2b90d'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E",
            sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable'
        }
    ],
    shortcuts: [
        {
            name: 'New Team',
            short_name: 'New',
            description: 'Start building a new AI agent team',
            url: './',
            icons: [{ src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Ctext y='80' font-size='80'%3E%E2%9A%A1%3C/text%3E%3C/svg%3E", sizes: '96x96' }]
        }
    ]
};

const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
const manifestURL = URL.createObjectURL(manifestBlob);
const manifestLink = (document.getElementById('pwa-manifest') as HTMLElement) as HTMLLinkElement;
if (manifestLink) manifestLink.href = manifestURL;

const CACHE_NAME = 'agentspark-v1';

const swCode = `
const CACHE = '${CACHE_NAME}';
const FONTS = [
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;600;800&display=swap',
  'https://fonts.gstatic.com'
];

self.addEventListener('install', (e: any) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return c.addAll(['./']).catch(() => {});
    })
  );
});

self.addEventListener('activate', (e: any) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => (self as any).clients.claim())
  );
});

self.addEventListener('fetch', (e: any) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if(url.hostname.includes('googleapis.com') ||
     url.hostname.includes('openai.com') ||
     url.hostname.includes('anthropic.com') ||
     url.hostname.includes('mistral.ai') ||
     url.hostname.includes('groq.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  if(url.hostname.includes('fonts.g') || e.request.destination === 'font') {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if(res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached || new Response('Offline', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));
        return cached || fetchPromise;
      })
    )
  );
});

self.addEventListener('message', (e: any) => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
`;

let swRegistration: any = null;
let newWorker: any = null;

if ('serviceWorker' in navigator) {
    const swBlob = new Blob([swCode], { type: 'text/javascript' });
    const swURL = URL.createObjectURL(swBlob);

    navigator.serviceWorker.register(swURL)
        .then(reg => {
            swRegistration = reg;
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateToast();
                    }
                });
            });
            window.addEventListener('focus', () => reg.update());
        })
        .catch(err => console.warn('[AgentSpark SW]', err));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

const offlineBar = (document.getElementById('offline-bar') as HTMLElement);

function updateOnlineStatus() {
    if (!offlineBar) return;
    const isOffline = !navigator.onLine;
    if (isOffline) {
        offlineBar.classList.add('visible');
        setTimeout(() => offlineBar.classList.remove('visible'), 4000);
    } else {
        offlineBar.classList.remove('visible');
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

let deferredPrompt: any = null;
const DISMISSED_KEY = 'agentspark-pwa-dismissed';

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 86400000) return;
    setTimeout(showInstallBanner, 3000);
});

window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    if (typeof showNotif === 'function') {
        showNotif(tr('✓ AgentSpark installed!', '✓ AgentSpark zainstalowany!'));
    }
    deferredPrompt = null;
});

function showInstallBanner() {
    if ((document.getElementById('pwa-install-banner') as HTMLElement)) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-install-icon">⚡</div>
      <div class="pwa-install-text">
        <div class="pwa-install-title">${tr('Install AgentSpark', 'Zainstaluj AgentSpark')}</div>
        <div class="pwa-install-sub">${tr('Add to home screen — works offline', 'Dodaj do ekranu glownego — dziala offline')}</div>
      </div>
      <div class="pwa-install-actions">
        <button class="pwa-install-btn" onclick="window._pwaInstall()">${tr('Install', 'Instaluj')}</button>
        <button class="pwa-dismiss-btn" onclick="window._pwaDismiss()">✕</button>
      </div>
    `;
    document.body.appendChild(banner);
}

function hideInstallBanner() {
    const b = (document.getElementById('pwa-install-banner') as HTMLElement);
    if (b) {
        b.style.animation = 'none';
        b.style.opacity = '0';
        b.style.transform = 'translateY(20px)';
        b.style.transition = 'all 0.3s ease';
        setTimeout(() => b.remove(), 300);
    }
}

window._pwaInstall = async () => {
    if (!deferredPrompt) return;
    hideInstallBanner();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'dismissed') {
        localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    }
};

window._pwaDismiss = () => {
    hideInstallBanner();
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
};

function showUpdateToast() {
    if ((document.getElementById('pwa-update-toast') as HTMLElement)) return;
    const toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.className = 'pwa-update-toast pwa-bottom-sheet';
    toast.innerHTML = `
      <span>🔄 ${tr('New version available', 'Dostepna nowa wersja')}</span>
      <button class="pwa-update-btn" onclick="window._pwaUpdate()">${tr('Update', 'Aktualizuj')}</button>
      <button class="pwa-dismiss-btn" onclick="this.parentElement.remove()" style="font-size:0.7rem;padding:0.25rem 0.5rem;">✕</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 15000);
}

window._pwaUpdate = () => {
    (document.getElementById('pwa-update-toast') as HTMLElement)?.remove();
    if (newWorker) newWorker.postMessage('skipWaiting');
    else if (swRegistration?.waiting) swRegistration.waiting.postMessage('skipWaiting');
};

const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
const metaTC: any = (document.getElementById('meta-theme-color') as HTMLElement);
if (metaTC) metaTC.content = isDark ? '#1a170d' : '#faf7ee';

export {};
