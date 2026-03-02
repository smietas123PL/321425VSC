// ─── REVENUECAT & SUBSCRIPTIONS (#PRO) ───────────────────
// ═══════════════════════════════════════════════════════════

const RC_API_KEY = 'test_tkdeANlqTMmdcfjpXSXxoREROOA'; // RevenueCat TEST Key
const RC_ENTITLEMENT = 'pro_access'; // Name of entitlement in RevenueCat

// Initialize RevenueCat
async function initRevenueCat() {
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

async function checkProStatus(uid) {
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

function updateAuthUI(user) {
  const btn = document.getElementById('auth-btn');
  const label = btn.querySelector('.auth-label');
  const icon = btn.querySelector('.auth-icon');
  
  if (user) {
    window.currentUser = user;
    label.textContent = user.displayName?.split(' ')[0] || 'User';
    icon.textContent = '✅';
    btn.classList.add('active');
    btn.title = `Logged in as ${user.email}`;
    
    // Check Pro status (dummy for now, will connect to RevenueCat later)
    checkProStatus(user.uid);
  } else {
    window.currentUser = null;
    label.textContent = 'Login';
    icon.textContent = '👤';
    btn.classList.remove('active');
    btn.title = 'Login with Google';
    window.isPro = false;
  }
}

async function toggleAuth() {
  const { auth, provider, signInWithPopup, signOut } = window.fb;
  if (window.currentUser) {
    if (confirm(lang==='en' ? 'Log out?' : 'Wylogować się?')) {
      await signOut(auth);
      showNotif(lang==='en' ? '👋 Logged out' : '👋 Wylogowano');
      // Clear cloud projects from memory/view, keep local
      renderProjectsList();
    }
  } else {
    try {
      const res = await signInWithPopup(auth, provider);
      showNotif(lang==='en' ? `👋 Welcome, ${res.user.displayName}!` : `👋 Witaj, ${res.user.displayName}!`);
    } catch (e) {
      console.error(e);
      showNotif('Auth Error: ' + e.message, true);
    }
  }
}

async function syncProjectsWithCloud() {
  if (!window.currentUser) return;
  const { db, collection, getDocs, doc, setDoc } = window.fb;
  const uid = window.currentUser.uid;
  const projectsRef = collection(db, 'users', uid, 'projects');

  showNotif(lang==='en' ? '☁ Syncing...' : '☁ Synchronizacja...');

  try {
    // 1. Get cloud projects
    const snapshot = await getDocs(projectsRef);
    const cloudProjects = [];
    snapshot.forEach(doc => cloudProjects.push(doc.data()));

    // 2. Merge with local IndexedDB
    for (const p of cloudProjects) {
      await dbPut(p); // Update local with cloud version
    }

    // 3. Upload local projects that are newer or missing in cloud
    const localProjects = await dbGetAll();
    for (const p of localProjects) {
      const cloudP = cloudProjects.find(cp => cp.id === p.id);
      if (!cloudP || p.updatedAt > cloudP.updatedAt) {
        await setDoc(doc(db, 'users', uid, 'projects', p.id), p);
      }
    }

    await renderProjectsList();
    showNotif(lang==='en' ? '☁ Sync complete' : '☁ Synchronizacja zakończona');
  } catch (e) {
    console.error('Sync failed:', e);
    showNotif('Sync Error', true);
  }
}

// Dummy function until RevenueCat is integrated
async function checkProStatus(uid) {
  // In future: Check RevenueCat or Firestore for subscription
  window.isPro = false; 
  // Update UI to reflect Pro status if needed
}

// ─── PERSISTENT PROJECTS (#1) ────────────────────────────
// ═══════════════════════════════════════════════════════════

