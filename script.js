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

/* ══════════════════════════════════════════════════════════
   v3 — Daivik's Command Deck · Dark Mode · Journey Ribbon
══════════════════════════════════════════════════════════ */

const THEME_KEY = 'msbai-theme';

const MODULES = [
  { n: 1, name: 'Intro Courses',        loc: 'NYC', start: '2026-04-06', end: '2026-05-29', when: 'Apr–May 26', credits: 5 },
  { n: 2, name: 'Data & Decisions',     loc: 'NYC', start: '2026-05-27', end: '2026-07-12', when: 'May–Jul 26', credits: 5 },
  { n: 3, name: 'ML & AI',              loc: 'NYC', start: '2026-07-13', end: '2026-09-27', when: 'Jul–Sep 26', credits: 6 },
  { n: 4, name: 'Analytics & Risk',     loc: 'NYC', start: '2026-09-28', end: '2026-12-20', when: 'Sep–Dec 26', credits: 6 },
  { n: 5, name: 'AI & Strategy',        loc: 'Abu Dhabi', start: '2027-02-01', end: '2027-04-18', when: 'Feb–Apr 27', credits: 6 },
  { n: 6, name: 'Capstone',             loc: 'NYC', start: '2027-04-19', end: '2027-05-11', when: 'Apr–May 27', credits: 6 },
];

const DEADLINES = [
  { date: '2026-07-12', label: 'Module 2 post-module — everything due' },
  { date: '2026-08-16', label: 'Module 3 pre-module due' },
  { date: '2026-08-17', label: 'Module 3 in-person week begins (NYC)' },
  { date: '2026-09-27', label: 'Module 3 post-module due' },
  { date: '2026-11-01', label: 'Module 4 pre-module due' },
  { date: '2026-11-02', label: 'Module 4 in-person week begins (NYC)' },
  { date: '2026-12-20', label: 'Module 4 post-module due' },
  { date: '2027-03-14', label: 'Module 5 pre-module due' },
  { date: '2027-03-15', label: 'Module 5 in-person begins (Abu Dhabi ✈)' },
  { date: '2027-04-18', label: 'Module 5 post-module due' },
  { date: '2027-05-10', label: 'Capstone final presentation (NYC)' },
  { date: '2027-05-11', label: 'Capstone final report — GRADUATION 🎓' },
];

function dToday() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
function dParse(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function daysUntil(s) { return Math.round((dParse(s) - dToday()) / 86400000); }

/* ── Theme ──────────────────────────────────────────────── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, cur); } catch (e) {}
  applyTheme(cur);
}
function initTheme() {
  let t = null;
  try { t = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const nav = document.querySelector('.nav');
  if (nav && !document.getElementById('themeToggle')) {
    const btn = document.createElement('button');
    btn.id = 'themeToggle';
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.onclick = toggleTheme;
    nav.appendChild(btn);
  }
  applyTheme(t);
}

/* ── Where am I in the program? ─────────────────────────── */
function currentModule() {
  const today = dToday();
  for (const m of MODULES) {
    if (today >= dParse(m.start) && today <= dParse(m.end)) return m;
  }
  return MODULES.find(m => today < dParse(m.start)) || MODULES[MODULES.length - 1];
}
function creditsBanked() {
  const today = dToday();
  return MODULES.filter(m => today > dParse(m.end)).reduce((a, m) => a + m.credits, 0);
}
function nextDeadline() {
  return DEADLINES.find(d => daysUntil(d.date) >= 0) || DEADLINES[DEADLINES.length - 1];
}

/* ── Command Deck (index only) ──────────────────────────── */
function buildDeck() {
  if (!document.body.matches('[data-page="index"]')) return;
  const anchor = document.querySelector('.progress-section');
  if (!anchor) return;

  const h = new Date().getHours();
  const greet = h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const cur = currentModule();
  const nd = nextDeadline();
  const ndDays = daysUntil(nd.date);
  const banked = creditsBanked();
  const totalCredits = MODULES.reduce((a, m) => a + m.credits, 0);
  const gradDays = daysUntil('2027-05-11');

  const deck = document.createElement('div');
  deck.className = 'deck';
  deck.innerHTML = `
    <div class="deck-card">
      <div class="deck-label">${greet}, Daivik</div>
      <div class="deck-value"><span class="deck-pulse"></span>Module ${cur.n}</div>
      <div class="deck-sub"><strong>${cur.name}</strong> · ${cur.loc} — you are here</div>
    </div>
    <div class="deck-card">
      <div class="deck-label">Next deadline</div>
      <div class="deck-value">${ndDays} <span class="unit">day${ndDays === 1 ? '' : 's'}</span></div>
      <div class="deck-sub">${nd.label}</div>
    </div>
    <div class="deck-card">
      <div class="deck-label">Credits banked</div>
      <div class="deck-value">${banked} <span class="unit">/ ${totalCredits}</span></div>
      <div class="deck-sub">${banked === 0 ? 'Module 1 grades pending — almost on the board' : 'Locked in. Keep stacking.'}</div>
    </div>
    <div class="deck-card">
      <div class="deck-label">Road to graduation</div>
      <div class="deck-value">${gradDays} <span class="unit">days</span></div>
      <div class="deck-sub">Jersey City → Gould Plaza → <strong>May 11, 2027</strong> 🎓</div>
    </div>`;

  const journey = document.createElement('div');
  journey.className = 'journey';
  journey.innerHTML = '<div class="journey-track">' + MODULES.map(m => {
    const today = dToday();
    const cls = today > dParse(m.end) ? 'done' : (m.n === cur.n ? 'now' : '');
    const mark = today > dParse(m.end) ? '✓' : m.n;
    return `<a class="journey-step ${cls}" href="module-${m.n}.html" style="text-decoration:none">
      <div class="journey-dot">${mark}</div>
      <div class="journey-name">M${m.n} · ${m.name}</div>
      <div class="journey-when">${m.when}</div>
      <span class="journey-loc${m.loc === 'Abu Dhabi' ? ' abu' : ''}">${m.loc}</span>
    </a>`;
  }).join('') + '</div>';

  anchor.after(journey);
  anchor.after(deck);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildDeck();
});
