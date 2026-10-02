/* ============================================
   HONEYBEE — email.js
   Admin email notifications via local backend
   (Node.js + Nodemailer + Gmail SMTP)
   ============================================ */

// Point this at your running server.
// Locally: http://localhost:3001
// Deployed on Render/Railway: https://your-app.onrender.com
const EMAIL_SERVER_URL = 'https://honeybee-email-server.onrender.com';

/* ── Core send function ── */
async function sendAdminEmail(params) {
  try {
    const res = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('HoneyBee: Email server error —', err.error || res.status);
    } else {
      console.log('HoneyBee: Admin email sent —', params.event_type);
    }
  } catch (err) {
    // Server not running or network error — never crash the app
    console.warn('HoneyBee: Could not reach email server —', err.message);
  }
}

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
