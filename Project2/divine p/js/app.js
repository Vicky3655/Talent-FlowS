

function debounce(fn, delay) {
  let id;
  return function (...args) {
    clearTimeout(id);
    id = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function storageSet(key, value) {
  try { localStorage.setItem('talentflow_' + key, value); } catch (e) {}
}

function storageGet(key, def) {
  try {
    const v = localStorage.getItem('talentflow_' + key);
    return v !== null ? v : def;
  } catch (e) { return def; }
}

/* ── STATE ──────────────────────────────────────────────────── */

const state = {
  currentModule: '2',       // '2' | '3' | '4'
  currentLessonId: 'm2-l1',
  pdfPage: 1,
  pdfTotal: 32,
  lessonOneRead: false,     // panel-2 (PDF) visited
  lessonTwoComplete: false, // panel-3 "Mark As Complete" clicked
  toastTimer: null,
  isTabVisible: true,
  readProgress: 0,
};

/* ── CURRICULUM / LESSON DATA ───────────────────────────────── */

// Flat list used for Prev / Next navigation
const ALL_LESSONS = [
  { id: 'm2-l1', title: 'Lesson Content',              module: '2' },
  { id: 'm3-l1', title: 'Understanding Grid Systems',  module: '3' },
  { id: 'm3-l2', title: 'Typography in UI Design',     module: '3' },
  { id: 'm3-l3', title: 'Color Theory & Systems',      module: '3' },
  { id: 'm3-l4', title: 'Component Design Patterns',   module: '3' },
  { id: 'm3-l5', title: 'Design Handoff & Dev Collab', module: '3' },
];

// Content swapped into panel-3 when the user navigates lessons
const LESSON_CONTENT = {
  'm2-l1': { title: 'Lesson Content — Module 3',        badge: '32 pages',   body: '' },
  'm3-l1': { title: 'Understanding Grid Systems',        badge: '7 min read', body: '<h2 class="section-h">3.1 The 8pt Grid</h2><p>The 8-point grid is a design system where all spacing, sizing and layout decisions are based on multiples of 8. This creates visual rhythm and makes it easy to maintain consistency across different screen densities.</p>' },
  'm3-l2': { title: 'Typography in UI Design',           badge: '6 min read', body: '<h2 class="section-h">3.2 Type Scale</h2><p>A consistent type scale is the backbone of readable interfaces. Using a modular scale — such as a 1.25 ratio — ensures that every heading and body size relates harmoniously to the others.</p>' },
  'm3-l3': { title: 'Color Theory & Systems',            badge: '8 min read', body: '<h2 class="section-h">3.3 Color Systems</h2><p>Color systems define primary, secondary and semantic tokens. A well-structured palette separates hue from purpose, making it trivial to introduce dark-mode or rebrand later.</p>' },
  'm3-l4': { title: 'Component Design Patterns',         badge: '9 min read', body: '<h2 class="section-h">3.4 Atomic Design</h2><p>Atomic design breaks UI into atoms, molecules, organisms, templates and pages. This hierarchy keeps components composable and reusable across your entire product.</p>' },
  'm3-l5': { title: 'Design Handoff & Dev Collaboration',badge: '5 min read', body: '<h2 class="section-h">3.5 Handoff Checklist</h2><p>A great handoff includes annotated specs, a living design token file and agreed component inventory. Reduce back-and-forth by shipping Figma links alongside Storybook references.</p>' },
};

/* ── DOM CACHE ──────────────────────────────────────────────── */

let dom = {};

function cacheDom() {
  const ids = [
    'panel-2','panel-3','panel-4',
    'tab-2','tab-3','tab-4',
    'bc-current',
    'pdfFrame','pdfPageImage','pdfPageNumber','pdfPageBadge',
    'curPage','totPages','pdfPrev','pdfNext',
    'readFill','readPct',
    'mp-pct','mp-pct-3','mp-pct-4',
    'mp-fill','mp-fill-3','mp-fill-4',
    'completeBtn','toast',
    'list-curr-2','list-curr-3','list-curr-4',
    'arr-curr-2','arr-curr-3','arr-curr-4',
    'curr-2','curr-3','curr-4',
    'lockOverlay',
  ];
  ids.forEach(id => { dom[id] = document.getElementById(id); });
}

function $(id) { return dom[id]; }

/* ── COMPLETION GUARD ───────────────────────────────────────── */

/**
 * Returns true when the student has done everything required
 * before the Completion page is accessible:
 *   1. Visited the PDF panel (panel-2)
 *   2. Clicked "Mark As Complete" on the reading panel (panel-3)
 */
function completionUnlocked() {
  return state.lessonOneRead && state.lessonTwoComplete;
}

/**
 * Visually lock / unlock the Completion tab and update its tooltip.
 */
function syncCompletionTabLock() {
  const tab4 = $('tab-4');
  if (!tab4) return;

  if (completionUnlocked()) {
    tab4.disabled = false;
    tab4.classList.remove('locked');
    tab4.title = '';
    tab4.setAttribute('aria-disabled', 'false');
  } else {
    tab4.disabled = true;
    tab4.classList.add('locked');
    tab4.title = 'Complete all lessons first';
    tab4.setAttribute('aria-disabled', 'true');
  }
}

/* ── CURRICULUM BUILD ───────────────────────────────────────── */

function buildCurricula() {
  [2, 3, 4].forEach(modNum => {
    const ul = $(`list-curr-${modNum}`);
    if (!ul) return;
    ul.innerHTML = '';

    ALL_LESSONS.forEach(lesson => {
      // Panel 2 shows only module-2 lesson
      if (modNum === 2 && lesson.module !== '2') return;
      // Panel 3 shows module-2 + module-3 lessons
      if (modNum === 3 && lesson.module === '4') return;
      // Panel 4 shows everything

      const isActive = lesson.id === state.currentLessonId;
      const isDone =
        (lesson.module === '2' && state.lessonOneRead) ||
        (lesson.module === '3' && state.lessonTwoComplete);

      const li = document.createElement('li');
      li.className = 'curr-item' + (isActive ? ' active' : '');
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', lesson.title + (isDone ? ', completed' : ''));
      li.innerHTML = `
        <div class="check-circle ${isDone ? 'done' : 'pending'}">${isDone ? '✓' : ''}</div>
        <span class="curr-text">${lesson.title}</span>
      `;
      li.addEventListener('click', () => handleCurriculumClick(lesson));
      li.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCurriculumClick(lesson); }
      });
      ul.appendChild(li);
    });
  });

  updateCurriculumCollapseState();
}

function handleCurriculumClick(lesson) {
  // Block navigation to Completion panel via curriculum if not yet unlocked
  if (lesson.module === '4' && !completionUnlocked()) {
    showToast('⚠️ Complete all lessons to unlock the Completion page');
    return;
  }
  state.currentLessonId = lesson.id;
  goToModule(lesson.module);
  showToast('📖 ' + lesson.title);
}

/* ── CURRICULUM COLLAPSE ────────────────────────────────────── */

function toggleCurriculum(id) {
  // id is like 'curr-2'; extract the number suffix
  const num = id.replace('curr-', '');
  const ul  = $(`list-curr-${num}`);
  const arr = $(`arr-curr-${num}`);
  if (!ul || !arr) return;

  const willCollapse = !ul.classList.contains('collapsed');
  ul.classList.toggle('collapsed', willCollapse);
  arr.classList.toggle('open', !willCollapse);

  const header = $(`curr-${num}`)?.querySelector('.curr-header');
  if (header) header.setAttribute('aria-expanded', String(!willCollapse));

  storageSet('curr_collapsed', String(willCollapse));
}

function updateCurriculumCollapseState() {
  const collapsed = storageGet('curr_collapsed', 'false') === 'true';
  [2, 3, 4].forEach(m => {
    const ul  = $(`list-curr-${m}`);
    const arr = $(`arr-curr-${m}`);
    if (!ul || !arr) return;
    ul.classList.toggle('collapsed', collapsed);
    arr.classList.toggle('open', !collapsed);
  });
}

/* ── MODULE NAVIGATION ──────────────────────────────────────── */

function goToModule(m) {
  m = String(m);

  // Guard: Completion tab requires both previous lessons done
  if (m === '4' && !completionUnlocked()) {
    showToast('⚠️ Please complete all lessons before accessing the Completion page');
    return;
  }

  // Mark PDF panel as visited when the student lands on it
  if (m === '2') {
    state.lessonOneRead = true;
    syncCompletionTabLock();
  }

  // Hide all, show target
  document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step-tab').forEach(t => t.classList.remove('active'));

  const panel = $(`panel-${m}`);
  const tab   = $(`tab-${m}`);
  if (panel) panel.classList.add('active');
  if (tab)   tab.classList.add('active');

  updateBreadcrumb(m);
  state.currentModule = m;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Restore lesson id for the new module if switching via tab
  const firstOfMod = ALL_LESSONS.find(l => l.module === m);
  if (firstOfMod && state.currentModule !== m) state.currentLessonId = firstOfMod.id;

  updateLessonContent();
  buildCurricula();
  updateModuleProgress();
  setTimeout(updateReadingProgress, 120);
}

function navigateNext() {
  const idx = ALL_LESSONS.findIndex(l => l.id === state.currentLessonId);
  if (idx < ALL_LESSONS.length - 1) {
    const next = ALL_LESSONS[idx + 1];
    state.currentLessonId = next.id;
    goToModule(next.module);
  } else {
    // Last lesson — try to go to completion (guard is inside goToModule)
    goToModule('4');
  }
}

function navigatePrev() {
  const idx = ALL_LESSONS.findIndex(l => l.id === state.currentLessonId);
  if (idx > 0) {
    const prev = ALL_LESSONS[idx - 1];
    state.currentLessonId = prev.id;
    goToModule(prev.module);
  } else {
    showToast('← Already at the first step');
  }
}

/* ── BREADCRUMB ─────────────────────────────────────────────── */

function updateBreadcrumb(m) {
  const el = $('bc-current');
  if (!el) return;
  const map = {
    '2': 'Module 3 › Lesson Content',
    '3': 'Module 3 › Understanding Grid Systems',
    '4': 'Module 3 › Completed',
  };
  el.textContent = map[m] || 'Module 3';
}

/* ── LESSON CONTENT SWAP (panel-3) ─────────────────────────── */

function updateLessonContent() {
  if (state.currentModule !== '3') return;
  const data = LESSON_CONTENT[state.currentLessonId];
  if (!data) return;

  const panel = $('panel-3');
  if (!panel) return;

  const titleEl = panel.querySelector('.lesson-title');
  const badgeEl = panel.querySelector('.read-badge');
  const bodyEl  = panel.querySelector('.lesson-body');

  if (titleEl) titleEl.textContent = data.title;
  if (badgeEl) badgeEl.textContent = data.badge;

  if (bodyEl && data.body) {
    // Replace only up to the asset-row div, preserving the rest
    const assetIdx = bodyEl.innerHTML.indexOf('<div class="asset-row">');
    const tail = assetIdx !== -1 ? bodyEl.innerHTML.substring(assetIdx) : '';
    bodyEl.innerHTML = data.body + (tail || '');
  }

  // Reset reading progress for the new lesson
  state.readProgress = 0;
  const fill = $('readFill');
  const pct  = $('readPct');
  if (fill) fill.style.width = '0%';
  if (pct)  pct.textContent  = '0%';
}

/* ── MODULE PROGRESS BARS ───────────────────────────────────── */

function updateModuleProgress() {
  // Panel-2: 100% once read, else 0
  const pct2 = state.lessonOneRead ? 100 : 0;
  // Panel-3: 100% once completed, else 0
  const pct3 = state.lessonTwoComplete ? 100 : 0;
  // Panel-4: always 100% (you can only reach it after completion)

  const set = (id, val) => {
    const el = $(id);
    if (el) el.textContent = val + '%';
  };
  const setW = (id, val) => {
    const el = $(id);
    if (el) el.style.width = val + '%';
  };

  set('mp-pct',   pct2);
  set('mp-pct-3', pct3);
  set('mp-pct-4', 100);

  setW('mp-fill',   pct2);
  setW('mp-fill-3', pct3);
  // mp-fill-4 is set to 100% in HTML
}

/* ── COMPLETION — MARK AS COMPLETE ─────────────────────────── */

function markComplete() {
  if (state.lessonTwoComplete) return;

  state.lessonTwoComplete = true;

  const btn = $('completeBtn');
  if (btn) {
    btn.classList.add('done');
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
      </svg>
      Completed ✓
    `;
  }

  // Mark the reading-panel tab as done
  const tab3 = $('tab-3');
  if (tab3) tab3.classList.add('done');

  updateModuleProgress();
  buildCurricula();
  syncCompletionTabLock();
  showToast('✓ Lesson marked as complete! Completion page unlocked 🎉');

  // Auto-advance to Completion panel after short delay
  setTimeout(() => goToModule('4'), 1800);
}

/* ── PDF NAVIGATION ─────────────────────────────────────────── */

function changePage(dir) {
  state.pdfPage = Math.max(1, Math.min(state.pdfTotal, state.pdfPage + dir));
  updatePdfDisplay();
  showToast(`Page ${state.pdfPage} of ${state.pdfTotal}`);
}

function updatePdfDisplay() {
  const els = {
    curPage:    $('curPage'),
    pageNum:    $('pdfPageNumber'),
    pageBadge:  $('pdfPageBadge'),
    prevBtn:    $('pdfPrev'),
    nextBtn:    $('pdfNext'),
  };

  if (els.curPage)   els.curPage.textContent   = state.pdfPage;
  if (els.pageNum)   els.pageNum.textContent   = state.pdfPage;
  if (els.pageBadge) els.pageBadge.textContent = `${state.pdfPage} / ${state.pdfTotal}`;
  if (els.prevBtn)   els.prevBtn.disabled      = state.pdfPage === 1;
  if (els.nextBtn)   els.nextBtn.disabled      = state.pdfPage === state.pdfTotal;

  updatePdfPageImage();
}

function updatePdfPageImage() {
  const img = $('pdfPageImage');
  if (!img) return;

  // Alternate between the two available mock images
  const baseName = state.pdfPage % 2 === 0 ? 'Rectangle 45' : 'Rectangle 48';
  img.src = `Project1-main/images/${baseName}.png`;
  img.alt = `PDF page ${state.pdfPage}`;
}

function setupPdfSwipe() {
  const frame = $('pdfFrame');
  if (!frame) return;

  let startX = 0, startY = 0, active = false;

  frame.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    active = true;
  }, { passive: true });

  frame.addEventListener('touchmove', e => {
    if (!active) return;
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx > dy && dx > 10) e.preventDefault();
  }, { passive: false });

  frame.addEventListener('touchend', e => {
    if (!active) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) changePage(dx > 0 ? -1 : 1);
    active = false;
  }, { passive: true });

  frame.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); changePage(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); changePage(1);  }
  });
}

/* ── READING PROGRESS ───────────────────────────────────────── */

let rafId = null;

function updateReadingProgress() {
  if (rafId) cancelAnimationFrame(rafId);

  rafId = requestAnimationFrame(() => {
    if (state.currentModule !== '3' || !state.isTabVisible) { rafId = null; return; }

    const card = document.querySelector('#panel-3 .lesson-card');
    if (!card) { rafId = null; return; }

    const rect   = card.getBoundingClientRect();
    const vh     = window.innerHeight || document.documentElement.clientHeight;
    const progress = Math.min(100, Math.max(0,
      Math.round(((vh - rect.top) / card.offsetHeight) * 100)
    ));

    if (progress !== state.readProgress) {
      state.readProgress = progress;
      const fill = $('readFill');
      const pct  = $('readPct');
      if (fill) fill.style.width = progress + '%';
      if (pct)  pct.textContent  = progress + '%';
    }

    rafId = null;
  });
}

const throttledScroll = throttle(updateReadingProgress, 16);

/* ── TOAST ──────────────────────────────────────────────────── */

function showToast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (state.toastTimer) clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { t.classList.remove('show'); state.toastTimer = null; }, 3000);
}

/* ── DYNAMIC VIEWPORT HEIGHT (mobile) ──────────────────────── */

function setupViewportHeight() {
  const update = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  update();
  const debounced = debounce(update, 250);
  window.addEventListener('resize', debounced);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', debounced);
}

/* ── MISC ACTIONS ───────────────────────────────────────────── */

function handleDownload()   { showToast('📥 Download started!'); }
function viewCertificate()  { showToast('🎓 Opening certificate…'); }
function goToDashboard()    { showToast('📊 Going to your dashboard…'); }
function goBack()           { navigatePrev(); }

/* ── INIT ───────────────────────────────────────────────────── */

function init() {
  cacheDom();

  // Completion state is NOT persisted — always starts fresh on refresh
  state.lessonOneRead     = false;
  state.lessonTwoComplete = false;
  buildCurricula();
  updateModuleProgress();
  updatePdfDisplay();
  setupPdfSwipe();
  setupViewportHeight();

  window.addEventListener('scroll', throttledScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    state.isTabVisible = !document.hidden;
  });
  window.addEventListener('resize', debounce(updatePdfDisplay, 250));

  // Mark PDF panel as visited immediately on first load
  // (the user is on panel-2 at startup)
  state.lessonOneRead = true;
  syncCompletionTabLock();

  const tab2 = $('tab-2');
  if (tab2) tab2.classList.add('done');
  updateModuleProgress();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

/* ── GLOBALS (for inline onclick handlers) ──────────────────── */

window.goToModule      = goToModule;
window.changePage      = changePage;
window.markComplete    = markComplete;
window.handleDownload  = handleDownload;
window.viewCertificate = viewCertificate;
window.goToDashboard   = goToDashboard;
window.goBack          = goBack;
window.showToast       = showToast;
window.navigateNext    = navigateNext;
window.navigatePrev    = navigatePrev;
window.toggleCurriculum= toggleCurriculum;
