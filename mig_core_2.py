import os
import pathlib

# --- api-client.js ---> api-client.ts ---
api_ts = """
interface AgentSparkWindow extends Window {
    __AGENTSPARK_CONFIG__?: { BACKEND_API_BASE?: string };
    enqueueSyncAction?: (action: any) => Promise<any>;
    AGENTSPARK_API_BASE?: string;
    agentsparkApiFetch?: (path: string, options?: any) => Promise<any>;
    agentsparkGenerateRequest?: (payload: any) => Promise<any>;
}
declare let window: AgentSparkWindow;

const API_BASE = String(window.__AGENTSPARK_CONFIG__?.BACKEND_API_BASE || '/api/v1').replace(/\/+$/, '');

export async function apiFetch(path: string, options: any = {}): Promise<any> {
    const {
        method = 'GET',
        headers = {},
        body,
        token = '',
    } = options;

    const finalHeaders: any = { 'Content-Type': 'application/json', ...headers };
    if (token) finalHeaders.Authorization = `Bearer ${token}`;

    const isMutatingProject = path.includes('/projects') && ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase());

    if (!navigator.onLine && isMutatingProject) {
        if (window.enqueueSyncAction) {
            await window.enqueueSyncAction({ path, method, body, timestamp: Date.now() });
            console.log('[Offline] Action queued:', method, path);
            return { success: true, queued: true };
        }
    }

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: finalHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err: any = new Error(data.error || data.message || `HTTP ${response.status}`);
        err.status = response.status;
        err.payload = data;
        throw err;
    }
    return data;
}

export async function generate(payload: any): Promise<any> {
    return apiFetch('/generate', { method: 'POST', body: payload });
}

window.AGENTSPARK_API_BASE = API_BASE;
window.agentsparkApiFetch = apiFetch;
window.agentsparkGenerateRequest = generate;
"""
pathlib.Path(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\core\api-client.ts').write_text(api_ts, encoding='utf-8')


# --- generation-client.js ---> generation-client.ts ---
gen_ts = """
declare let t: any;
declare let lang: any;
declare let apiKey: any;
declare let selectedModel: any;
declare let currentTopic: any;
declare let currentLevel: any;
declare let traceSpans: any[];
declare let traceSessionStart: any;
declare let renderTraceLive: any;
declare let showNotif: any;

interface AgentSparkWindow extends Window {
    callGemini: any;
    _formatCost: any;
    agentsparkGenerateRequest?: (payload: any) => Promise<any>;
}
declare let window: AgentSparkWindow;

const MODEL_COST_PER_1M: Record<string, number> = {
    'gemini-2.5-flash-preview-05-20': 0.30,
    'gemini-2.5-pro-preview-06-05': 3.50,
    'gemini-2.0-flash': 0.30,
    'gemini-2.0-flash-exp': 0.00,
    'gemini-1.5-flash': 0.15,
    'gemini-1.5-pro': 3.50,
    'gpt-4o': 7.50,
    'gpt-4o-mini': 0.30,
    'gpt-4-turbo': 15.00,
    'claude-sonnet-4-6': 4.50,
    'claude-opus-4-6': 22.50,
    'claude-opus-4-5': 22.50,
    'claude-sonnet-4-5': 4.50,
    'claude-haiku-4-5-20251001': 0.40,
    'mistral-large-latest': 3.00,
    'ministral-14b-latest': 0.40,
    'ministral-8b-latest': 0.10,
    'ministral-3b-latest': 0.04,
    'mistral-small-latest': 0.30,
    'open-mistral-nemo': 0.15,
    'llama-3.3-70b-versatile': 0.00,
    'llama-3.1-8b-instant': 0.00,
    'gemma2-9b-it': 0.00,
};

const FALLBACK_CHAINS: Record<string, any[]> = {
    gemini: [
        { provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20', tag: 'gemini', label: 'Gemini 2.5 Flash' },
        { provider: 'gemini', model: 'gemini-2.0-flash', tag: 'gemini', label: 'Gemini 2.0 Flash' },
        { provider: 'gemini', model: 'gemini-1.5-flash', tag: 'gemini', label: 'Gemini 1.5 Flash' },
    ],
    openai: [
        { provider: 'openai', model: 'gpt-4o', tag: 'openai', label: 'GPT-4o' },
        { provider: 'openai', model: 'gpt-4o-mini', tag: 'openai', label: 'GPT-4o mini' },
        { provider: 'openai', model: 'gpt-4-turbo', tag: 'openai', label: 'GPT-4 Turbo' },
    ],
    anthropic: [
        { provider: 'anthropic', model: 'claude-sonnet-4-6', tag: 'anthropic', label: 'Claude Sonnet 4.6' },
        { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', tag: 'anthropic', label: 'Claude Haiku 4.5' },
    ],
    mistral: [
        { provider: 'openai', model: 'mistral-large-latest', tag: 'mistral', label: 'Mistral Large' },
        { provider: 'openai', model: 'mistral-small-latest', tag: 'mistral', label: 'Mistral Small' },
        { provider: 'openai', model: 'open-mistral-nemo', tag: 'mistral', label: 'Mistral Nemo' },
    ],
    groq: [
        { provider: 'openai', model: 'llama-3.3-70b-versatile', tag: 'groq', label: 'Llama 3.3 70B' },
        { provider: 'openai', model: 'llama-3.1-8b-instant', tag: 'groq', label: 'Llama 3.1 8B' },
        { provider: 'openai', model: 'gemma2-9b-it', tag: 'groq', label: 'Gemma2 9B' },
    ],
};

function estimateCost(model: string, tokens: number): number | null {
    if (!tokens || tokens <= 0) return null;
    const rate = MODEL_COST_PER_1M[model];
    if (rate === undefined) return null;
    return (tokens / 1_000_000) * rate;
}

function formatCost(usd: number | null | undefined): string | null {
    if (usd === null || usd === undefined) return null;
    if (usd === 0) return '$0.00';
    if (usd < 0.000001) return '<$0.000001';
    if (usd < 0.01) return `$${usd.toFixed(5)}`;
    return `$${usd.toFixed(4)}`;
}

function isFallbackable(status: number, message: string): boolean {
    if ([429, 500, 502, 503, 504, 529].includes(status)) return true;
    const msg = String(message || '').toLowerCase();
    return msg.includes('rate limit') || msg.includes('overloaded') ||
        msg.includes('capacity') || msg.includes('timeout') ||
        msg.includes('quota') || msg.includes('unavailable');
}

function setTypingStatus(text: string) {
    const el = document.getElementById('typing-indicator');
    if (!el) return;
    let label = el.querySelector('.typing-status-label');
    if (!label) {
        label = document.createElement('div');
        label.className = 'typing-status-label';
        label.style.cssText = 'font-size:0.68rem;font-family:"Space Mono",monospace;color:var(--muted);margin-top:0.4rem;';
        el.appendChild(label);
    }
    label.textContent = text;
}

async function callSingleModel(modelDef: any, key: string, systemInstruction: string, userMessage: string, traceLabel: string, multiTurnMessages: any[]) {
    const provider = modelDef.provider;
    const model = modelDef.model;
    const t0 = Date.now();

    const span: any = {
        id: traceSpans.length,
        label: traceLabel || 'API Call',
        model: modelDef.label || model,
        provider,
        startMs: t0,
        endMs: null,
        durationMs: null,
        status: 'pending',
        isFallback: false,
        tokens: null,
        error: null,
    };
    if (!traceSessionStart) traceSessionStart = t0;
    traceSpans.push(span);
    renderTraceLive();

    const finalize = (status: string, tokens: number | null, error: string | null) => {
        span.endMs = Date.now();
        span.durationMs = span.endMs - span.startMs;
        span.status = status;
        span.tokens = tokens || null;
        span.cost = tokens ? estimateCost(modelDef.model, tokens) : null;
        span.error = error || null;
        renderTraceLive();
    };

    try {
        if (typeof window.agentsparkGenerateRequest !== 'function') {
            throw new Error('API client not initialized');
        }

        const levelData = typeof t === 'function' ? t('levels').find((l: any) => l.id === currentLevel) : null;
        const agentCount = parseInt((levelData?.agentCount || '3').toString().split('-')[0], 10) || 3;

        const data = await window.agentsparkGenerateRequest({
            topic: currentTopic,
            level: currentLevel,
            agentCount,
            modelProvider: provider,
            modelTag: modelDef.tag || provider,
            modelId: model,
            systemInstruction,
            userMessage,
            multiTurnMessages: Array.isArray(multiTurnMessages) ? multiTurnMessages : null,
            clientApiKey: key || null,
        });

        const tokens = data.usage?.totalTokens || null;
        const result = data.text || '';
        finalize('ok', tokens, null);
        return result;
    } catch (err: any) {
        if (span.status === 'pending') finalize('error', null, err.message);
        throw err;
    }
}

export async function callGemini(systemInstruction: string, userMessage: string, traceLabel: string, multiTurnMessages: any[]) {
    const keyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
    const key = apiKey || keyInput?.value?.trim() || '';
    const chain = FALLBACK_CHAINS[selectedModel.tag] || [];
    const primary = { ...selectedModel };
    const rest = chain.filter((m: any) => m.model !== primary.model);
    const attempts = [primary, ...rest];

    let lastError: any = null;
    for (let i = 0; i < attempts.length; i++) {
        const attemptModel = attempts[i];
        const spanLabel = traceLabel
            ? (i > 0 ? `${traceLabel} (fallback)` : traceLabel)
            : (i > 0 ? `Fallback #${i}` : 'API Call');

        if (i > 0) {
            setTypingStatus(`⚠ ${attempts[i - 1].label || attempts[i - 1].model} failed — trying ${attemptModel.label || attemptModel.model}…`);
            await new Promise((r) => setTimeout(r, 600));
        }

        try {
            const result = await callSingleModel(attemptModel, key, systemInstruction, userMessage, spanLabel, multiTurnMessages);
            if (i > 0) {
                const span = traceSpans[traceSpans.length - 1];
                if (span) { span.status = 'fallback'; span.isFallback = true; }
                renderTraceLive();
                const modelName = attemptModel.label || attemptModel.model;
                setTimeout(() => showNotif(
                    lang === 'en' ? `↩ Fell back to ${modelName}` : `↩ Przełączono na ${modelName}`
                ), 300);
                const badgeEl = document.getElementById('headerModelBadge');
                if (badgeEl) badgeEl.textContent = attemptModel.model + ' (fallback)';
            }
            setTypingStatus('');
            return result;
        } catch (err: any) {
            lastError = err;
            if (!isFallbackable(err.status, err.message)) {
                console.warn(`[AgentSpark] Non-fallbackable error on ${attemptModel.model}:`, err.message);
                break;
            }
            console.warn(`[AgentSpark] Fallback triggered (${attemptModel.model}): ${err.message}`);
        }
    }

    setTypingStatus('');
    throw lastError || new Error('All models failed');
}

window.callGemini = callGemini;
window._formatCost = formatCost;
"""
pathlib.Path(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\core\generation-client.ts').write_text(gen_ts, encoding='utf-8')

# --- pwa.js ---> pwa.ts ---
# For pwa.js we can simply wrap it just like it is since it doesn't need much typing but is fine to be .ts
pwa_ts = """
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
const manifestLink = document.getElementById('pwa-manifest') as HTMLLinkElement;
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

const offlineBar = document.getElementById('offline-bar');

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
    if (document.getElementById('pwa-install-banner')) return;
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
    const b = document.getElementById('pwa-install-banner');
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
    if (document.getElementById('pwa-update-toast')) return;
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
    document.getElementById('pwa-update-toast')?.remove();
    if (newWorker) newWorker.postMessage('skipWaiting');
    else if (swRegistration?.waiting) swRegistration.waiting.postMessage('skipWaiting');
};

const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
const metaTC: any = document.getElementById('meta-theme-color');
if (metaTC) metaTC.content = isDark ? '#1a170d' : '#faf7ee';

export {};
"""
pathlib.Path(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\core\pwa.ts').write_text(pwa_ts, encoding='utf-8')

# Delete original js files
for name in ['api-client.js', 'generation-client.js', 'pwa.js']:
    f = os.path.join(r'c:\Users\User\Downloads\AgentSpark\321425VSC\js\core', name)
    if os.path.exists(f): os.remove(f)

print("Migrated core to Typescript")
