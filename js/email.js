/* ============================================
   HONEYBEE — email.js
   Admin email notifications via local backend
   (Node.js + Nodemailer + Gmail SMTP)
   ============================================ */

// Point this at your running server.
// Locally: http://localhost:3001
// Deployed on Render/Railway: https://your-app.onrender.com
const EMAIL_SERVER_URL = 'https://honeybee-email-server.onrender.com';

/* ── Core send function — with retry ── */
async function sendAdminEmail(params) {
  const attempt = async () => {
    const res = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.status);
    }
    return true;
  };

  try {
    await attempt();
    console.log('HoneyBee: Admin email sent —', params.event_type);
  } catch (e1) {
    // Server may have been sleeping — wait 4s and retry once
    console.warn('HoneyBee: First attempt failed, retrying in 4s…', e1.message);
    await new Promise(r => setTimeout(r, 4000));
    try {
      await attempt();
      console.log('HoneyBee: Admin email sent (retry) —', params.event_type);
    } catch (e2) {
      console.warn('HoneyBee: Email failed after retry —', e2.message);
    }
  }
}

/* ── Keep server awake — ping every 10 minutes ── */
setInterval(() => {
  fetch(`${EMAIL_SERVER_URL}/health`).catch(() => {});
}, 10 * 60 * 1000);

// Also ping immediately on page load to wake the server early
fetch(`${EMAIL_SERVER_URL}/health`).catch(() => {});

/* ══════════════════════════════════════
   PUBLIC NOTIFICATION HELPERS
══════════════════════════════════════ */

/**
 * Called after a new user successfully registers.
 */
function notifyAdminNewUser(user) {
  sendAdminEmail({
    event_type:   '🐝 New User Registration',
    user_name:    user.name,
    user_phone:   '+251 ' + user.phone,
    detail_label: 'Referral Code',
    detail_value: user.referralCode || '—',
    extra_label:  'Referred By',
    extra_value:  user.referredBy ? 'Yes (another user)' : 'No'
  });
}

/**
 * Called after a user submits a deposit request.
 */
function notifyAdminDeposit(user, deposit) {
  sendAdminEmail({
    event_type:   '💳 New Deposit — Awaiting Verification',
    user_name:    user.name,
    user_phone:   '+251 ' + user.phone,
    detail_label: 'Amount',
    detail_value: 'ETB ' + Number(deposit.amount).toLocaleString(),
    extra_label:  'Payment Method & Reference',
    extra_value:  deposit.methodLabel + ' — Ref: ' + deposit.txnNumber
  });
}

/**
 * Called after a user initiates a withdrawal.
 */
function notifyAdminWithdrawal(user, withdrawal) {
  sendAdminEmail({
    event_type:   '💸 New Withdrawal Request',
    user_name:    user.name,
    user_phone:   '+251 ' + user.phone,
    detail_label: 'Amount to Pay',
    detail_value: 'ETB ' + Number(withdrawal.amount).toLocaleString(),
    extra_label:  withdrawal.methodLabel + ' Account',
    extra_value:  withdrawal.account
  });
}
