/* ============================================
   HONEYBEE — utils.js
   Toast, formatCurrency, localStorage helpers
   ============================================ */

const STORAGE_KEY      = 'honeybee_data';
const USERS_KEY        = 'honeybee_users';   // persistent user registry
const SESSION_KEY      = 'honeybee_session'; // currently logged-in user id

/* ── Default global state (session-scoped, wiped on logout) ── */
const DEFAULT_STATE = {
  users: [],        // kept for legacy reads, source-of-truth is USERS_KEY
  currentUser: null,
  balance: 0,
  todayEarning: 0,
  totalEarned: 0,
  tasksDone: 0,
  referrals: 0,
  completedTasks: [],
  activities: [],
  notifications: [],
  deposits: [],
  pendingCredits: [],
  lastLoginDate: null
};

/* ══════════════════════════════════════
   USER REGISTRY  (separate from session state)
══════════════════════════════════════ */
function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (e) { console.warn('HoneyBee: could not save users', e); }
}

function registerUser(userData) {
  const users = loadUsers();
  users.push(userData);
  saveUsers(users);
}

function findUserByPhone(phone) {
  return loadUsers().find(u => u.phone === phone) || null;
}

function updateUser(userId, changes) {
  const users = loadUsers().map(u => u.id === userId ? { ...u, ...changes } : u);
  saveUsers(users);
}

/* ══════════════════════════════════════
   PER-USER DATA  (keyed by user id)
══════════════════════════════════════ */
function getUserDataKey(userId) {
  return 'honeybee_user_' + userId;
}

const DEFAULT_USER_DATA = {
  balance: 0,
  todayEarning: 0,
  totalEarned: 0,
  tasksDone: 0,
  referrals: 0,
  completedTasks: [],
  activities: [],
  notifications: [],
  deposits: [],
  pendingCredits: [],
  lastLoginDate: null
};

function loadUserData(userId) {
  try {
    const raw = localStorage.getItem(getUserDataKey(userId));
    return raw ? { ...DEFAULT_USER_DATA, ...JSON.parse(raw) } : { ...DEFAULT_USER_DATA };
  } catch (e) { return { ...DEFAULT_USER_DATA }; }
}

function saveUserData(userId, data) {
  try {
    localStorage.setItem(getUserDataKey(userId), JSON.stringify(data));
  } catch (e) { console.warn('HoneyBee: could not save user data', e); }
}

/* ── Session (current logged-in user id) ── */
function getSessionUserId() {
  try { return localStorage.getItem(SESSION_KEY) || null; } catch (e) { return null; }
}

function setSessionUserId(userId) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else        localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

/* ── getState / setState  (unified view for the rest of the app) ── */
function getState() {
  const userId = getSessionUserId();
  const users  = loadUsers();
  if (!userId) {
    // Not logged in — return empty shell
    return { ...DEFAULT_STATE, users };
  }
  const user     = users.find(u => u.id === userId) || null;
  const userData = loadUserData(userId);
  return {
    ...DEFAULT_STATE,
    ...userData,
    users,
    currentUser: user ? { id: user.id, name: user.name, phone: user.phone, referralCode: user.referralCode } : null
  };
}

function setState(updater) {
  const current = getState();
  const next    = typeof updater === 'function' ? updater(current) : { ...current, ...updater };

  const userId = getSessionUserId();
  if (userId) {
    // Split off per-user data and save separately
    const { users, currentUser, ...userData } = next;
    saveUserData(userId, userData);

    // If the updater changed the users list (e.g. edit profile), persist it
    if (users) saveUsers(users);
  }
  return next;
}

/* ── Legacy helpers (kept so nothing else breaks) ── */
function loadState() { return getState(); }
function saveState() { /* no-op: setState handles persistence */ }

/* ── Currency Formatter ── */
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'ETB 0';
  const num = Number(amount);
  if (isNaN(num)) return 'ETB 0';
  return 'ETB ' + num.toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

/* ── Relative Time ── */
function relativeTime(isoString) {
  if (!isoString) return 'Just now';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* ── Generate ID ── */
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ── Generate Referral Code ── */
function generateReferralCode(name) {
  const base = (name || 'USER').toUpperCase().replace(/\s+/g, '').slice(0, 4);
  return base + Math.floor(1000 + Math.random() * 9000);
}

/* ── Simple hash (not cryptographic, just for demo) ── */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

/* ── Add Activity ── */
function addActivity(icon, desc, amount, type) {
  setState(s => {
    const activities = [
      { icon, desc, amount, type, time: new Date().toISOString() },
      ...s.activities
    ].slice(0, 50); // keep last 50
    return { ...s, activities };
  });
}

/* ── Add Notification ── */
function addNotification(text) {
  setState(s => {
    const notifications = [
      { text, time: new Date().toISOString(), read: false },
      ...s.notifications
    ].slice(0, 50);
    return { ...s, notifications };
  });
  if (typeof updateNotifBadge === 'function') updateNotifBadge();
}

/* ── Toast ── */
let toastTimeout = null;

function toast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Remove any existing toasts
  const existing = container.querySelectorAll('.toast');
  existing.forEach(el => el.remove());

  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'default' ? ' ' + type : '');
  el.textContent = message;
  container.appendChild(el);

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.add('dismissing');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 320);
  }, 3000);
}

/* ── Copy to Clipboard ── */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

/* ── Today Check ── */
function isToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

/* ── Reset today earning if new day ── */
function checkDayReset() {
  const s = getState();
  if (!isToday(s.lastLoginDate)) {
    setState(prev => ({ ...prev, todayEarning: 0, lastLoginDate: new Date().toISOString() }));
  }
}

/* ── App init guard — managed in app.js as _modulesInitialized ── */
let _appInitialized = false; // kept for any legacy reference, not used directly

/* ══════════════════════════════════════
   PENDING CREDITS — no-op in new architecture.
   Admin panel writes credits directly to user data.
   This function is kept for compatibility.
══════════════════════════════════════ */
function applyPendingCredits(userId) {
  // In the new architecture the admin panel writes approval data
  // directly into the user's data store via saveUserData().
  // Nothing extra needed here — getState() already reads the
  // latest balance from that store on every call.
}
