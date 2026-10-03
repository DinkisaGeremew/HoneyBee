/* ============================================
   HONEYBEE — app.js
   Init, Navigation, Screen Switching, Modals
   ============================================ */

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
let currentScreen = 'home';

function navigateTo(screen) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById('screen-' + screen);
  if (target) target.classList.add('active');

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-screen="${screen}"]`);
  if (navItem) navItem.classList.add('active');

  currentScreen = screen;

  // Per-screen refresh
  if (screen === 'home')     renderHome();
  if (screen === 'tasks')    renderTasks();
  if (screen === 'products') renderProducts();
  if (screen === 'profile')  renderProfile();

  // Close notification panel on nav
  closeNotifPanel();
}

/* ══════════════════════════════════════
   MODAL SYSTEM
══════════════════════════════════════ */
function openModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.add('open');
  // Lock scroll on the screens container
  const screens = document.querySelector('.screens');
  if (screens) screens.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const overlay = document.getElementById(modalId);
  if (!overlay) return;
  overlay.classList.remove('open');
  // Restore scroll
  const screens = document.querySelector('.screens');
  if (screens) screens.style.overflow = '';
}

function initModals() {
  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) closeModal(overlay.id);
    });
  });

  // Task start button — handler is set dynamically per task type in tasks.js
  // (regular tasks use startTask; honey tasks use claimHoneyTask)
  // No static binding here to avoid conflicts.

  // Product buy button (in detail modal)
  const productBuyBtn = document.getElementById('product-buy-btn');
  if (productBuyBtn) productBuyBtn.addEventListener('click', buyActiveProduct);

  // Recharge buttons (from home page)
  document.querySelectorAll('.btn-recharge').forEach(btn => {
    btn.addEventListener('click', openRecharge);
  });

  // Withdraw buttons (from home page)
  document.querySelectorAll('.btn-withdraw').forEach(btn => {
    btn.addEventListener('click', openWithdraw);
  });
}

/* ══════════════════════════════════════
   CONFIRM DIALOG
══════════════════════════════════════ */
let confirmCallback = null;

function showConfirm(icon, title, message, onConfirm) {
  confirmCallback = onConfirm;
  document.getElementById('confirm-icon').textContent    = icon;
  document.getElementById('confirm-title').textContent   = title;
  document.getElementById('confirm-message').textContent = message;

  const overlay = document.getElementById('confirm-dialog');
  overlay.classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-dialog').classList.remove('open');
  confirmCallback = null;
}

function initConfirmDialog() {
  document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirm);
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    // Capture callback BEFORE closeConfirm nulls it out
    const cb = confirmCallback;
    closeConfirm();
    if (typeof cb === 'function') cb();
  });
  document.getElementById('confirm-dialog').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeConfirm();
  });
}

/* ══════════════════════════════════════
   HOME RENDER
══════════════════════════════════════ */
function renderHome() {
  const s = getState();
  setElText('balance-amount',    formatCurrency(s.balance || 0));
  setElText('stat-today-earn',   formatCurrency(s.todayEarning || 0));
  setElText('stat-tasks-done',   (s.tasksDone || 0).toString());
  setElText('stat-total-earned', formatCurrency(s.totalEarned || 0));

  // Show pending deposit banner if user has any pending deposits
  const banner = document.getElementById('pending-deposit-banner');
  if (banner) {
    const deposits = s.deposits || [];
    const userId = s.currentUser ? s.currentUser.id : null;
    const hasPending = deposits.some(d => d.userId === userId && d.status === 'pending');
    banner.classList.toggle('hidden', !hasPending);
  }

  renderActivityList();
}

function renderActivityList() {
  const s = getState();
  const list = document.getElementById('activity-list');
  if (!list) return;

  const activities = s.activities || [];

  if (activities.length === 0) {
    list.innerHTML = `<div class="activity-empty">📭 No activity yet. Start a task!</div>`;
    return;
  }

  list.innerHTML = activities.slice(0, 10).map(a => `
    <div class="activity-item">
      <div class="activity-icon">${a.icon || '💰'}</div>
      <div class="activity-info">
        <div class="activity-desc">${escapeHtml(a.desc)}</div>
        <div class="activity-time">${relativeTime(a.time)}</div>
      </div>
      <div class="activity-amount ${a.type}">
        ${a.type === 'credit' ? '+' : '-'}${formatCurrency(a.amount)}
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════
   INVITE BANNER
══════════════════════════════════════ */
function initInviteBanner() {
  const copyBtn = document.getElementById('copy-link-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const s = getState();
      const code = s.currentUser ? s.currentUser.referralCode : 'HBEE0000';
      const link = `https://honeybee.app/join?ref=${code}`;
      const ok = await copyToClipboard(link);
      toast(ok ? '🔗 Referral link copied!' : 'Could not copy link', ok ? 'success' : 'error');
    });
  }
}

/* ══════════════════════════════════════
   GLOBAL RENDER
══════════════════════════════════════ */
function renderAll() {
  renderHome();
  renderTasks();
  renderProducts();
  renderProfile();
  updateNotifBadge();
}

/* ══════════════════════════════════════
   MAIN INIT
══════════════════════════════════════ */
let _modulesInitialized = false; // guards one-time listener binding

function initApp() {
  if (!_modulesInitialized) {
    _modulesInitialized = true;

    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const screen = item.getAttribute('data-screen');
        if (screen) navigateTo(screen);
      });
    });

    // Modals
    initModals();
    initConfirmDialog();

    // Modules — bind once, render on every login
    initNotifications();
    initWallet();
    initTasks();
    initProducts();
    initEditProfileModal();
    initChangePasswordModal();
    initInviteBanner();
  }

  // Always navigate home on (re-)login
  navigateTo('home');
}

/* ── Helper ── */
function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  /* Show loading state */
  document.getElementById('auth-screen').style.opacity = '0.5';

  /* Wait for Firebase cache to load */
  await initFirebase();

  /* Restore opacity */
  document.getElementById('auth-screen').style.opacity = '';

  const userId = getSessionUserId();
  if (userId) {
    const user = loadUsers().find(u => u.id === userId);
    if (user) {
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      checkDayReset();
      initApp();
      renderAll();
      return;
    }
    setSessionUserId(null);
  }
  initAuth();
});
