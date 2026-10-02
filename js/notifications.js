/* ============================================
   HONEYBEE — notifications.js
   Notification Panel + Badge
   ============================================ */

let notifPanelOpen = false;

function initNotifications() {
  const btn     = document.getElementById('notif-btn');
  const panel   = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  const markAll = document.getElementById('notif-mark-all');

  if (btn) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleNotifPanel();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => closeNotifPanel());
  }

  if (markAll) {
    markAll.addEventListener('click', () => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }));
      updateNotifBadge();
      renderNotifList();
    });
  }

  updateNotifBadge();
}

function toggleNotifPanel() {
  notifPanelOpen ? closeNotifPanel() : openNotifPanel();
}

function openNotifPanel() {
  notifPanelOpen = true;
  const panel   = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (panel)   panel.classList.add('open');
  if (overlay) overlay.classList.remove('hidden');
  renderNotifList();

  // Mark all as read after a short delay
  setTimeout(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true }))
    }));
    updateNotifBadge();
  }, 800);
}

function closeNotifPanel() {
  notifPanelOpen = false;
  const panel   = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (panel)   panel.classList.remove('open');
  if (overlay) overlay.classList.add('hidden');
}

/* ── Reset panel state on logout so next login starts clean ── */
function resetNotifPanel() {
  notifPanelOpen = false;
  closeNotifPanel();
}

function renderNotifList() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  const s = getState();
  const notifs = s.notifications || [];

  if (notifs.length === 0) {
    list.innerHTML = '<div class="notif-empty">🔔 No notifications yet.</div>';
    return;
  }

  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-icon">${getNotifIcon(n.text)}</div>
      <div class="notif-content">
        <div class="notif-text">${escapeHtml(n.text)}</div>
        <div class="notif-time">${relativeTime(n.time)}</div>
      </div>
    </div>
  `).join('');
}

function updateNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  const s = getState();
  const unread = (s.notifications || []).filter(n => !n.read).length;
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function getNotifIcon(text) {
  if (!text) return '🔔';
  const t = text.toLowerCase();
  if (t.includes('earn') || t.includes('task') || t.includes('complet')) return '🎉';
  if (t.includes('recharge') || t.includes('deposit'))  return '💳';
  if (t.includes('withdraw'))  return '💸';
  if (t.includes('purchas') || t.includes('bought'))    return '🛒';
  if (t.includes('referral') || t.includes('invite'))   return '🎁';
  if (t.includes('cashback'))  return '💰';
  return '🔔';
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
