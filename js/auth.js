/* ============================================
   HONEYBEE — auth.js
   Register, Login, Logout Logic
   ============================================ */

/* ── Inline auth error helpers ── */
function authError(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearAuthError(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

/* initAuth is called ONCE on page load only.
   Never call it again after logout — that double-binds listeners. */
function initAuth() {
  const tabRegister  = document.getElementById('tab-register');
  const tabLogin     = document.getElementById('tab-login');
  const formRegister = document.getElementById('form-register');
  const formLogin    = document.getElementById('form-login');

  /* ── Tab switching ── */
  tabRegister.addEventListener('click', () => switchAuthTab('register'));
  tabLogin.addEventListener('click',    () => switchAuthTab('login'));

  /* ── Password toggles ── */
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ── Register ── */
  formRegister.addEventListener('submit', e => {
    e.preventDefault();
    clearAuthError('register-error');

    const name     = document.getElementById('reg-name').value.trim();
    const phone    = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const referral = document.getElementById('reg-referral').value.trim().toUpperCase();

    if (!name)               return authError('register-error', 'Please enter your full name');
    if (!phone)              return authError('register-error', 'Please enter your phone number');
    if (phone.length < 9)    return authError('register-error', 'Enter a valid phone number (9 digits)');
    if (password.length < 6) return authError('register-error', 'Password must be at least 6 characters');

    // Check duplicate phone in persistent user registry
    if (findUserByPhone(phone)) return authError('register-error', 'This phone number is already registered');

    // Check referral code
    let referredBy = null;
    if (referral) {
      const allUsers = loadUsers();
      const referrer = allUsers.find(u => u.referralCode === referral);
      if (!referrer) return authError('register-error', 'Invalid referral code');
      referredBy = referrer.id;
    }

    const newUser = {
      id:           generateId(),
      name,
      phone,
      passwordHash: simpleHash(password),
      referralCode: generateReferralCode(name),
      referredBy,
      createdAt:    new Date().toISOString()
    };

    // Save to persistent user registry
    registerUser(newUser);

    // Seed the new user's personal data store
    const initialData = {
      balance:        referredBy ? 50 : 0,
      todayEarning:   0,
      totalEarned:    referredBy ? 50 : 0,
      tasksDone:      0,
      referrals:      0,
      completedTasks: [],
      activities:     referredBy
        ? [{ icon: '🎁', desc: 'Referral signup bonus', amount: 50, type: 'credit', time: new Date().toISOString() }]
        : [],
      notifications:  [],
      deposits:       [],
      pendingCredits: [],
      lastLoginDate:  new Date().toISOString()
    };
    saveUserData(newUser.id, initialData);

    // Credit referrer bonus notification (written to referrer's data)
    if (referredBy) {
      const referrerData = loadUserData(referredBy);
      referrerData.referrals    = (referrerData.referrals || 0) + 1;
      referrerData.balance      = (referrerData.balance || 0) + 50;
      referrerData.totalEarned  = (referrerData.totalEarned || 0) + 50;
      referrerData.notifications = [
        { text: `🎁 ${name} joined using your referral! +ETB 50 bonus`, time: new Date().toISOString(), read: false },
        ...(referrerData.notifications || [])
      ];
      referrerData.activities = [
        { icon: '🎁', desc: `Referral bonus — ${name} joined`, amount: 50, type: 'credit', time: new Date().toISOString() },
        ...(referrerData.activities || [])
      ];
      saveUserData(referredBy, referrerData);
    }

    // After registration → go to login tab (do NOT auto-login)
    formRegister.reset();
    clearAuthError('register-error');
    switchAuthTab('login');
    toast(`Account created! Please login, ${name} 🐝`, 'success');

    // Notify admin by email
    notifyAdminNewUser(newUser);
  });

  /* ── Login ── */
  formLogin.addEventListener('submit', e => {
    e.preventDefault();
    clearAuthError('login-error');

    const phone    = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;

    if (!phone)    return authError('login-error', 'Please enter your phone number');
    if (!password) return authError('login-error', 'Please enter your password');

    const user = findUserByPhone(phone);
    if (!user) return authError('login-error', 'Phone number not registered. Please sign up first.');

    if (user.deactivated) {
      return authError('login-error', 'Your account has been deactivated. Please contact support via Telegram @Nelson_Jem.');
    }

    if (user.passwordHash !== simpleHash(password)) {
      return authError('login-error', 'Incorrect password. Please try again.');
    }

    // Start session
    setSessionUserId(user.id);
    checkDayReset();
    toast(`Welcome back, ${user.name}! 🐝`, 'success');
    showMainApp();
  });
}

/* ── Tab switching ── */
function switchAuthTab(tab) {
  const tabRegister  = document.getElementById('tab-register');
  const tabLogin     = document.getElementById('tab-login');
  const formRegister = document.getElementById('form-register');
  const formLogin    = document.getElementById('form-login');

  // Clear errors when switching tabs
  clearAuthError('login-error');
  clearAuthError('register-error');

  if (tab === 'register') {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.setAttribute('aria-selected', 'false');
  } else {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.setAttribute('aria-selected', 'false');
  }
}

/* ── Show main app after successful login ── */
function showMainApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  checkDayReset();
  initApp();    // binds listeners once; always calls navigateTo('home') → renderHome/Tasks/Products/Profile
  renderAll();  // ensures notif badge + all panels are fresh
}

/* ── Logout ── */
function logout() {
  showConfirm(
    '🚪',
    'Logout',
    'Are you sure you want to logout?',
    () => {
      // 1. Clear session — user data stays in localStorage for next login
      setSessionUserId(null);

      // 2. Close any open modals and the notification panel
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      closeNotifPanel();

      // 3. Hide app, show auth screen
      document.getElementById('main-app').classList.add('hidden');
      document.getElementById('auth-screen').classList.remove('hidden');

      // 4. Reset both forms and land on login tab
      document.getElementById('form-register').reset();
      document.getElementById('form-login').reset();
      switchAuthTab('login');

      toast('Logged out successfully');
      // initAuth() is NOT called — listeners are already bound from page load
    }
  );
}
