import { state } from '../core/state.js';

let _drawerOpen = false;

function toggleDrawer() {
  _drawerOpen ? closeDrawer() : openDrawer();
}

function openDrawer() {
  _drawerOpen = true;
  (document.getElementById('nav-drawer') as HTMLElement)?.classList.add('open');
  (document.getElementById('nav-drawer-overlay') as HTMLElement)?.classList.add('open');
  const btn = (document.getElementById('burger-btn') as HTMLElement);
  if (btn) {
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
  document.body.style.overflow = 'hidden';
  updateDrawerActive();
}

function closeDrawer() {
  _drawerOpen = false;
  (document.getElementById('nav-drawer') as HTMLElement)?.classList.remove('open');
  const overlay = (document.getElementById('nav-drawer-overlay') as HTMLElement);
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.classList.remove('open');
      overlay.style.opacity = '';
    }, 280);
  }
  const btn = (document.getElementById('burger-btn') as HTMLElement);
  if (btn) {
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
}

function updateDrawerActive() {
  const screens = ['home', 'projects', 'chat', 'results'];
  let active = 'home';
  screens.forEach(s => {
    const screen = document.getElementById('screen-' + (s === 'home' ? 'topic' : s));
    if (screen && screen.classList.contains('active')) active = s;
  });
  document.querySelectorAll('.drawer-nav-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById('dnav-' + active);
  if (activeEl) activeEl.classList.add('active');

  // Badge sync
  const tabBadge = (document.getElementById('tab-badge') as HTMLElement);
  const dnavBadge = (document.getElementById('dnav-badge') as HTMLElement);
  if (dnavBadge && tabBadge) {
    dnavBadge.textContent = tabBadge.textContent;
    dnavBadge.style.display = tabBadge.style.display;
  }

  // Theme icon
  const themeIcon = (document.getElementById('dnav-theme-icon') as HTMLElement);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '☀️';
}

function showScreen(name: string) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add('active');

  syncIosTabBar(name);
  if (window._syncFab) window._syncFab();
  state.lastScreenName = name;

  if (window.trackEvent) {
    window.trackEvent('screen_view', { success: true, screen: name });
  }

  // Context bar update
  if (window._updateContextBar) window._updateContextBar(name);
  updateDrawerActive();

  // Re-init swipe gestures after projects screen loads
  if (name === 'projects' && window._initSwipeGestures) {
    setTimeout(window._initSwipeGestures, 200);
  }
}

function syncIosTabBar(screenName: string) {
  const tabMap = {
    'topic': 'home',
    'gallery': 'gallery',
    'projects': 'projects',
    'chat': 'chat',
    'results': 'results',
  };
  const activeTab = (tabMap as any)[screenName] || 'home';

  const chatTab = (document.getElementById('tab-chat') as HTMLElement);
  const resultsTab = (document.getElementById('tab-results') as HTMLElement);
  if (chatTab) chatTab.style.display = (screenName === 'chat' || screenName === 'results') ? '' : 'none';
  if (resultsTab) resultsTab.style.display = (screenName === 'results') ? '' : 'none';

  document.querySelectorAll('.ios-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('tab-' + activeTab);
  if (activeBtn) activeBtn.classList.add('active');
}

function iosTabNav(tab: string) {
  if (tab === 'home') showScreen('topic');
  else if (tab === 'gallery') {
    showScreen('gallery');
    if (window.initGallery) window.initGallery();
  }
  else if (tab === 'projects') {
    if (window.openProjectsScreen) window.openProjectsScreen();
  }
  else if (tab === 'chat') showScreen('chat');
  else if (tab === 'results') showScreen('results');
  else if (tab === 'settings') {
    if (window.openSettingsSheet) window.openSettingsSheet();
  }
}

// Export to window
window.toggleDrawer = toggleDrawer;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.updateDrawerActive = updateDrawerActive;
window.showScreen = showScreen;
window.syncIosTabBar = syncIosTabBar;
window.iosTabNav = iosTabNav;

// Key listeners
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _drawerOpen) closeDrawer();
});

// Handle back-to-top sync if needed
window.addEventListener('scroll', () => {
  if (window._syncBackToTop) window._syncBackToTop();
}, { passive: true });
