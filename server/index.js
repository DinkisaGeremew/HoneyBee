/* ============================================
   HoneyBee — Email Notification Server
   Node.js + Express + Gmail REST API
   (No SMTP — works on Render free tier)
   ============================================ */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const https   = require('https');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware ── */
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

/* ══════════════════════════════════════
   SEND EMAIL via Gmail REST API
   Uses Basic Auth with App Password
   No SMTP ports — pure HTTPS (port 443)
══════════════════════════════════════ */
function sendGmailREST({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;

    if (!user || !pass) {
      return reject(new Error('GMAIL_USER or GMAIL_PASS not set'));
    }

    // Build RFC 2822 email message
    const message = [
      `From: "HoneyBee 🐝" <${user}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html
    ].join('\r\n');

    // Base64url encode
    const encoded = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const body = JSON.stringify({ raw: encoded });

    // Basic auth: base64(user:pass)
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');

    const options = {
      hostname: 'gmail.googleapis.com',
      path:     '/gmail/v1/users/me/messages/send',
      method:   'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Gmail API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ── HTML email template ── */
function buildEmailHtml(data) {
  const colorMap = {
    '🐝 New User Registration':               '#F5A623',
    '💳 New Deposit — Awaiting Verification': '#3B82F6',
    '💸 New Withdrawal Request':              '#EF4444'
  };
  const accent = colorMap[data.event_type] || '#F5A623';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,${accent},${accent}cc);padding:28px 32px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🐝</div>
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">HoneyBee Admin Alert</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px;">${data.event_type}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:10px;padding:16px;margin-bottom:16px;">
              <tr><td style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;">User</td></tr>
              <tr><td style="font-size:16px;font-weight:800;color:#1A1A1A;">${data.user_name}</td></tr>
              <tr><td style="font-size:13px;color:#6B7280;padding-top:2px;">📞 ${data.user_phone}</td></tr>
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
                 style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,${accent},${accent}cc);color:#fff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;">
                Open Admin Panel
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#F9FAFB;text-align:center;font-size:11px;color:#9CA3AF;">
            HoneyBee Admin Notifications &nbsp;•&nbsp; Do not reply to this email
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ══════════════════════════════════════
   POST /send-email
══════════════════════════════════════ */
app.post('/send-email', async (req, res) => {
  const { event_type, user_name, user_phone,
          detail_label, detail_value, extra_label, extra_value } = req.body;

  if (!event_type || !user_name || !user_phone) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const emailData = {
    event_type, user_name, user_phone,
    detail_label: detail_label || '',
    detail_value: detail_value || '',
    extra_label:  extra_label  || '',
    extra_value:  extra_value  || '',
    timestamp
  };

  try {
    await sendGmailREST({
      to:      process.env.ADMIN_EMAIL,
      subject: `HoneyBee — ${event_type}`,
      html:    buildEmailHtml(emailData)
    });
    console.log(`✅ Email sent: ${event_type} for ${user_name}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ── Health check ── */
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'HoneyBee Email Server',
    gmail: process.env.GMAIL_USER || 'not configured'
  });
});

app.listen(PORT, () => {
  console.log(`🐝 HoneyBee email server running on port ${PORT}`);
  console.log(`📧 Sending emails to: ${process.env.ADMIN_EMAIL || 'not configured'}`);
});
