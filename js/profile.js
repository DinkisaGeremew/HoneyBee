/* ============================================
   HONEYBEE — profile.js
   Profile Edit, Password Change, Level Logic
   ============================================ */

function initProfile() {
  renderProfile();
}

function renderProfile() {
  const s = getState();
  if (!s.currentUser) return;

  // Header card
  setEl('profile-name-display',  s.currentUser.name || 'User');
  setEl('profile-phone-display', '+251 ' + (s.currentUser.phone || ''));

  // Level
  const level = getUserLevel(s.tasksDone || 0);
  setEl('profile-level-display', level.label);

  // Stats
  setEl('profile-stat-balance',  formatCurrency(s.balance || 0));
  setEl('profile-stat-tasks',    (s.tasksDone || 0).toString());
  setEl('profile-stat-referrals',(s.referrals || 0).toString());
}

function getUserLevel(tasksDone) {
  if (tasksDone >= 50) return { label: '👑 Level 4 — Queen Bee' };
  if (tasksDone >= 25) return { label: '⚡ Level 3 — Worker Bee' };
  if (tasksDone >= 10) return { label: '🐝 Level 2 — Bee' };
  return { label: '⭐ Level 1 — Starter' };
}

/* ══════════════════════════════════════
   EDIT PROFILE MODAL
══════════════════════════════════════ */
function openEditProfile() {
  const s = getState();
  const input = document.getElementById('edit-name-input');
  if (input && s.currentUser) input.value = s.currentUser.name || '';
  openModal('modal-edit-profile');
}

function initEditProfileModal() {
  const saveBtn = document.getElementById('edit-profile-save');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    const newName = document.getElementById('edit-name-input').value.trim();
    if (!newName) return toast('Name cannot be empty', 'error');
    if (newName.length < 2) return toast('Name is too short', 'error');

    const s = getState();
    if (!s.currentUser) return;

    // Update user registry
    updateUser(s.currentUser.id, { name: newName });

    closeModal('modal-edit-profile');
    renderProfile();
    toast('Profile updated successfully ✅', 'success');
  });
}

/* ══════════════════════════════════════
   CHANGE PASSWORD MODAL
══════════════════════════════════════ */
function initChangePasswordModal() {
  const saveBtn = document.getElementById('change-pw-save');
  if (!saveBtn) return;

  // Password toggles inside this modal
  document.querySelectorAll('#modal-change-pw .toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
    });
  });

  saveBtn.addEventListener('click', () => {
    const currentPw  = document.getElementById('current-pw').value;
    const newPw      = document.getElementById('new-pw').value;
    const confirmPw  = document.getElementById('confirm-pw').value;

    if (!currentPw) return toast('Enter your current password', 'error');
    if (!newPw)     return toast('Enter a new password', 'error');
    if (!confirmPw) return toast('Confirm your new password', 'error');

    const s = getState();
    if (!s.currentUser) return toast('Not logged in', 'error');

    // Fetch user from persistent registry
    const users = loadUsers();
    const user  = users.find(u => u.id === s.currentUser.id);
    if (!user) return toast('User not found', 'error');

    if (user.passwordHash !== simpleHash(currentPw)) {
      return toast('Current password is incorrect', 'error');
    }
    if (newPw.length < 6) {
      return toast('New password must be at least 6 characters', 'error');
    }
    if (newPw !== confirmPw) {
      return toast('Passwords do not match', 'error');
    }

    // Update in registry
    updateUser(user.id, { passwordHash: simpleHash(newPw) });

    // Clear fields
    document.getElementById('current-pw').value = '';
    document.getElementById('new-pw').value = '';
    document.getElementById('confirm-pw').value = '';

    closeModal('modal-change-pw');
    toast('Password changed successfully 🔒', 'success');
  });
}

/* ══════════════════════════════════════
   REFERRAL
══════════════════════════════════════ */
async function copyReferralLink() {
  const s = getState();
  if (!s.currentUser) return;
  const code = s.currentUser.referralCode || 'HBEE0000';
  const link = `https://honeybee.app/join?ref=${code}`;
  const ok = await copyToClipboard(link);
  toast(ok ? '🔗 Referral link copied to clipboard!' : 'Could not copy — link: ' + link, ok ? 'success' : 'error');
}

/* ══════════════════════════════════════
   MY DEPOSITS
══════════════════════════════════════ */
function openMyDeposits() {
  const s = getState();
  const list = document.getElementById('my-deposits-list');
  if (!list) return;

  const deposits = (s.deposits || []).filter(d => d.userId === s.currentUser?.id);

  if (deposits.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--bee-gray);font-size:13px;">📭 No deposit history yet.</div>`;
  } else {
    list.innerHTML = deposits.slice().reverse().map(d => {
      const statusColor = d.status === 'approved' ? 'var(--green)' : d.status === 'rejected' ? 'var(--red)' : '#F59E0B';
      const statusLabel = d.status === 'approved' ? '✅ Approved' : d.status === 'rejected' ? '❌ Rejected' : '⏳ Pending';
      return `
        <div style="background:var(--white);border:1.5px solid #E5E7EB;border-left:4px solid ${statusColor};
                    border-radius:var(--radius);padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
            <div>
              <div style="font-size:16px;font-weight:800;color:var(--bee-black);">${formatCurrency(d.amount)}</div>
              <div style="font-size:12px;color:var(--bee-gray);margin-top:2px;">${d.methodLabel}</div>
            </div>
            <span style="padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;
                         background:${d.status==='approved'?'#DCFCE7':d.status==='rejected'?'#FEE2E2':'#FEF3C7'};
                         color:${d.status==='approved'?'#15803D':d.status==='rejected'?'#991B1B':'#92400E'};">
              ${statusLabel}
            </span>
          </div>
          <div style="font-size:11px;color:var(--bee-gray);">
            Ref: <strong style="color:var(--bee-black)">${d.txnNumber}</strong>
            &nbsp;·&nbsp; ${new Date(d.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
          </div>
        </div>`;
    }).join('');
  }

  openModal('modal-my-deposits');
}

/* ── Helper ── */
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
