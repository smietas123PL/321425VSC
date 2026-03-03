import { state } from './core/state';
// ─── AUTH.TS — AgentSpark backend auth + RevenueCat ──────
// Fixed: TS7006 implicit any params, TS18046 unknown catch, TS18047 null,
//        TS2698 spread of unknown, TS2339 property on {}

// ─── REVENUECAT ───────────────────────────────────────────
const RC_API_KEY = window.__AGENTSPARK_CONFIG__?.REVENUECAT_API_KEY || null;
const RC_ENTITLEMENT = 'pro_access';
const AUTH_TOKEN_KEY = 'agentspark-auth-token';
const REFRESH_TOKEN_KEY = 'agentspark-refresh-token';
const DEVICE_EMAIL_KEY = 'agentspark-device-email';

const toMillis = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
};

// ─── RevenueCat helpers ───────────────────────────────────
async function initRevenueCat(): Promise<void> {
  if (!RC_API_KEY) {
    console.info('RevenueCat key not configured; subscription checks disabled');
    return;
  }
  const Purchases = _rcSdk();
  if (!Purchases) {
    // M-08: RC SDK may not be loaded in all environments — fail gracefully
    console.warn('RevenueCat SDK not loaded or not initialized');
    return;
  }
  try {
    await Purchases.configure({ apiKey: RC_API_KEY });
    if (state.currentUser) {
      await checkProStatus(state.currentUser.uid);
    }
  } catch (e) {
    console.error('RC Init Error:', e);
  }
}

// M-08: RevenueCat Web SDK loads as window.Purchases (UMD global namespace).
// The pattern `const { Purchases } = window.Purchases` is RC Web SDK convention:
//   window.Purchases = { Purchases: <SDK class> }
// Safe accessor to avoid TS errors and avoid crash when SDK not loaded.
function _rcSdk(): any | null {
  if (!window.Purchases || typeof (window.Purchases as any).Purchases?.configure !== 'function') {
    return null;
  }
  return (window.Purchases as any).Purchases;
}

async function _checkRevenueCatProStatus(uid: string): Promise<void> {
  if (!uid) return;
  const Purchases = _rcSdk();
  if (!Purchases) return;
  try {
    // M-08: Use typed RC SDK accessor instead of double-destructure
    const { customerInfo } = await Purchases.logIn({ appUserID: uid });
    const isActive = !!customerInfo?.entitlements?.active?.[RC_ENTITLEMENT];
    state.isPro = isActive;
    updateProUI(isActive);
  } catch (e) {
    console.error('Check Pro Status Failed:', e);
  }
}

function updateProUI(isPro: boolean): void {
  const badge = document.getElementById('pro-badge') as HTMLElement | null;
  if (state.isPro) {
    if (badge) badge.style.display = 'inline-block';
    document.querySelectorAll('.locked-feature').forEach(el => el.classList.remove('locked'));
  } else {
    if (badge) badge.style.display = 'none';
    document.querySelectorAll('.locked-feature').forEach(el => el.classList.add('locked'));
  }
}

function showPaywall(): void {
  const modal = document.getElementById('paywall-modal') as HTMLElement | null;
  if (modal) {
    modal.classList.add('open');
    loadOfferings();
  }
}

async function loadOfferings(): Promise<void> {
  const Purchases = _rcSdk();
  if (!Purchases) return;
  try {
    // M-08: typed SDK access via _rcSdk() helper
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      const pkg = offerings.current.availablePackages[0];
      const product = pkg.product;
      const priceEl = document.getElementById('paywall-price') as HTMLElement | null;
      const btnEl = document.getElementById('paywall-btn') as HTMLElement | null;
      if (priceEl) priceEl.textContent = product.priceString;
      if (btnEl) btnEl.onclick = () => purchasePackage(pkg);
    }
  } catch (e) {
    console.error('Load Offerings Error:', e);
  }
}

async function purchasePackage(pkg: any): Promise<void> {
  const Purchases = _rcSdk();
  if (!Purchases) return;
  try {
    // M-08: typed SDK access via _rcSdk() helper
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    if (customerInfo?.entitlements?.active?.[RC_ENTITLEMENT]) {
      state.isPro = true;
      updateProUI(true);
      closePaywall();
      showNotif(state.lang === 'en' ? '🎉 Welcome to Pro!' : '🎉 Witaj w wersji Pro!');
    }
  } catch (e: any) {
    if (!e.userCancelled) {
      showNotif('Purchase Error: ' + (e?.message || String(e)), true);
    }
  }
}

function closePaywall(): void {
  (document.getElementById('paywall-modal') as HTMLElement).classList.remove('open');
}

// ─── TOKEN HELPERS ────────────────────────────────────────
// H-02: Migrated from localStorage → sessionStorage to limit XSS token theft
// exposure. sessionStorage is cleared when the tab/browser closes.
function getAuthToken(): string {
  return sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
}
function setAuthToken(token: string): void {
  if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  else sessionStorage.removeItem(AUTH_TOKEN_KEY);
}
function getRefreshToken(): string {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) || '';
}
function setRefreshToken(token: string): void {
  if (token) sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  else sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
function getDeviceEmail(): string {
  const existing = localStorage.getItem(DEVICE_EMAIL_KEY);
  if (existing) return existing;
  const id = (crypto?.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  ).replace(/[^a-zA-Z0-9_]/g, '');
  const email = `agentspark_${id.toLowerCase()}@local.agentspark`;
  localStorage.setItem(DEVICE_EMAIL_KEY, email);
  return email;
}

// ─── API FETCH ────────────────────────────────────────────
async function apiFetch(path: string, options: any = {}, requireAuth = true, retryCount = 0): Promise<any> {
  if (typeof window.agentsparkApiFetch !== 'function') {
    throw new Error('API client not initialized');
  }
  const token = requireAuth ? getAuthToken() : '';
  try {
    return await window.agentsparkApiFetch(path, { ...options, token });
  } catch (error: any) {
    if (error.status === 401 && requireAuth && retryCount < 1) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await window.agentsparkApiFetch('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.token) {
            setAuthToken(refreshRes.token);
            setRefreshToken(refreshRes.refreshToken);
            return apiFetch(path, options, requireAuth, retryCount + 1);
          }
        } catch (refreshErr) {
          console.warn('Refresh token failed:', refreshErr);
          setAuthToken('');
          setRefreshToken('');
          updateAuthUI(null);
        }
      } else {
        setAuthToken('');
        updateAuthUI(null);
      }
    }
    throw error;
  }
}

// ─── BACKEND REGISTER ─────────────────────────────────────
async function backendRegister(): Promise<any> {
  const email = getDeviceEmail();
  const name = email.split('@')[0].slice(0, 18);
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name }),
  }, false);
}

async function restoreBackendSession(): Promise<void> {
  const token = getAuthToken();
  if (!token) { updateAuthUI(null); return; }
  try {
    const data = await apiFetch('/auth/me', { method: 'GET' }, true);
    updateAuthUI(data.user || null);
  } catch (e: any) {
    // M-03: Surface non-401 errors (network failures etc.) via toast
    if (e.status === 401) {
      // Token expired or invalid — clear silently
      setAuthToken('');
      setRefreshToken('');
      updateAuthUI(null);
    } else {
      updateAuthUI(null);
      console.warn('[Auth] Session restore failed:', e?.message);
      if (typeof showNotif === 'function') {
        showNotif(
          tr('⚠ Could not restore session — check your connection', '⚠ Nie można przywrócić sesji — sprawdź połączenie'),
          true
        );
      }
    }
  }
}

// ─── AUTH UI ──────────────────────────────────────────────
function updateAuthUI(user: any): void {
  const btn = document.getElementById('auth-btn') as HTMLElement | null;
  if (!btn) return;

  // label/icon: querySelector returns Element | null → cast to HTMLElement
  const label = btn.querySelector('.auth-label') as HTMLElement | null;
  const icon = btn.querySelector('.auth-icon') as HTMLElement | null;
  if (!label || !icon) return;   // TS18047 fix: null guard

  if (user) {
    state.currentUser = {
      ...user,
      uid: user.id || user.uid,
      displayName: user.name || user.displayName || user.email?.split('@')[0] || 'User',
    };
    label.textContent = state.currentUser.displayName.split(' ')[0] || 'User';
    icon.textContent = '✅';
    btn.classList.add('active');
    btn.title = `Logged in as ${state.currentUser.email || 'user'}`;
    checkProStatus(state.currentUser.uid);
  } else {
    state.currentUser = null;
    label.textContent = tr('Login', 'Logowanie');
    icon.textContent = '👤';
    btn.classList.remove('active');
    btn.title = tr('Login with backend account', 'Zaloguj kontem backend');
    state.isPro = false;
  }
}

// ─── TOGGLE AUTH ──────────────────────────────────────────
// H-10: Removed anonymous device auto-registration (backendRegister).
// Login now directs users to Google OAuth only — no silent account creation.
async function toggleAuth(): Promise<void> {
  if (state.currentUser) {
    const shouldLogout = await (window.uiConfirm
      ? window.uiConfirm('Log out?', 'Wylogować się?', 'Log Out', 'Wylogowanie')
      : Promise.resolve(confirm(state.lang === 'en' ? 'Log out?' : 'Wylogować się?')));
    if (shouldLogout) {
      const refreshToken = getRefreshToken();
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }, true);
      } catch (e: any) {
        // G-04: If offline, enqueue logout so refresh token is invalidated when back online.
        // This prevents a stolen refresh token from being used after the user logs out.
        if (typeof window.enqueueSyncAction === 'function') {
          window.enqueueSyncAction({
            path: '/auth/logout',
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
            timestamp: Date.now(),
          }).catch(() => {/* silent — best-effort queue */ });
        }
        console.warn('Logout API warning (queued for retry):', e?.message);
      }
      setAuthToken('');
      setRefreshToken('');
      updateAuthUI(null);
      showNotif(state.lang === 'en' ? '👋 Logged out' : '👋 Wylogowano');
      if (typeof renderProjectsList === 'function') renderProjectsList();
    }
  } else {
    // H-10: Direct user to Google OAuth — no silent anonymous device account creation
    showNotif(
      state.lang === 'en'
        ? 'Please use Google Sign-In to log in'
        : 'Użyj Google Sign-In, aby się zalogować'
    );
    // Trigger Google One Tap / sign-in button if available
    const googleBtn = document.getElementById('google-signin-btn') as HTMLElement | null;
    if (googleBtn) googleBtn.click();
  }
}

// ─── SYNC ─────────────────────────────────────────────────
async function syncProjectsWithCloud(): Promise<void> {
  if (!state.currentUser || !getAuthToken()) return;
  showNotif(state.lang === 'en' ? '☁ Syncing...' : '☁ Synchronizacja...');
  try {
    const remote = await apiFetch('/projects', { method: 'GET' }, true);
    const cloudProjects: any[] = Array.isArray(remote.projects) ? remote.projects : [];
    // TS2339 fix: explicit any[] cast so dbGetAll result is typed
    const localProjects: any[] = await dbGetAll();
    const localMap = new Map<string, any>(localProjects.map((p: any) => [p.id, p]));
    const cloudMap = new Map<string, any>(cloudProjects.map((p: any) => [p.id, p]));

    for (const cp of cloudProjects) {
      const lp: any = localMap.get(cp.id);
      if (!lp || toMillis(cp.updatedAt) > toMillis(lp.updatedAt)) {
        // TS2698 fix: spread after explicit any cast
        const merged: any = { ...(lp as any), ...(cp as any) };
        await dbPut({
          ...merged,
          createdAt: toMillis(cp.createdAt) || lp?.createdAt || Date.now(),
          updatedAt: toMillis(cp.updatedAt) || lp?.updatedAt || Date.now(),
          agents: cp.agents || [],
          files: cp.files || [],
        });
      }
    }

    for (const lp of localProjects) {
      const cp: any = cloudMap.get(lp.id);
      if (!cp) {
        await apiFetch('/projects', { method: 'POST', body: JSON.stringify(lp) }, true);
      } else if (toMillis(lp.updatedAt) > toMillis(cp.updatedAt)) {
        await apiFetch(`/projects/${encodeURIComponent(lp.id)}`, { method: 'PUT', body: JSON.stringify(lp) }, true);
      }
    }

    await renderProjectsList();
    showNotif(state.lang === 'en' ? '☁ Sync complete' : '☁ Synchronizacja zakończona');
  } catch (e) {
    console.error('Sync failed:', e);
    showNotif('Sync Error', true);
  }
}

// ─── PRO STATUS ───────────────────────────────────────────
async function checkProStatus(uid: string): Promise<void> {
  if (!uid) return;
  if (!RC_API_KEY || !window.Purchases) {
    state.isPro = false;
    updateProUI(false);
    return;
  }
  await _checkRevenueCatProStatus(uid);
}

// ─── BOOTSTRAP ────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  restoreBackendSession().catch((e) => {
    console.warn('Auth bootstrap failed:', e?.message);
    updateAuthUI(null);
  });
});

// ─── WINDOW EXPORTS ───────────────────────────────────────
window.toggleAuth = toggleAuth;
window.showPaywall = showPaywall;
window.closePaywall = closePaywall;
window.initRevenueCat = initRevenueCat;
window.syncProjectsWithCloud = syncProjectsWithCloud;
window.checkProStatus = checkProStatus;
