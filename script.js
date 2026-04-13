/* ══════════════════════════════════════════════════════════
   MSBAi Full-Year Tracker — Shared JS
   State is persisted per-page in localStorage.
   Keyed by data-page attribute on <body> so each module
   has independent checkbox state.
══════════════════════════════════════════════════════════ */

function toggleCourse(header) {
  header.parentElement.classList.toggle('open');
}

function togglePhase(head) {
  head.parentElement.classList.toggle('open');
}

function toggleCheck(el) {
  el.classList.toggle('checked');
  el.closest('.task-item').classList.toggle('done');
  updateProgress();
  saveState();
}

function storageKey() {
  const page = document.body.dataset.page || 'main';
  return 'msbai-tracker-' + page;
}

function updateProgress() {
  const bar = document.getElementById('progressBar');
  const pct = document.getElementById('progressPct');
  if (!bar || !pct) return;
  const total = document.querySelectorAll('.task-check').length;
  if (total === 0) {
    pct.textContent = '0%';
    bar.style.width = '0%';
    return;
  }
  const checked = document.querySelectorAll('.task-check.checked').length;
  const p = Math.round((checked / total) * 100);
  pct.textContent = p + '%';
  bar.style.width = p + '%';
}

function saveState() {
  const checks = [];
  document.querySelectorAll('.task-check').forEach(el => {
    checks.push(el.classList.contains('checked'));
  });
  localStorage.setItem(storageKey(), JSON.stringify(checks));
}

function loadState() {
  const saved = localStorage.getItem(storageKey());
  if (saved) {
    try {
      const checks = JSON.parse(saved);
      document.querySelectorAll('.task-check').forEach((el, i) => {
        if (checks[i]) {
          el.classList.add('checked');
          el.closest('.task-item').classList.add('done');
        }
      });
    } catch (e) { /* ignore parse errors */ }
  }
  updateProgress();
}

document.addEventListener('DOMContentLoaded', loadState);
