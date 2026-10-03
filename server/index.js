/* ============================================
   HoneyBee — Email Notification Server
   Node.js + Express + Gmail via SMTP
   ============================================ */

require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

/* ══════════════════════════════════════
   Build transporter — tries port 587 first,
   falls back gracefully. All timeouts set
   so the request never hangs indefinitely.
══════════════════════════════════════ */
function makeTransporter() {
  return nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    },
    tls:              { rejectUnauthorized: false },
    connectionTimeout: 8000,   // 8s to connect
    greetingTimeout:   8000,   // 8s for EHLO
    socketTimeout:     10000,  // 10s per socket read
    pool:              false
  });
}

let transporter = makeTransporter();

transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP verify failed:', err.message);
    console.log('Rebuilding transporter…');
    transporter = makeTransporter();
  } else {
    console.log('✅ Gmail SMTP ready — emails → ' + process.env.ADMIN_EMAIL);
  }
});

/* ── HTML email template ── */
function buildEmailHtml(data) {
  const colors = {
    '🐝 New User Registration':               '#F5A623',
    '💳 New Deposit — Awaiting Verification': '#3B82F6',
    '💸 New Withdrawal Request':              '#EF4444'
  };
  const accent = colors[data.event_type] || '#F5A623';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
  <tr><td style="background:linear-gradient(135deg,${accent},${accent}bb);padding:28px 32px;text-align:center;">
    <div style="font-size:40px;line-height:1;">&#x1F41D;</div>
    <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:800;">HoneyBee Admin Alert</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px;">${data.event_type}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;padding:16px;margin-bottom:16px;">
      <tr><td style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;">User</td></tr>
      <tr><td style="font-size:16px;font-weight:800;color:#1A1A1A;">${data.user_name}</td></tr>
      <tr><td style="font-size:13px;color:#6B7280;padding-top:2px;">+251 ${data.user_phone}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
        <span style="font-size:12px;color:#6B7280;">${data.detail_label}</span><br/>
        <strong style="font-size:15px;color:#1A1A1A;">${data.detail_value}</strong>
      </td></tr>
      ${data.extra_label ? `<tr><td style="padding:10px 0;border-bottom:1px solid #F3F4F6;">
        <span style="font-size:12px;color:#6B7280;">${data.extra_label}</span><br/>
        <strong style="font-size:15px;color:#1A1A1A;">${data.extra_value}</strong>
      </td></tr>` : ''}
      <tr><td style="padding:10px 0;">
        <span style="font-size:12px;color:#6B7280;">Time</span><br/>
        <strong style="font-size:13px;color:#6B7280;">${data.timestamp}</strong>
      </td></tr>
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="${process.env.ADMIN_PANEL_URL || '#'}"
         style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,${accent},${accent}bb);color:#fff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;">
        Open Admin Panel
      </a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#F9FAFB;text-align:center;font-size:11px;color:#9CA3AF;">
    HoneyBee Admin Notifications &nbsp;|&nbsp; Do not reply to this email
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

/* ── Wrap sendMail with a hard 15s timeout ── */
function sendWithTimeout(mailOptions) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sendMail timeout after 15s')), 15000);
    transporter.sendMail(mailOptions, (err, info) => {
      clearTimeout(timer);
      if (err) reject(err); else resolve(info);
    });
  });
}

/* ══════════════════════════════════════
   POST /send-email
══════════════════════════════════════ */
app.post('/send-email', async (req, res) => {
  // Set response timeout so the request never hangs for the caller
  res.setTimeout(20000, () => {
    if (!res.headersSent) res.status(504).json({ ok: false, error: 'Request timed out' });
  });

  const { event_type, user_name, user_phone,
          detail_label, detail_value, extra_label, extra_value } = req.body;

  if (!event_type || !user_name || !user_phone)
    return res.status(400).json({ ok: false, error: 'Missing required fields' });

  const timestamp = new Date().toLocaleString('en-US', {
    month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'
  });

  const mailOptions = {
    from:    '"HoneyBee Admin" <' + process.env.GMAIL_USER + '>',
    to:      process.env.ADMIN_EMAIL,
    subject: 'HoneyBee — ' + event_type,
    html:    buildEmailHtml({
      event_type, user_name, user_phone,
      detail_label: detail_label || '',
      detail_value: detail_value || '',
      extra_label:  extra_label  || '',
      extra_value:  extra_value  || '',
      timestamp
    })
  };

  try {
    await sendWithTimeout(mailOptions);
    console.log('✅ Email sent:', event_type, 'for', user_name);
    if (!res.headersSent) res.json({ ok: true });
  } catch (err) {
    console.error('❌ Email error:', err.message);
    // Rebuild transporter for next request
    transporter = makeTransporter();
    if (!res.headersSent) res.status(500).json({ ok: false, error: err.message });
  }
});

/* ── Health check ── */
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'HoneyBee Email Server', admin: process.env.ADMIN_EMAIL || 'not set' });
});

/* ── Self-ping every 13 minutes to prevent Render sleep ── */
const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'https://honeybee-email-server.onrender.com';
setInterval(() => {
  const https = require('https');
  https.get(SELF_URL + '/health', r => {
    console.log('🔄 Keep-alive ping:', r.statusCode);
  }).on('error', e => console.warn('Keep-alive failed:', e.message));
}, 13 * 60 * 1000);

app.listen(PORT, () => {
  console.log('HoneyBee email server on port', PORT);
  console.log('Admin email:', process.env.ADMIN_EMAIL || 'NOT SET');
  console.log('Gmail user:', process.env.GMAIL_USER || 'NOT SET');
});
