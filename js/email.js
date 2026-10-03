/* ============================================
   HONEYBEE — email.js
   Admin email notifications via Render server
   ============================================ */

const EMAIL_SERVER_URL = 'https://honeybee-email-server.onrender.com';

/* ── Wake server on page load ── */
fetch(EMAIL_SERVER_URL + '/health').catch(() => {});

/* ── Keep server awake — ping every 10 minutes ── */
setInterval(() => {
  fetch(EMAIL_SERVER_URL + '/health').catch(() => {});
}, 10 * 60 * 1000);

/* ── Core send with retry (handles Render cold start) ── */
async function sendAdminEmail(params) {
  const doSend = () => fetch(EMAIL_SERVER_URL + '/send-email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params)
  });

  try {
    // First attempt
    const res = await doSend();
    if (res.ok) {
      console.log('HoneyBee: email sent —', params.event_type);
      return;
    }
    throw new Error('Server returned ' + res.status);
  } catch (e1) {
    console.warn('HoneyBee: attempt 1 failed —', e1.message, '— retrying in 25s');
    await new Promise(r => setTimeout(r, 25000));
    try {
      const res2 = await doSend();
      if (res2.ok) {
        console.log('HoneyBee: email sent (retry) —', params.event_type);
      } else {
        console.warn('HoneyBee: retry failed — status', res2.status);
      }
    } catch (e2) {
      console.warn('HoneyBee: email failed after retry —', e2.message);
    }
  }
}

/* ══════════════════════════════════════
   NOTIFICATION HELPERS
══════════════════════════════════════ */

function notifyAdminNewUser(user) {
  sendAdminEmail({
    event_type:   '🐝 New User Registration',
    user_name:    user.name,
    user_phone:   '+251 ' + user.phone,
    detail_label: 'Referral Code',
    detail_value: user.referralCode || '—',
    extra_label:  'Referred By',
    extra_value:  user.referredBy ? 'Yes' : 'No'
  });
}

function notifyAdminDeposit(user, deposit) {
  sendAdminEmail({
    event_type:   '💳 New Deposit — Awaiting Verification',
    user_name:    user.name,
    user_phone:   '+251 ' + user.phone,
    detail_label: 'Amount',
    detail_value: 'ETB ' + Number(deposit.amount).toLocaleString(),
    extra_label:  'Method & Reference',
    extra_value:  deposit.methodLabel + ' — Ref: ' + deposit.txnNumber
  });
}

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
