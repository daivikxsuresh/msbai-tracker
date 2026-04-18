/* ══════════════════════════════════════════════════════════
   MSBAi Full-Year Tracker — Shared JS
   State is stored by task-text ID in a single localStorage
   key so checkboxes sync across index.html and module pages.
══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'msbai-tracker-tasks';

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

function taskId(checkEl) {
  const textEl = checkEl.closest('.task-item')?.querySelector('.task-text');
  if (!textEl) return null;
  return textEl.textContent.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function updateProgress() {
  const bar = document.getElementById('progressBar');
  const pct = document.getElementById('progressPct');
  if (bar && pct) {
    const total = document.querySelectorAll('.task-check').length;
    if (total === 0) {
      pct.textContent = '0%';
      bar.style.width = '0%';
    } else {
      const checked = document.querySelectorAll('.task-check.checked').length;
      const p = Math.round((checked / total) * 100);
      pct.textContent = p + '%';
      bar.style.width = p + '%';
    }
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

function saveState() {
  const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  document.querySelectorAll('.task-check').forEach(el => {
    const id = taskId(el);
    if (id) state[id] = el.classList.contains('checked');
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  document.querySelectorAll('.task-check').forEach(el => {
    const id = taskId(el);
    if (id && state[id]) {
      el.classList.add('checked');
      el.closest('.task-item').classList.add('done');
    }
  });
  updateProgress();
  saveState(); // persist any hardcoded HTML checked states to shared storage
}

document.addEventListener('DOMContentLoaded', loadState);
