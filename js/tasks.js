/* ============================================
   HONEYBEE — tasks.js
   Task Data, Filtering, Start/Complete
   + Honey Daily Return Tasks (24-hr claim)
   ============================================ */

/* No regular tasks — only honey daily return tasks are used */
const TASKS_DATA = [];

let activeHoneyTaskId = null;

function initTasks() {
  renderTasks();
}

/* ══════════════════════════════════════
   HONEY TASK HELPERS
══════════════════════════════════════ */

/**
 * Returns ms remaining until this honey task can be claimed again.
 * 0 or negative means it is claimable now.
 */
function honeyClaimCooldownMs(ht) {
  if (!ht.lastClaimedAt) return 0;            // never claimed → available immediately
  const elapsed = Date.now() - new Date(ht.lastClaimedAt).getTime();
  return Math.max(0, 24 * 60 * 60 * 1000 - elapsed);
}

/**
 * Format a ms duration as "Xh Ym" countdown.
 */
function formatCountdown(ms) {
  if (ms <= 0) return 'Ready to claim';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * For Oromia (skipSundays): check if today is Sunday.
 * If Sunday, task is blocked for the day.
 */
function isSundayBlock(ht) {
  if (!ht.skipSundays) return false;
  return new Date().getDay() === 0; // 0 = Sunday
}

/* ══════════════════════════════════════
   RENDER
══════════════════════════════════════ */
function renderTasks() {
  const s = getState();
  const list = document.getElementById('tasks-list');
  const countBadge = document.getElementById('tasks-count-badge');

  // Count honey tasks that are claimable right now
  const claimableHoney = (s.honeyTasks || []).filter(ht =>
    ht.daysRemaining > 0 &&
    honeyClaimCooldownMs(ht) <= 0 &&
    !isSundayBlock(ht)
  ).length;

  if (countBadge) countBadge.textContent = claimableHoney;

  if (!list) return;

  const honeyTasksHtml = buildHoneyTasksHtml(s);
  const honeyActive = (s.honeyTasks || []).some(ht => ht.daysRemaining > 0);

  if (!honeyActive) {
    list.innerHTML = `
      <div class="tasks-empty">
        <div class="tasks-empty-icon">🍯</div>
        <p>No active honey plans yet.<br>Buy a honey product to start earning daily returns!</p>
      </div>`;
    return;
  }

  list.innerHTML = honeyTasksHtml;
}

function buildHoneyTasksHtml(s) {
  const honeyTasks = (s.honeyTasks || []).filter(ht => ht.daysRemaining > 0);
  if (honeyTasks.length === 0) return '';

  const sectionHeader = `
    <div class="honey-tasks-section-header">
      🍯 Daily Honey Returns
    </div>`;

  const cards = honeyTasks.map(ht => {
    const cooldownMs = honeyClaimCooldownMs(ht);
    const sunday = isSundayBlock(ht);
    const claimable = cooldownMs <= 0 && !sunday;

    let statusLabel, statusClass, countdownStr;

    if (sunday) {
      statusLabel = '🚫 No claims on Sunday';
      statusClass = 'blocked';
      countdownStr = 'Come back tomorrow (Monday)';
    } else if (claimable) {
      statusLabel = '✅ Ready to Claim';
      statusClass = 'available';
      countdownStr = 'Tap to claim your daily reward';
    } else {
      statusLabel = '⏳ Next Claim';
      statusClass = 'pending';
      countdownStr = formatCountdown(cooldownMs);
    }

    const progress = Math.round(((ht.returnDays - ht.daysRemaining) / ht.returnDays) * 100);
    const daysDone  = ht.returnDays - ht.daysRemaining;

    return `
      <div class="task-card honey-task-card ${claimable ? 'claimable' : ''}"
           role="button" tabindex="0"
           aria-label="Honey return task: ${ht.productName}"
           onclick="openHoneyTaskDetail('${ht.id}')"
           onkeydown="if(event.key==='Enter') openHoneyTaskDetail('${ht.id}')">
        <div class="task-card-top">
          <div class="task-title">🍯 ${ht.productName} — Daily Return</div>
          <div class="task-reward">+${formatCurrency(ht.dailyReward)}</div>
        </div>
        <div class="task-desc">
          Claim your daily return for ${ht.productName}. 
          Day ${daysDone + 1} of ${ht.returnDays} · ${formatCurrency(ht.totalReturn)} total
          ${ht.skipSundays ? ' (Mon–Sat)' : ''}
        </div>
        <div class="honey-progress-bar-wrap">
          <div class="honey-progress-bar">
            <div class="honey-progress-fill" style="width:${progress}%"></div>
          </div>
          <span class="honey-progress-label">${daysDone}/${ht.returnDays} days</span>
        </div>
        <div class="task-meta">
          <div class="task-duration">⏱ ${countdownStr}</div>
          <div class="task-status ${statusClass}">${statusLabel}</div>
        </div>
      </div>`;
  }).join('');

  return sectionHeader + cards;
}

/* ══════════════════════════════════════
   HONEY TASK CLAIM MODAL
══════════════════════════════════════ */
function openHoneyTaskDetail(honeyTaskId) {
  const s = getState();
  const ht = (s.honeyTasks || []).find(x => x.id === honeyTaskId);
  if (!ht) return;

  activeHoneyTaskId = honeyTaskId;

  const cooldownMs = honeyClaimCooldownMs(ht);
  const sunday = isSundayBlock(ht);
  const claimable = cooldownMs <= 0 && !sunday && ht.daysRemaining > 0;
  const daysDone = ht.returnDays - ht.daysRemaining;

  document.getElementById('task-modal-title').textContent  = ht.productName + ' Return';
  document.getElementById('task-detail-icon').textContent  = '🍯';
  document.getElementById('task-detail-title').textContent = ht.productName + ' — Daily Return';
  document.getElementById('task-detail-desc').textContent  =
    `Claim your daily return of ${formatCurrency(ht.dailyReward)} for purchasing ${ht.productName}. ` +
    `You have ${ht.daysRemaining} day(s) remaining out of ${ht.returnDays}. ` +
    `Total earned so far: ${formatCurrency(daysDone * ht.dailyReward)} of ${formatCurrency(ht.totalReturn)}.` +
    (ht.skipSundays ? ' (No claims on Sundays)' : '');
  document.getElementById('task-detail-reward').textContent   = formatCurrency(ht.dailyReward) + '/day';
  document.getElementById('task-detail-duration').textContent = claimable
    ? 'Available now'
    : (sunday ? 'No claims on Sunday' : formatCountdown(cooldownMs));

  const progressWrap = document.getElementById('task-progress-wrap');
  const fill = document.getElementById('task-progress-fill');
  const pct  = document.getElementById('task-progress-pct');
  progressWrap.classList.add('hidden');
  if (fill) fill.style.width = '0%';
  if (pct)  pct.textContent  = '0%';

  const btn = document.getElementById('task-start-btn');
  if (claimable) {
    btn.textContent   = '💰 Claim ' + formatCurrency(ht.dailyReward);
    btn.disabled      = false;
    btn.style.opacity = '';
    btn.style.cursor  = '';
    btn.onclick       = claimHoneyTask;
  } else if (sunday) {
    btn.textContent   = '🚫 No Claims on Sunday';
    btn.disabled      = true;
    btn.style.opacity = '.6';
    btn.style.cursor  = 'not-allowed';
    btn.onclick       = null;
  } else if (ht.daysRemaining <= 0) {
    btn.textContent   = '✅ All Days Claimed';
    btn.disabled      = true;
    btn.style.opacity = '.6';
    btn.style.cursor  = 'not-allowed';
    btn.onclick       = null;
  } else {
    btn.textContent   = `⏳ Next in ${formatCountdown(cooldownMs)}`;
    btn.disabled      = true;
    btn.style.opacity = '.6';
    btn.style.cursor  = 'not-allowed';
    btn.onclick       = null;
  }

  openModal('modal-task');
}

function claimHoneyTask() {
  const s = getState();
  const ht = (s.honeyTasks || []).find(x => x.id === activeHoneyTaskId);
  if (!ht) return;

  // Double-check conditions
  if (honeyClaimCooldownMs(ht) > 0) {
    toast('Not ready yet! Wait for the 24-hour cooldown.', 'error');
    return;
  }
  if (isSundayBlock(ht)) {
    toast('No claims on Sundays for this product.', 'error');
    return;
  }
  if (ht.daysRemaining <= 0) {
    toast('All days have been claimed.', 'error');
    return;
  }

  const reward = ht.dailyReward;

  setState(prev => {
    const honeyTasks = (prev.honeyTasks || []).map(x => {
      if (x.id !== activeHoneyTaskId) return x;
      return {
        ...x,
        daysRemaining: x.daysRemaining - 1,
        daysClaimed:   (x.daysClaimed || 0) + 1,
        lastClaimedAt: new Date().toISOString()
      };
    });
    return {
      ...prev,
      balance:      (prev.balance      || 0) + reward,
      todayEarning: (prev.todayEarning || 0) + reward,
      totalEarned:  (prev.totalEarned  || 0) + reward,
      tasksDone:    (prev.tasksDone    || 0) + 1,
      honeyTasks
    };
  });

  addActivity('🍯', `Daily return: ${ht.productName}`, reward, 'credit');

  const updatedHt = getState().honeyTasks.find(x => x.id === activeHoneyTaskId);
  if (updatedHt && updatedHt.daysRemaining === 0) {
    addNotification(`🎉 You have fully claimed all returns for ${ht.productName}! Total earned: ${formatCurrency(ht.totalReturn)}.`);
    toast(`🎉 Final day claimed! ${formatCurrency(ht.totalReturn)} total returned for ${ht.productName}`, 'success');
  } else {
    addNotification(`💰 Daily return of ${formatCurrency(reward)} claimed for ${ht.productName}.`);
    toast(`+${formatCurrency(reward)} claimed! 🍯`, 'success');
  }

  renderAll();
  setTimeout(() => closeModal('modal-task'), 1000);
}


