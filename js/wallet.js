/* ============================================
   HONEYBEE — wallet.js
   Recharge (CBE / Telebirr), Withdraw Logic
   ============================================ */

/* Payment methods with account details */
const PAYMENT_METHODS = {
  cbe: {
    label: 'CBE (Commercial Bank of Ethiopia)',
    icon: '🏦',
    accountNumber: '1000345140798',
    accountName: 'Dinkisa Geremew',
    hint: 'Transfer to CBE account and enter your transaction reference number below.'
  },
  telebirr: {
    label: 'Telebirr',
    icon: '📱',
    accountNumber: '0927333140',
    accountName: 'Dinkisa Geremew',
    hint: 'Send via Telebirr and enter your transaction reference number below.'
  }
};

function initWallet() {
  initRechargeModal();
  initWithdrawModal();
}

/* ══════════════════════════════════════
   RECHARGE MODAL
══════════════════════════════════════ */
function initRechargeModal() {
  const presets     = [500, 1000, 2000, 5000];
  const presetWrap  = document.getElementById('recharge-presets');
  const amountInput = document.getElementById('recharge-amount');
  const confirmBtn  = document.getElementById('recharge-confirm-btn');

  /* -- build preset buttons -- */
  if (presetWrap) {
    presetWrap.innerHTML = '';
    presets.forEach(val => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-btn';
      btn.textContent = 'ETB ' + val.toLocaleString();
      btn.addEventListener('click', () => {
        if (amountInput) amountInput.value = val;
        presetWrap.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      presetWrap.appendChild(btn);
    });
  }

  if (amountInput) {
    amountInput.addEventListener('input', () => {
      if (presetWrap) presetWrap.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    });
  }

  /* -- method card selection -- */
  document.querySelectorAll('.recharge-method-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.recharge-method-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const method = card.dataset.method;
      renderPaymentDetails(method);
    });
  });

  /* -- screenshot file input label -- */
  const fileInput = document.getElementById('recharge-screenshot');
  const fileLabel = document.getElementById('screenshot-label');
  if (fileInput && fileLabel) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      fileLabel.textContent = file ? '📎 ' + file.name : '📎 Attach screenshot (optional)';
    });
  }

  /* -- submit -- */
  if (confirmBtn) {
    confirmBtn.addEventListener('click', submitRecharge);
  }
}

function renderPaymentDetails(method) {
  const info = PAYMENT_METHODS[method];
  const detailBox = document.getElementById('payment-detail-box');
  if (!detailBox || !info) return;

  detailBox.innerHTML = `
    <div class="payment-detail-card">
      <div class="payment-detail-header">
        <span class="payment-detail-icon">${info.icon}</span>
        <span class="payment-detail-name">${info.label}</span>
      </div>
      <div class="payment-detail-row">
        <span class="payment-detail-label">Account Number</span>
        <span class="payment-detail-value" id="copy-account-num">${info.accountNumber}</span>
        <button class="copy-btn" type="button" onclick="copyPaymentDetail('${info.accountNumber}','Account number')">📋</button>
      </div>
      <div class="payment-detail-row">
        <span class="payment-detail-label">Account Name</span>
        <span class="payment-detail-value">${info.accountName}</span>
      </div>
      <p class="payment-detail-hint">${info.hint}</p>
    </div>`;
  detailBox.classList.remove('hidden');
}

async function copyPaymentDetail(text, label) {
  const ok = await copyToClipboard(text);
  toast(ok ? `✅ ${label} copied!` : 'Could not copy', ok ? 'success' : 'error');
}

function submitRecharge() {
  const amount  = parseFloat(document.getElementById('recharge-amount')?.value);
  const txnNum  = document.getElementById('recharge-txn')?.value.trim();
  const fileInput = document.getElementById('recharge-screenshot');

  const selectedCard = document.querySelector('.recharge-method-card.selected');
  const method = selectedCard ? selectedCard.dataset.method : null;

  if (!method)            return toast('Please select a payment method', 'error');
  if (!amount || amount < 100) return toast('Minimum deposit is ETB 100', 'error');
  if (!txnNum)            return toast('Please enter your transaction reference number', 'error');

  const methodInfo = PAYMENT_METHODS[method];

  /* Read screenshot as base64 if provided */
  const file = fileInput && fileInput.files[0] ? fileInput.files[0] : null;

  const finalize = (screenshotData) => {
    const s = getState();
    const deposit = {
      id: generateId(),
      userId: s.currentUser.id,
      userName: s.currentUser.name,
      userPhone: s.currentUser.phone,
      method: method,
      methodLabel: methodInfo.label,
      amount: amount,
      txnNumber: txnNum,
      screenshot: screenshotData || null,
      status: 'pending',     // 'pending' | 'approved' | 'rejected'
      submittedAt: new Date().toISOString(),
      reviewedAt: null
    };

    setState(prev => ({
      ...prev,
      deposits: [...(prev.deposits || []), deposit],
      pendingDeposits: (prev.pendingDeposits || 0) + 1
    }));

    addNotification(`⏳ Deposit of ${formatCurrency(amount)} via ${methodInfo.label} submitted — awaiting admin approval.`);

    // Notify admin by email
    const _s = getState();
    if (_s.currentUser) notifyAdminDeposit(_s.currentUser, deposit);

    /* Reset form */
    document.getElementById('recharge-amount').value = '';
    document.getElementById('recharge-txn').value = '';
    if (fileInput) { fileInput.value = ''; }
    const fileLabel = document.getElementById('screenshot-label');
    if (fileLabel) fileLabel.textContent = '📎 Attach screenshot (optional)';
    document.querySelectorAll('.recharge-method-card').forEach(c => c.classList.remove('selected'));
    const detailBox = document.getElementById('payment-detail-box');
    if (detailBox) detailBox.classList.add('hidden');
    const presetWrap = document.getElementById('recharge-presets');
    if (presetWrap) presetWrap.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));

    closeModal('modal-recharge');
    renderAll();
    toast('✅ Deposit submitted! Awaiting admin approval.', 'success');
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => finalize(e.target.result);
    reader.onerror = () => finalize(null);
    reader.readAsDataURL(file);
  } else {
    finalize(null);
  }
}

/* ══════════════════════════════════════
   WITHDRAW MODAL
══════════════════════════════════════ */
function initWithdrawModal() {
  const presets      = [500, 1000, 5000, 'all'];
  const presetWrap   = document.getElementById('withdraw-presets');
  const amountInput  = document.getElementById('withdraw-amount');
  const methodSelect = document.getElementById('withdraw-method');
  const accountInput = document.getElementById('withdraw-account');
  const confirmBtn   = document.getElementById('withdraw-confirm-btn');

  if (presetWrap) {
    presetWrap.innerHTML = '';
    presets.forEach(val => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-btn';
      btn.textContent = val === 'all' ? 'All' : 'ETB ' + val.toLocaleString();
      btn.addEventListener('click', () => {
        const s = getState();
        if (amountInput) amountInput.value = val === 'all' ? s.balance : val;
        presetWrap.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      presetWrap.appendChild(btn);
    });
  }

  if (amountInput) {
    amountInput.addEventListener('input', () => {
      if (presetWrap) presetWrap.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const s      = getState();
      const amount = parseFloat(amountInput?.value);
      const account = accountInput?.value.trim();
      const method  = methodSelect?.value;

      if (!amount || amount < 500) return toast('Minimum withdrawal is ETB 500', 'error');
      if (amount > s.balance)      return toast('Insufficient balance', 'error');
      if (!method)                 return toast('Please select withdrawal method', 'error');
      if (!account)                return toast('Please enter your account number', 'error');

      const methodLabel = methodSelect.options[methodSelect.selectedIndex].text;

      // Build withdrawal record
      const withdrawal = {
        id:          generateId(),
        userId:      s.currentUser.id,
        userName:    s.currentUser.name,
        userPhone:   s.currentUser.phone,
        amount:      amount,
        method:      method,
        methodLabel: methodLabel,
        account:     account,
        status:      'pending',   // 'pending' | 'completed'
        requestedAt: new Date().toISOString(),
        completedAt: null
      };

      // Deduct balance & persist withdrawal record
      setState(prev => ({
        ...prev,
        balance:     prev.balance - amount,
        withdrawals: [...(prev.withdrawals || []), withdrawal]
      }));

      addActivity('💸', `Withdrawal to ${methodLabel} (${account})`, amount, 'debit');
      addNotification(`⏳ Withdrawal of ${formatCurrency(amount)} to ${methodLabel} submitted — awaiting admin payment.`);

      // Notify admin by email
      notifyAdminWithdrawal(s.currentUser, withdrawal);

      if (amountInput)  amountInput.value  = '';
      if (accountInput) accountInput.value = '';
      if (methodSelect) methodSelect.value = '';
      if (presetWrap)   presetWrap.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));

      closeModal('modal-withdraw');
      renderAll();
      toast(`💸 Withdrawal submitted! Admin will process your payment shortly.`, 'success');
    });
  }
}

/* ── Open helpers ── */
function openRecharge() {
  /* Reset state on open */
  const detailBox = document.getElementById('payment-detail-box');
  if (detailBox) detailBox.classList.add('hidden');
  document.querySelectorAll('.recharge-method-card').forEach(c => c.classList.remove('selected'));
  openModal('modal-recharge');
}

function openWithdraw() {
  const s = getState();
  const balEl = document.getElementById('withdraw-balance-display');
  if (balEl) balEl.textContent = formatCurrency(s.balance);
  openModal('modal-withdraw');
}

/* ══════════════════════════════════════
   MY WITHDRAWALS MODAL
══════════════════════════════════════ */
function openMyWithdrawals() {
  renderMyWithdrawals();
  openModal('modal-my-withdrawals');
}

function renderMyWithdrawals() {
  const s = getState();
  const list = document.getElementById('my-withdrawals-list');
  if (!list) return;

  const withdrawals = (s.withdrawals || []).slice().reverse();

  if (withdrawals.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--bee-gray);font-size:13px;">No withdrawals yet.</div>`;
    return;
  }

  list.innerHTML = withdrawals.map(w => {
    const isPending   = w.status === 'pending';
    const badgeBg     = isPending ? '#FEF3C7' : '#DCFCE7';
    const badgeColor  = isPending ? '#92400E'  : '#15803D';
    const badgeText   = isPending ? '⏳ Pending' : '✅ Received';
    return `
      <div style="background:#F9FAFB;border-radius:12px;padding:14px 16px;margin-bottom:10px;
                  border-left:4px solid ${isPending ? '#F59E0B' : '#22C55E'};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:15px;font-weight:800;color:#1A1A1A;">${formatCurrency(w.amount)}</span>
          <span style="padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;
                       background:${badgeBg};color:${badgeColor};">${badgeText}</span>
        </div>
        <div style="font-size:12px;color:#6B7280;margin-bottom:3px;">📲 ${escapeHtml(w.methodLabel)}</div>
        <div style="font-size:12px;color:#6B7280;margin-bottom:3px;">🏦 ${escapeHtml(w.account)}</div>
        <div style="font-size:11px;color:#9CA3AF;">
          Requested: ${new Date(w.requestedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
          ${w.completedAt ? ` · Paid: ${new Date(w.completedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}` : ''}
        </div>
      </div>`;
  }).join('');
}
