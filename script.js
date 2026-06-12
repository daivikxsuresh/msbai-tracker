/* ══════════════════════════════════════════════════════════
   MSBAi Full-Year Tracker — Shared JS v2
   State is stored by task-text ID in a single localStorage
   key so checkboxes sync across index.html and module pages.
   DO NOT change taskId() — it would orphan all saved progress.
══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'msbai-tracker-tasks';
const LEGACY_INDEX_KEY = 'msbai-tracker'; // old index.html positional array

function toggleCourse(header) {
  header.parentElement.classList.toggle('open');
}

function togglePhase(head) {
  head.parentElement.classList.toggle('open');
}

function toggleCheck(el) {
  el.classList.toggle('checked');
  el.closest('.task-item').classList.toggle('done');
  if (el.classList.contains('checked')) {
    el.classList.add('just-checked');
    setTimeout(() => el.classList.remove('just-checked'), 400);
  } else {
    el.classList.remove('just-checked');
  }
  updateProgress(true);
  saveState();
  showToast(el.classList.contains('checked'));
}

function taskId(checkEl) {
  const textEl = checkEl.closest('.task-item')?.querySelector('.task-text');
  if (!textEl) return null;
  return textEl.textContent.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/* ── Safe storage access (private mode / quota) ─────────── */
function readStore(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch (e) { return null; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}

/* ── Animated percentage count-up ───────────────────────── */
const pctAnims = new WeakMap();
function animatePct(labelEl, target) {
  const from = parseInt(labelEl.textContent, 10) || 0;
  if (from === target) { labelEl.textContent = target + '%'; return; }
  if (pctAnims.has(labelEl)) cancelAnimationFrame(pctAnims.get(labelEl));
  const dur = 500, t0 = performance.now();
  function step(now) {
    const t = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    labelEl.textContent = Math.round(from + (target - from) * eased) + '%';
    if (t < 1) pctAnims.set(labelEl, requestAnimationFrame(step));
  }
  pctAnims.set(labelEl, requestAnimationFrame(step));
}

function updateProgress(animate) {
  const bar = document.getElementById('progressBar');
  const pct = document.getElementById('progressPct');
  if (bar && pct) {
    const total = document.querySelectorAll('.task-check').length;
    const checked = document.querySelectorAll('.task-check.checked').length;
    const p = total === 0 ? 0 : Math.round((checked / total) * 100);
    if (animate) animatePct(pct, p); else pct.textContent = p + '%';
    bar.style.width = p + '%';
  }
  document.querySelectorAll('.phase[data-section]').forEach(section => {
    const total = section.querySelectorAll('.task-check').length;
    const checked = section.querySelectorAll('.task-check.checked').length;
    const p = total === 0 ? 0 : Math.round((checked / total) * 100);
    const fill = section.querySelector('.phase-mini-bar-fill');
    const label = section.querySelector('.phase-mini-pct');
    if (fill) fill.style.width = p + '%';
    if (label) label.textContent = p + '%';
  });
}

/* ── Save feedback toast ────────────────────────────────── */
let toastTimer = null;
function showToast(wasChecked) {
  let toast = document.getElementById('saveToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'saveToast';
    toast.className = 'save-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  const total = document.querySelectorAll('.task-check').length;
  const checked = document.querySelectorAll('.task-check.checked').length;
  const allDone = total > 0 && checked === total;
  toast.classList.toggle('complete', allDone);
  toast.innerHTML = allDone
    ? '<span class="toast-check">✓</span> 100% complete — LFG! 🎓'
    : '<span class="toast-check">✓</span> ' + (wasChecked ? 'Saved' : 'Unchecked & saved') +
      ' · ' + checked + '/' + total;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), allDone ? 3200 : 1600);
}

function saveState() {
  const state = readStore(STORAGE_KEY) || {};
  document.querySelectorAll('.task-check').forEach(el => {
    const id = taskId(el);
    if (id) state[id] = el.classList.contains('checked');
  });
  writeStore(STORAGE_KEY, state);
}

/* One-time migration: the old index.html stored a positional
   boolean array under LEGACY_INDEX_KEY. Task order on index is
   unchanged, so map array positions onto today's checkboxes,
   then fold into the shared slug-keyed store and remove. */
function migrateLegacyIndexState() {
  if (!document.body.matches('[data-page="index"]')) return;
  const legacy = readStore(LEGACY_INDEX_KEY);
  if (!Array.isArray(legacy)) return;
  const checks = document.querySelectorAll('.task-check');
  legacy.forEach((on, i) => {
    if (on && checks[i]) {
      checks[i].classList.add('checked');
      checks[i].closest('.task-item').classList.add('done');
    }
  });
  saveState();
  try { localStorage.removeItem(LEGACY_INDEX_KEY); } catch (e) {}
}

/* Only ADDS checked state, never removes — hardcoded
   `checked` in the HTML must always survive a load. */
function applyState() {
  const state = readStore(STORAGE_KEY) || {};
  document.querySelectorAll('.task-check').forEach(el => {
    const id = taskId(el);
    if (id && state[id]) {
      el.classList.add('checked');
      el.closest('.task-item').classList.add('done');
    } else if (el.classList.contains('checked')) {
      el.closest('.task-item').classList.add('done');
    }
  });
}

function loadState() {
  migrateLegacyIndexState();
  applyState();
  updateProgress(false);
  saveState(); // persist any hardcoded HTML checked states to shared storage
}

/* Cross-tab sync: if the tracker is open in two tabs, reflect
   changes from the other tab live. */
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    applyState();
    updateProgress(true);
  }
});

document.addEventListener('DOMContentLoaded', loadState);
