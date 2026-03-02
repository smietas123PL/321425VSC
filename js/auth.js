// ─── REVENUECAT & SUBSCRIPTIONS (#PRO) ───────────────────
// ═══════════════════════════════════════════════════════════

const RC_API_KEY = window.__AGENTSPARK_CONFIG__?.REVENUECAT_API_KEY || null;
const RC_ENTITLEMENT = 'pro_access'; // Name of entitlement in RevenueCat

// Initialize RevenueCat
async function initRevenueCat() {
  if (!RC_API_KEY) {
    console.info('RevenueCat key not configured; subscription checks disabled');
    return;
  }
  if (!window.Purchases) {
    console.warn('RevenueCat SDK not loaded');
    return;
  }
  try {
    const { Purchases } = window.Purchases;
    await Purchases.configure({ apiKey: RC_API_KEY });
    
    // Check initial status if user logged in
    if (window.currentUser) {
      await checkProStatus(window.currentUser.uid);
    }
  } catch (e) {
    console.error('RC Init Error:', e);
  }
}

async function _checkRevenueCatProStatus(uid) {
  if (!uid || !window.Purchases) return;
  try {
    const { Purchases } = window.Purchases;
    const { customerInfo } = await Purchases.logIn({ appUserID: uid });
    
    // Check active entitlements
    if (customerInfo.entitlements.active[RC_ENTITLEMENT]) {
      window.isPro = true;
      console.log('User is PRO 🌟');
      updateProUI(true);
    } else {
      window.isPro = false;
      console.log('User is FREE');
      updateProUI(false);
    }
  } catch (e) {
    console.error('Check Pro Status Failed:', e);
  }
}

function updateProUI(isPro) {
  const badge = document.getElementById('pro-badge');
  if (isPro) {
    if (badge) badge.style.display = 'inline-block';
    // Unlock features
    document.querySelectorAll('.locked-feature').forEach(el => el.classList.remove('locked'));
  } else {
    if (badge) badge.style.display = 'none';
    // Lock features
    document.querySelectorAll('.locked-feature').forEach(el => el.classList.add('locked'));
  }
}

// Show Paywall Modal
function showPaywall() {
  const modal = document.getElementById('paywall-modal');
  if (modal) {
    modal.classList.add('open');
    // Load offerings dynamically if needed
    loadOfferings();
  }
}

async function loadOfferings() {
  if (!window.Purchases) return;
  try {
    const { Purchases } = window.Purchases;
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      const pkg = offerings.current.availablePackages[0]; // e.g. Monthly
      const product = pkg.product;
      
      document.getElementById('paywall-price').textContent = product.priceString;
      document.getElementById('paywall-btn').onclick = () => purchasePackage(pkg);
    }
  } catch (e) {
    console.error('Load Offerings Error:', e);
  }
}

async function purchasePackage(pkg) {
  try {
    const { Purchases } = window.Purchases;
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    
    if (customerInfo.entitlements.active[RC_ENTITLEMENT]) {
      window.isPro = true;
      updateProUI(true);
      closePaywall();
      showNotif(lang==='en' ? '🎉 Welcome to Pro!' : '🎉 Witaj w wersji Pro!');
    }
  } catch (e) {
    if (!e.userCancelled) {
      showNotif('Purchase Error: ' + e.message, true);
    }
  }
}

function closePaywall() {
  document.getElementById('paywall-modal').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════
// ─── AUTHENTICATION & SYNC (#AUTH) ───────────────────────
// ═══════════════════════════════════════════════════════════

window.currentUser = null;
window.isPro = false;
const AUTH_TOKEN_KEY = 'agentspark-auth-token';
const DEVICE_EMAIL_KEY = 'agentspark-device-email';
const toMillis = (v) => {
  if (typeof v === 'number') return v;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
};

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function setAuthToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

function getDeviceEmail() {
  const existing = localStorage.getItem(DEVICE_EMAIL_KEY);
  if (existing) return existing;
  const id = (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`).replace(/[^a-zA-Z0-9_]/g, '');
  const email = `agentspark_${id.toLowerCase()}@local.agentspark`;
  localStorage.setItem(DEVICE_EMAIL_KEY, email);
  return email;
}

async function apiFetch(path, options = {}, requireAuth = true) {
  if (typeof window.agentsparkApiFetch !== 'function') {
    throw new Error('API client not initialized');
  }
  const token = requireAuth ? getAuthToken() : '';
  return window.agentsparkApiFetch(path, { ...options, token });
}

async function backendRegister() {
  const email = getDeviceEmail();
  const name = email.split('@')[0].slice(0, 18);
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name }),
  }, false);
  return data;
}

async function restoreBackendSession() {
  const token = getAuthToken();
  if (!token) {
    updateAuthUI(null);
    return;
  }
  try {
    const data = await apiFetch('/auth/me', { method: 'GET' }, true);
    updateAuthUI(data.user || null);
  } catch (e) {
    setAuthToken('');
    updateAuthUI(null);
  }
}

function updateAuthUI(user) {
  const btn = document.getElementById('auth-btn');
  if (!btn) return;
  const label = btn.querySelector('.auth-label');
  const icon = btn.querySelector('.auth-icon');
  
  if (user) {
    window.currentUser = {
      ...user,
      uid: user.id || user.uid,
      displayName: user.name || user.displayName || user.email?.split('@')[0] || 'User',
    };
    label.textContent = window.currentUser.displayName.split(' ')[0] || 'User';
    icon.textContent = '✅';
    btn.classList.add('active');
    btn.title = `Logged in as ${window.currentUser.email || 'user'}`;
    
    checkProStatus(window.currentUser.uid);
  } else {
    window.currentUser = null;
    label.textContent = tr('Login', 'Logowanie');
    icon.textContent = '👤';
    btn.classList.remove('active');
    btn.title = tr('Login with backend account', 'Zaloguj kontem backend');
    window.isPro = false;
  }
}

async function toggleAuth() {
  if (window.currentUser) {
    const shouldLogout = await (window.uiConfirm
      ? window.uiConfirm(
        'Log out?',
        'Wylogować się?',
        'Log Out',
        'Wylogowanie'
      )
      : Promise.resolve(confirm(lang==='en' ? 'Log out?' : 'Wylogować się?')));
    if (shouldLogout) {
      try {
        await apiFetch('/auth/logout', { method: 'POST' }, true);
      } catch (e) {
        console.warn('Logout API warning:', e.message);
      }
      setAuthToken('');
      updateAuthUI(null);
      showNotif(lang==='en' ? '👋 Logged out' : '👋 Wylogowano');
      renderProjectsList();
    }
  } else {
    try {
      const data = await backendRegister();
      setAuthToken(data.token || '');
      updateAuthUI(data.user || null);
      showNotif(lang==='en'
        ? `👋 Welcome, ${window.currentUser?.displayName || 'User'}!`
        : `👋 Witaj, ${window.currentUser?.displayName || 'Użytkowniku'}!`
      );
      await syncProjectsWithCloud();
    } catch (e) {
      console.error(e);
      showNotif('Auth Error: ' + e.message, true);
    }
  }
}

async function syncProjectsWithCloud() {
  if (!window.currentUser || !getAuthToken()) return;

  showNotif(lang==='en' ? '☁ Syncing...' : '☁ Synchronizacja...');

  try {
    const remote = await apiFetch('/projects', { method: 'GET' }, true);
    const cloudProjects = Array.isArray(remote.projects) ? remote.projects : [];
    const localProjects = await dbGetAll();
    const localMap = new Map(localProjects.map((p) => [p.id, p]));
    const cloudMap = new Map(cloudProjects.map((p) => [p.id, p]));

    for (const cp of cloudProjects) {
      const lp = localMap.get(cp.id);
      if (!lp || toMillis(cp.updatedAt) > toMillis(lp.updatedAt)) {
        await dbPut({
          ...lp,
          ...cp,
          createdAt: toMillis(cp.createdAt) || lp?.createdAt || Date.now(),
          updatedAt: toMillis(cp.updatedAt) || lp?.updatedAt || Date.now(),
          agents: cp.agents || [],
          files: cp.files || [],
        });
      }
    }

    for (const lp of localProjects) {
      const cp = cloudMap.get(lp.id);
      if (!cp) {
        await apiFetch('/projects', {
          method: 'POST',
          body: JSON.stringify(lp),
        }, true);
      } else if (toMillis(lp.updatedAt) > toMillis(cp.updatedAt)) {
        await apiFetch(`/projects/${encodeURIComponent(lp.id)}`, {
          method: 'PUT',
          body: JSON.stringify(lp),
        }, true);
      }
    }

    await renderProjectsList();
    showNotif(lang==='en' ? '☁ Sync complete' : '☁ Synchronizacja zakończona');
  } catch (e) {
    console.error('Sync failed:', e);
    showNotif('Sync Error', true);
  }
}

async function checkProStatus(uid) {
  if (!uid) return;
  if (!RC_API_KEY || !window.Purchases) {
    window.isPro = false;
    updateProUI(false);
    return;
  }
  await _checkRevenueCatProStatus(uid);
}

window.addEventListener('DOMContentLoaded', () => {
  restoreBackendSession().catch((e) => {
    console.warn('Auth bootstrap failed:', e.message);
    updateAuthUI(null);
  });
});

// ─── PERSISTENT PROJECTS (#1) ────────────────────────────
// ═══════════════════════════════════════════════════════════

