/* ============================================
   HONEYBEE — products.js
   Honey Product Data, Buy Logic
   ============================================ */

const PRODUCTS_DATA = [
  {
    id: 'prod_001',
    name: 'Oromia Honey',
    region: 'Oromia Region',
    weight: '500g',
    price: 1000,
    dailyReward: 100,
    totalReturn: 500,
    returnDays: 15,
    skipSundays: true,           // Oromia: no reward on Sundays
    badge: 'Best Seller',
    badgeColor: '#F5A623',
    image: 'images/oromia-honey.svg',
    emoji: '🍯',
    description: 'Premium honey sourced from the lush highlands of Oromia. Known for its rich golden color and floral sweetness, this honey is harvested by local beekeepers using traditional methods.'
  },
  {
    id: 'prod_002',
    name: 'Tigray Honey',
    region: 'Tigray Region',
    weight: '500g',
    price: 3000,
    dailyReward: 300,
    totalReturn: 4500,
    returnDays: 15,
    skipSundays: false,
    badge: 'Raw & Pure',
    badgeColor: '#CC2200',
    image: 'images/tigray-honey.svg',
    emoji: '🫙',
    description: 'Unprocessed raw honey from the ancient highlands of Tigray. Cold-extracted to preserve all natural enzymes, antioxidants, and nutrients. A true artisan product.'
  },
  {
    id: 'prod_003',
    name: 'Sidama Honey',
    region: 'Sidama Region',
    weight: '1kg',
    price: 5000,
    dailyReward: 500,
    totalReturn: 7500,
    returnDays: 15,
    skipSundays: false,
    badge: 'Wildflower',
    badgeColor: '#2E7D32',
    image: 'images/sidama-honey.svg',
    emoji: '🌸',
    description: 'A delightful wildflower honey from Sidama\'s diverse ecosystems. Bees collect nectar from hundreds of wild plant species, creating a complex, multi-layered flavor profile.'
  },
  {
    id: 'prod_004',
    name: 'Debub Honey',
    region: 'Southern Ethiopia',
    weight: '1kg',
    price: 10000,
    dailyReward: 1000,
    totalReturn: 15000,
    returnDays: 15,
    skipSundays: false,
    badge: 'Premium',
    badgeColor: '#6A1B9A',
    image: 'images/debub-honey.svg',
    emoji: '👑',
    description: 'Our finest selection — premium single-origin honey from Southern Ethiopia\'s pristine forests. Slow-harvested, naturally filtered, and aged for maximum depth of flavor. A collector\'s honey.'
  }
];

let activeProductId = null;
let searchQuery = '';

function initProducts() {
  const searchInput = document.getElementById('product-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const s = getState();
  const filtered = PRODUCTS_DATA.filter(p =>
    p.name.toLowerCase().includes(searchQuery) ||
    p.region.toLowerCase().includes(searchQuery)
  );

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="products-empty">🔍 No products found for "${searchQuery}"</div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const owned = (s.honeyTasks || []).some(ht => ht.productId === p.id && ht.daysRemaining > 0);
    return `
    <div class="product-card"
         role="button" tabindex="0"
         aria-label="View ${p.name} details"
         onclick="openProductDetail('${p.id}')"
         onkeydown="if(event.key==='Enter') openProductDetail('${p.id}')">
      <div class="product-img-wrap">
        <img src="${p.image}"
             alt="${p.name} — ${p.region}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div class="product-img-fallback" style="display:none">${p.emoji}</div>
        <div class="product-badge" style="background:${p.badgeColor}">${p.badge}</div>
        ${owned ? '<div class="product-owned-badge">✅ Owned</div>' : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-region">📍 ${p.region}</div>
        <div class="product-weight">⚖️ ${p.weight}</div>
        <div class="product-price">${formatCurrency(p.price)}</div>
        <div class="product-cashback">+${formatCurrency(p.dailyReward)}/day · ${formatCurrency(p.totalReturn)} in ${p.returnDays} days</div>
        <button class="btn-buy-now"
                aria-label="Buy ${p.name}"
                onclick="event.stopPropagation(); buyProduct('${p.id}')">
          🛒 Buy Now
        </button>
      </div>
    </div>`;
  }).join('');
}

function openProductDetail(productId) {
  const p = PRODUCTS_DATA.find(x => x.id === productId);
  if (!p) return;
  activeProductId = productId;

  const s = getState();
  const owned = (s.honeyTasks || []).some(ht => ht.productId === p.id && ht.daysRemaining > 0);

  // Populate modal
  const img = document.getElementById('product-detail-img');
  if (img) {
    img.src = p.image;
    img.alt = p.name + ' — ' + p.region;
    img.onerror = function() {
      this.style.display = 'none';
      const fb = document.getElementById('product-detail-emoji');
      if (fb) { fb.style.display = 'flex'; fb.textContent = p.emoji; }
    };
    img.style.display = '';
    const fb2 = document.getElementById('product-detail-emoji');
    if (fb2) fb2.style.display = 'none';
  }

  const badge = document.getElementById('product-detail-badge');
  if (badge) {
    badge.textContent = p.badge;
    badge.style.background = p.badgeColor;
  }

  setEl('product-detail-name',     p.name);
  setEl('product-detail-region',   '📍 ' + p.region);
  setEl('product-detail-desc',     p.description);
  setEl('product-detail-weight',   p.weight);
  setEl('product-detail-price',    formatCurrency(p.price));
  setEl('product-detail-cashback',
    `+${formatCurrency(p.dailyReward)}/day — ${formatCurrency(p.totalReturn)} total in ${p.returnDays} days` +
    (p.skipSundays ? ' (Mon–Sat only)' : ''));
  setEl('product-modal-title',     p.name);

  // Update buy button label if already owned
  const buyBtn = document.getElementById('product-buy-btn');
  if (buyBtn) {
    if (owned) {
      buyBtn.textContent = '✅ Already Owned';
      buyBtn.disabled = true;
      buyBtn.style.opacity = '.6';
      buyBtn.style.cursor = 'not-allowed';
    } else {
      buyBtn.textContent = '🛒 Buy Now';
      buyBtn.disabled = false;
      buyBtn.style.opacity = '';
      buyBtn.style.cursor = '';
    }
  }

  openModal('modal-product');
}

function buyProduct(productId) {
  const p = PRODUCTS_DATA.find(x => x.id === productId);
  if (!p) return;

  const s = getState();

  // Prevent duplicate active ownership
  const alreadyOwned = (s.honeyTasks || []).some(ht => ht.productId === p.id && ht.daysRemaining > 0);
  if (alreadyOwned) {
    toast(`You already own an active ${p.name} plan`, 'error');
    return;
  }

  if (s.balance < p.price) {
    toast(`Insufficient balance. You need ${formatCurrency(p.price)}`, 'error');
    return;
  }

  // Deduct purchase price immediately
  setState(prev => ({
    ...prev,
    balance: prev.balance - p.price,
    honeyTasks: [
      ...(prev.honeyTasks || []),
      {
        id: generateId(),
        productId: p.id,
        productName: p.name,
        dailyReward: p.dailyReward,
        totalReturn: p.totalReturn,
        returnDays: p.returnDays,
        skipSundays: p.skipSundays,
        daysRemaining: p.returnDays,
        daysClaimed: 0,
        lastClaimedAt: null,      // null = never claimed
        purchasedAt: new Date().toISOString()
      }
    ]
  }));

  addActivity('🛒', `Bought ${p.name}`, p.price, 'debit');
  addNotification(
    `🛒 You purchased ${p.name} for ${formatCurrency(p.price)}. ` +
    `Earn ${formatCurrency(p.dailyReward)}/day for ${p.returnDays} days. ` +
    `Go to Tasks → Daily Honey Returns to claim!`
  );

  closeModal('modal-product');
  renderAll();
  toast(`${p.name} purchased! 🎉 Claim ${formatCurrency(p.dailyReward)}/day in Tasks`, 'success');
}

function buyActiveProduct() {
  if (activeProductId) buyProduct(activeProductId);
}

/* ── Helper ── */
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
