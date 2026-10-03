/* ============================================
   HONEYBEE — email.js
   Admin email notifications via EmailJS
   (Runs in browser — no server, no sleep issues)

   SETUP (one-time, 5 minutes):
   1. Go to https://emailjs.com → Sign Up Free
   2. Add Service → Gmail → connect dinkisa1212@gmail.com
      → copy Service ID  → paste as EMAILJS_SERVICE_ID
   3. Create Template → copy Template ID → paste as EMAILJS_TEMPLATE_ID
      Template body should contain:
        Event: {{event_type}}
        User: {{user_name}} / {{user_phone}}
        {{detail_label}}: {{detail_value}}
        {{extra_label}}: {{extra_value}}
        Time: {{timestamp}}
   4. Account → API Keys → copy Public Key → paste as EMAILJS_PUBLIC_KEY
   ============================================ */

const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';
const ADMIN_EMAIL         = 'dinkisa1212@gmail.com';

/* ── Load EmailJS SDK once ── */
let _ejsReady = false;
function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (_ejsReady) return resolve();
    if (window.emailjs && typeof window.emailjs.send === 'function') {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      _ejsReady = true;
      return resolve();
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = () => {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      _ejsReady = true;
      resolve();
    };
    s.onerror = () => reject(new Error('EmailJS SDK failed to load'));
    document.head.appendChild(s);
  });
}

/* ── Core send ── */
async function sendAdminEmail(params) {
  if (
    EMAILJS_SERVICE_ID  === 'YOUR_SERVICE_ID'  ||
    EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' ||
    EMAILJS_PUBLIC_KEY  === 'YOUR_PUBLIC_KEY'
  ) {
    console.warn('HoneyBee: EmailJS not configured yet.');
    return;
  }
  try {
    await loadEmailJS();
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email:    ADMIN_EMAIL,
      timestamp:   new Date().toLocaleString('en-US', {
        month:'short', day:'numeric', year:'numeric',
        hour:'2-digit', minute:'2-digit'
      }),
      ...params
    });
    console.log('HoneyBee: email sent —', params.event_type);
  } catch (err) {
    console.warn('HoneyBee: email failed —', err);
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
