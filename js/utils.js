/* ============================================
   HONEYBEE — utils.js
   Firebase Firestore data layer (CDN version)
   All localStorage replaced with Firestore
   ============================================ */

/* Firebase is loaded via CDN script tags in index.html
   before this file. _db is set up in initFirebase(). */

let _db = null;

const _fbConfig = {
  apiKey:            'AIzaSyDuTk4nzrJ5WYdJOIQnLZx14bjXjohnJOc',
  authDomain:        'honeybee-55512.firebaseapp.com',
  projectId:         'honeybee-55512',
  storageBucket:     'honeybee-55512.firebasestorage.app',
  messagingSenderId: '377234291130',
  appId:             '1:377234291130:web:1bbe4e3d8cd270441e8583'
};

/* ── Session (stays in localStorage — just a string ID) ── */
const SESSION_KEY = 'honeybee_session';
const USERS_KEY   = 'honeybee_users'; // kept for compatibility

function getSessionUserId() {
  try { return localStorage.getItem(SESSION_KEY) || null; } catch(e) { return null; }
}
function setSessionUserId(userId) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else        localStorage.removeItem(SESSION_KEY);
  } catch(e) {}
}

/* ══════════════════════════════════════
   IN-MEMORY CACHE
   Firestore is async; app is sync.
   We cache everything on boot then flush
   writes back to Firestore in the background.
══════════════════════════════════════ */
let _usersCache    = [];   // [{id, name, phone, passwordHash, referralCode, ...}]
let _userDataCache = {};   // {userId: {balance, deposits, withdrawals, ...}}

/* ── Write helpers (fire-and-forget) ── */
function _dbSetUser(userData) {
  if (!_db) return;
  const { id, ...rest } = userData;
  firebase.firestore().collection('users').doc(id).set(rest).catch(e => console.warn('DB write user:', e));
}

function _dbSetUserData(userId, data) {
  if (!_db) return;
  firebase.firestore().collection('userData').doc(userId).set(data).catch(e => console.warn('DB write userData:', e));
}

/* ══════════════════════════════════════
   PUBLIC API
══════════════════════════════════════ */
function loadUsers()        { return _usersCache.slice(); }
function saveUsers(users)   { _usersCache = users; users.forEach(u => _dbSetUser(u)); }

function registerUser(userData) {
  _usersCache.push(userData);
  _dbSetUser(userData);
}

function findUserByPhone(phone) {
  return _usersCache.find(u => u.phone === phone) || null;
}

function updateUser(userId, changes) {
  _usersCache = _usersCache.map(u => u.id === userId ? { ...u, ...changes } : u);
  const updated = _usersCache.find(u => u.id === userId);
  if (updated) _dbSetUser(updated);
}

function loadUserData(userId) {
  return _userDataCache[userId]
    ? { ...DEFAULT_USER_DATA, ..._userDataCache[userId] }
    : { ...DEFAULT_USER_DATA };
}

function saveUserData(userId, data) {
  _userDataCache[userId] = data;
  _dbSetUserData(userId, data);
}

/* ── Default schemas ── */
const DEFAULT_STATE = {
  users: [], currentUser: null,
  balance: 0, todayEarning: 0, totalEarned: 0,
  tasksDone: 0, referrals: 0,
  completedTasks: [], activities: [], notifications: [],
  deposits: [], withdrawals: [], pendingCredits: [],
  lastLoginDate: null, honeyTasks: []
};

const DEFAULT_USER_DATA = {
  balance: 0, todayEarning: 0, totalEarned: 0,
  tasksDone: 0, referrals: 0,
  completedTasks: [], activities: [], notifications: [],
  deposits: [], withdrawals: [], pendingCredits: [],
  lastLoginDate: null, honeyTasks: []
};

/* ── getState / setState ── */
function getState() {
  const userId = getSessionUserId();
  const users  = loadUsers();
  if (!userId) return { ...DEFAULT_STATE, users };
  const user     = users.find(u => u.id === userId) || null;
  const userData = loadUserData(userId);
  return {
    ...DEFAULT_STATE, ...userData, users,
    currentUser: user
      ? { id: user.id, name: user.name, phone: user.phone, referralCode: user.referralCode }
      : null
  };
}

function setState(updater) {
  const current = getState();
  const next    = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
  const userId  = getSessionUserId();
  if (userId) {
    const { users, currentUser, ...userData } = next;
    saveUserData(userId, userData);
    if (users) saveUsers(users);
  }
  return next;
}

/* ══════════════════════════════════════
   BOOT — initialise Firebase + load cache
   Returns a Promise; app waits for this.
══════════════════════════════════════ */
async function initFirebase() {
  try {
    /* Initialize if not already done */
    if (!firebase.apps.length) firebase.initializeApp(_fbConfig);
    _db = firebase.firestore();

    /* Load all users */
    const usersSnap = await _db.collection('users').get();
    _usersCache = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    /* Load current user's data */
    const uid = getSessionUserId();
    if (uid) {
      const udSnap = await _db.collection('userData').doc(uid).get();
      _userDataCache[uid] = udSnap.exists ? udSnap.data() : { ...DEFAULT_USER_DATA };
    }

    console.log('HoneyBee: Firebase ready. Users loaded:', _usersCache.length);
  } catch(e) {
    console.error('HoneyBee: Firebase init failed:', e);
    /* Fall back to localStorage so app still works offline */
    _fallbackToLocalStorage();
  }
}

function _fallbackToLocalStorage() {
  console.warn('HoneyBee: falling back to localStorage');
  try {
    _usersCache = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const uid = getSessionUserId();
    if (uid) {
      const raw = localStorage.getItem('honeybee_user_' + uid);
      _userDataCache[uid] = raw ? JSON.parse(raw) : { ...DEFAULT_USER_DATA };
    }
  } catch(e) { _usersCache = []; }

  /* Override save functions to write to localStorage */
  _dbSetUser = function(userData) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex(u => u.id === userData.id);
    if (idx !== -1) users[idx] = userData; else users.push(userData);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };
  _dbSetUserData = function(userId, data) {
    localStorage.setItem('honeybee_user_' + userId, JSON.stringify(data));
  };
}

/* ── Legacy no-ops ── */
function loadState() { return getState(); }
function saveState() {}
function applyPendingCredits() {}

/* ══════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════ */
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'ETB 0';
  const num = Number(amount);
  if (isNaN(num)) return 'ETB 0';
  return 'ETB ' + num.toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function relativeTime(isoString) {
  if (!isoString) return 'Just now';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + ' hr ago';
  const days = Math.floor(hrs / 24);
  return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function generateReferralCode(name) {
  const base = (name || 'USER').toUpperCase().replace(/\s+/g, '').slice(0, 4);
  return base + Math.floor(1000 + Math.random() * 9000);
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

function addActivity(icon, desc, amount, type) {
  setState(s => {
    const activities = [
      { icon, desc, amount, type, time: new Date().toISOString() },
      ...s.activities
    ].slice(0, 50);
    return { ...s, activities };
  });
}

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

let toastTimeout = null;
function toast(message, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  container.querySelectorAll('.toast').forEach(el => el.remove());
  const el = document.createElement('div');
  el.className = 'toast' + (type && type !== 'default' ? ' ' + type : '');
  el.textContent = message;
  container.appendChild(el);
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.add('dismissing');
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
  }, 3000);
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch(e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta); return true;
    } catch(e2) { return false; }
  }
}

function isToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString), now = new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
}

function checkDayReset() {
  const s = getState();
  if (!isToday(s.lastLoginDate)) {
    setState(prev => ({ ...prev, todayEarning: 0, lastLoginDate: new Date().toISOString() }));
  }
}
