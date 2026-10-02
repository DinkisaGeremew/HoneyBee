# 🐝 HoneyBee

**Earn. Grow. Thrive.**

HoneyBee is Ethiopia's mobile-first earn-and-shop platform. Complete micro-tasks to earn ETB, buy authentic Ethiopian honey with cashback, and invite friends to grow your income.

---

## ✨ Features

- **Earn** — Complete 6 tasks (watch ads, surveys, app downloads) to earn ETB
- **Shop** — Buy 4 premium Ethiopian honey products with 10% cashback
- **Deposit** — Fund your account via CBE or Telebirr with admin approval flow
- **Withdraw** — Cash out to CBE, Telebirr, Amhara Bank, or Mobile Money
- **Referrals** — Earn ETB 50 for every friend you invite
- **Notifications** — Real-time alerts for every action
- **PWA Ready** — Installable on Android/iOS

---

## 📁 Folder Structure

```
honeybee/
├── index.html                ← Main user app (single-page)
├── hb-admin-panel.html       ← Admin deposit management (private URL)
├── manifest.json             ← PWA manifest
├── favicon.svg               ← App icon
├── styles/
│   ├── main.css              ← Variables, reset, utilities
│   ├── auth.css              ← Login / register screen
│   ├── layout.css            ← Header, bottom nav, screens
│   ├── home.css              ← Balance card, stats, activity
│   ├── tasks.css             ← Task cards, filter tabs
│   ├── products.css          ← Honey grid, product cards
│   ├── profile.css           ← Profile header, menu
│   ├── modals.css            ← All modals, toast, confirm dialog
│   └── recharge.css          ← Deposit flow + admin panel styles
├── js/
│   ├── utils.js              ← State, toast, formatCurrency, helpers
│   ├── auth.js               ← Register, login, logout
│   ├── wallet.js             ← Deposit (CBE/Telebirr) + withdraw flows
│   ├── tasks.js              ← Task data, filtering, completion
│   ├── products.js           ← Product data, purchase flow
│   ├── notifications.js      ← Notification panel + badge
│   ├── profile.js            ← Edit profile, change password, deposits
│   └── app.js                ← Navigation, modal system, init
├── images/
│   ├── oromia-honey.svg
│   ├── tigray-honey.svg
│   ├── sidama-honey.svg
│   └── debub-honey.svg
└── README.md
```

---

## 🚀 How to Run Locally

No build step required — pure static site.

**Option 1 — Open directly:**
```
Double-click index.html
```

**Option 2 — Local server (recommended):**
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# VS Code — Live Server extension
Right-click index.html → Open with Live Server
```
Then open `http://localhost:8080`

---

## 🌍 How to Deploy

### Netlify (Recommended)
1. Go to [netlify.com](https://netlify.com) → New site
2. Drag-and-drop the entire `honeybee/` folder
3. Done — your site is live instantly
4. Point your domain at the Netlify URL

### Vercel
```bash
npx vercel --prod
```

### GitHub Pages
1. Push to a GitHub repo
2. Settings → Pages → Source: main branch / root
3. Live at `https://yourusername.github.io/honeybee`

---

## 🔐 Admin Panel

### Access URL
The admin panel is intentionally **not linked** anywhere in the user-facing app.

**Access it directly at:**
```
https://yourdomain.com/hb-admin-panel.html
```
Or locally:
```
http://localhost:8080/hb-admin-panel.html
```

**Bookmark this URL — do not share it publicly.**

### Login Credentials
```
Username : admin
Password : honeybee2024
```

> ⚠️ **Change the password before going live.**
> Open `hb-admin-panel.html`, find this line and update it:
> ```js
> const ADMIN_PASS = 'honeybee2024';
> ```

### Admin Capabilities
| Feature | Description |
|---|---|
| ⏳ Pending Deposits | Review all submitted deposit requests |
| ✅ Approve | Credits user balance + sends notification |
| ❌ Reject | Marks rejected + notifies user |
| 📷 Screenshot | View payment proof in fullscreen |
| 👥 Users | See all registered users + deposit status |
| 🔄 Auto-refresh | Panel refreshes every 30 seconds |

### How the Deposit Flow Works
1. User selects **CBE** or **Telebirr** in the deposit modal
2. App shows your exact account number and name to send to
3. User transfers money, enters the **transaction reference number** + optional screenshot
4. Deposit is saved as **pending** — user sees a yellow banner on their home screen
5. You open `hb-admin-panel.html` → Pending tab → Approve or Reject
6. On **Approve**: if user is currently logged in → balance credited instantly. If offline → balance credited next time they open the app.

---

## 💳 Payment Account Details

| Method | Account Number | Name |
|---|---|---|
| 🏦 CBE | `1000345140798` | Dinkisa Geremew |
| 📱 Telebirr | `0927333140` | Dinkisa Geremew |

> To update these, edit `js/wallet.js` → `PAYMENT_METHODS` object at the top of the file.

---

## 📋 Task Catalog

| Task | Reward | Duration |
|---|---|---|
| Watch Video Ad | ETB 50 | 30 sec |
| Complete Survey | ETB 150 | 2 min |
| App Download | ETB 200 | 1 min |
| Rate & Review | ETB 100 | 1 min |
| Share on Social | ETB 75 | 30 sec |
| Daily Login Bonus | ETB 25 | Instant |

---

## 🍯 Product Catalog

| Product | Region | Weight | Price | Cashback |
|---|---|---|---|---|
| Oromia Honey | Oromia | 500g | ETB 1,000 | ETB 100 |
| Tigray Honey | Tigray | 500g | ETB 2,000 | ETB 200 |
| Sidama Honey | Sidama | 1kg | ETB 5,000 | ETB 500 |
| Debub Honey | Southern Ethiopia | 1kg | ETB 8,000 | ETB 800 |

---

## 🔧 Customization

| What to change | Where |
|---|---|
| Payment account numbers | `js/wallet.js` → `PAYMENT_METHODS` |
| Admin password | `hb-admin-panel.html` → `const ADMIN_PASS` |
| Task list & rewards | `js/tasks.js` → `TASKS_DATA` |
| Product list & prices | `js/products.js` → `PRODUCTS_DATA` |
| App colors / theme | `styles/main.css` → `:root` variables |
| Minimum withdrawal | `js/wallet.js` → withdraw confirm handler |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| HTML | Vanilla HTML5 |
| CSS | Vanilla CSS3 (custom properties) |
| JS | Vanilla ES6+ (no frameworks) |
| Storage | localStorage (`honeybee_data`) |
| Icons | Emoji (no libraries) |
| Fonts | System UI stack |

---

## 📞 Support Contact

- Email: support@honeybee.app
- Help Center: honeybee.app/help
- Live Chat: Mon–Fri, 9AM–6PM

---

*HoneyBee — Supporting Ethiopian beekeepers, one jar at a time. 🍯*
