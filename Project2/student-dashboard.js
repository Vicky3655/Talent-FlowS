/* ═══════════════════════════════════════════
   TALENT FLOW — Student Dashboard
   student-dashboard.js
   Welcome-banner name comes from the signed-in Supabase account
   (see the DOMContentLoaded handler below) — app-nav.js handles
   the rest of the nav (small avatar, popup name/role). Courses,
   assignments, and deadlines now come from Supabase via
   TalentFlowData rather than empty placeholder arrays.
═══════════════════════════════════════════ */

// auth.js is an ES module fetching an external dependency, so there's
// no hard guarantee window.TalentFlowAuth exists the instant this
// script's DOMContentLoaded callback fires.
function waitForTalentFlowAuth(timeoutMs = 8000) {
    if (window.TalentFlowAuth) return Promise.resolve(window.TalentFlowAuth);
    return new Promise((resolve) => {
        const start = Date.now();
        const timer = setInterval(() => {
            if (window.TalentFlowAuth) {
                clearInterval(timer);
                resolve(window.TalentFlowAuth);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(timer);
                resolve(null);
            }
        }, 50);
    });
}

// ── DATA (populated once auth resolves — see DOMContentLoaded below) ──
const STUDENT = {
    streak: 0,
};

let COURSES = [];
let currentStudentId = null;

const ASSIGNMENTS = {
    pending:   [],
    submitted: [],
    graded:    [],
};

const DEADLINES = [];

// ── HELPERS ───────────────────────────────

function animateNumber(el, target, suffix = '', duration = 800) {
    const start = performance.now();
    const step  = (now) => {
        const t    = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * ease) + suffix;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function drawSparkline(canvas, points, color = '#2563EB') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (points.length < 2) return;

    const min   = Math.min(...points), max = Math.max(...points);
    const range = max - min || 1;
    const pad   = 3;
    const xs    = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
    const ys    = points.map(v => H - pad - ((v - min) / range) * (H - pad * 2));

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) {
        const cx = (xs[i - 1] + xs[i]) / 2;
        ctx.bezierCurveTo(cx, ys[i - 1], cx, ys[i], xs[i], ys[i]);
    }
    ctx.lineTo(xs[xs.length - 1], H);
    ctx.lineTo(xs[0], H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) {
        const cx = (xs[i - 1] + xs[i]) / 2;
        ctx.bezierCurveTo(cx, ys[i - 1], cx, ys[i], xs[i], ys[i]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.stroke();
}

function daysUntil(dateStr) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
    return Math.round((due - now) / 86400000);
}

// ── LOAD REAL DATA ────────────────────────

async function loadAssignmentsAndDeadlines() {
    const raw = await TalentFlowData.getAssignmentsForStudent(currentStudentId);

    ASSIGNMENTS.pending = [];
    ASSIGNMENTS.submitted = [];
    ASSIGNMENTS.graded = [];
    DEADLINES.length = 0;

    let gradeSum = 0, gradeCount = 0;

    raw.forEach((a) => {
        const sub = a.submission;
        const max = a.maxScore || 100;
        const days = a.dueDate ? daysUntil(a.dueDate) : null;

        if (sub && sub.score !== null && sub.score !== undefined) {
            gradeSum += (sub.score / max) * 100;
            gradeCount++;
            ASSIGNMENTS.graded.push({
                title: a.title, course: a.course,
                grade: Math.round((sub.score / max) * 100) + '%',
                urgency: 'done', dueLabel: 'Graded',
            });
        } else if (sub && sub.submittedAt) {
            ASSIGNMENTS.submitted.push({
                title: a.title, course: a.course,
                urgency: 'done', dueLabel: 'Awaiting grading',
            });
        } else {
            const urgency = days === null ? 'normal' : days < 0 ? 'urgent' : days <= 2 ? 'urgent' : days <= 5 ? 'soon' : 'normal';
            const dueLabel = days === null ? 'No due date'
                : days < 0 ? `${Math.abs(days)}d overdue`
                : days === 0 ? 'Due today'
                : days === 1 ? 'Due tomorrow'
                : `Due in ${days}d`;
            ASSIGNMENTS.pending.push({ title: a.title, course: a.course, urgency, dueLabel });

            if (a.dueDate) {
                DEADLINES.push({ title: a.title, course: a.course, date: new Date(a.dueDate + 'T12:00:00') });
            }
        }
    });

    DEADLINES.sort((a, b) => a.date - b.date);

    return {
        avgGrade: gradeCount ? Math.round(gradeSum / gradeCount) : 0,
        gradedCount: ASSIGNMENTS.graded.length,
    };
}

// ── INIT ──────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await waitForTalentFlowAuth();
    if (!auth) {
        document.querySelectorAll('.qs-value').forEach(el => { el.textContent = '—'; });
        return;
    }

    let user = null;
    let profile = {};
    try {
        user = await auth.requireAuth();
        try { profile = (await auth.loadProfile(user.uid)) || {}; }
        catch (err) { console.error('Profile read failed (using basic account info):', err); }

        const displayName = profile.fullName || user.displayName
            || (user.email ? user.email.split('@')[0] : 'there');
        const wbName = document.querySelector('.wb-name');
        if (wbName) wbName.textContent = `${displayName} 👋`;
    } catch (err) {
        console.error('Could not resolve signed-in user for welcome banner:', err);
        return;
    }
    if (!user) return;
    currentStudentId = user.uid;

    // Real enrollments feed both the Active Courses list and the
    // "Enrolled Courses" quick stat below.
    try {
        const enrollments = await auth.listMyEnrollments();
        COURSES = enrollments.map((e) => ({
            title:      e.courseTitle,
            thumb:      e.thumb,
            progress:   e.progress || 0,
            lessons:    e.lessons || 0,
            completed:  e.completedLessons || 0,
            instructor: e.instructorName || '',
        }));
    } catch (err) {
        console.error('Could not load enrollments (showing none):', err);
    }
    setStat('Enrolled Courses', COURSES.length);

    let avgGrade = 0, gradedCount = 0;
    try {
        const result = await loadAssignmentsAndDeadlines();
        avgGrade = result.avgGrade;
        gradedCount = result.gradedCount;
    } catch (err) {
        console.error('Could not load assignments (showing none):', err);
    }
    setStat('Assignments Done', gradedCount);
    setStat('Assignments Pending', ASSIGNMENTS.pending.length);
    setStat('Avg. Grade', avgGrade, '%');

    setGreeting();
    animateStreak();
    initQuickStats();
    renderCourses();
    renderAssignments('pending');
    initAssignTabs();
    renderDeadlines();
    initModal();
    initNav();
    initWelcomeDismiss();
});

function setStat(label, value, suffix = '') {
    document.querySelectorAll('.qs-card').forEach((card) => {
        const lbl = card.querySelector('.qs-label');
        if (lbl && lbl.textContent.trim() === label) {
            const valEl = card.querySelector('.qs-value');
            if (valEl) {
                valEl.dataset.target = String(value);
                if (suffix) valEl.dataset.suffix = suffix;
            }
        }
    });
}

// ── GREETING ──────────────────────────────

function setGreeting() {
    const h  = new Date().getHours();
    const el = document.getElementById('greeting');
    if (h < 12) el.textContent = 'Good morning,';
    else if (h < 17) el.textContent = 'Good afternoon,';
    else el.textContent = 'Good evening,';
}

// ── STREAK ────────────────────────────────

function animateStreak() {
    const el = document.getElementById('streakCount');
    if (!el) return;
    animateNumber(el, STUDENT.streak, '', 1000);
}

// ── QUICK STATS ───────────────────────────

function initQuickStats() {
    document.querySelectorAll('.qs-card').forEach(card => {
        const valEl  = card.querySelector('.qs-value');
        const target = parseInt(valEl.dataset.target) || 0;
        const suffix = valEl.dataset.suffix || '';
        animateNumber(valEl, target, suffix, 900);

        const canvas = card.querySelector('.qs-spark');
        if (canvas) {
            drawSparkline(canvas, Array(5).fill(target || 0.1), '#2563EB');
        }
    });
}

// ── COURSES ───────────────────────────────

function renderCourses() {
    const list = document.getElementById('coursesList');

    if (COURSES.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>
                </svg>
                <p>No courses yet — <a href="courses.html">browse courses</a> to get started.</p>
            </div>`;
        return;
    }

    list.innerHTML = COURSES.map((c, i) => `
        <div class="course-row" style="animation-delay:${i * 60}ms">
            <img class="cr-thumb" src="${c.thumb}" alt="${c.title}">
            <div class="cr-info">
                <p class="cr-title">${c.title}</p>
                <p class="cr-meta">${c.instructor} · ${c.completed}/${c.lessons} lessons</p>
                <div class="cr-progress-bar">
                    <div class="cr-progress-fill" data-progress="${c.progress}"></div>
                </div>
            </div>
            <span class="cr-pct">${c.progress}%</span>
        </div>
    `).join('');

    requestAnimationFrame(() => {
        setTimeout(() => {
            document.querySelectorAll('.cr-progress-fill').forEach(bar => {
                bar.style.width = bar.dataset.progress + '%';
            });
        }, 200);
    });
}

// ── ASSIGNMENTS ───────────────────────────

let currentTab = 'pending';

function renderAssignments(tab) {
    const list  = document.getElementById('assignList');
    const items = ASSIGNMENTS[tab];

    if (!items || items.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                <p>Nothing here — you're all caught up!</p>
            </div>`;
        return;
    }

    list.innerHTML = items.map((a, i) => {
        const actionBtn = tab === 'pending'
            ? `<button class="ai-action-btn" onclick="openSubmitModal('${a.title.replace(/'/g, "\\'")}', '${a.course.replace(/'/g, "\\'")}')">Submit</button>`
            : '';
        const gradeTag = a.grade ? `<span class="ai-grade">${a.grade}</span>` : '';
        return `
            <div class="assign-item" style="animation-delay:${i * 50}ms">
                <div class="ai-status-dot ${tab === 'pending' ? 'pending' : tab === 'submitted' ? 'submitted' : 'graded'}"></div>
                <div class="ai-body">
                    <p class="ai-title">${a.title}</p>
                    <p class="ai-course">${a.course}</p>
                    <div class="ai-footer">
                        <span class="ai-due ${a.urgency}">${a.dueLabel}</span>
                        ${gradeTag}
                        ${actionBtn}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function initAssignTabs() {
    const tabs = document.querySelectorAll('.tab-pill');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            renderAssignments(currentTab);
        });
    });
}

// ── DEADLINES ─────────────────────────────

function renderDeadlines() {
    const list  = document.getElementById('deadlineList');
    const badge = document.getElementById('deadlineCount');
    const now   = new Date();

    if (badge) badge.textContent = DEADLINES.length;

    if (!DEADLINES.length) {
        list.innerHTML = `<p style="text-align:center;color:var(--slate-4);padding:20px;font-size:13px">Nothing due right now.</p>`;
        return;
    }

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    list.innerHTML = DEADLINES.map((d, i) => {
        const daysLeft = Math.ceil((d.date - now) / 86400000);
        const urgency  = daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'soon' : 'normal';
        const label    = daysLeft === 1 ? 'Tomorrow' : daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`;
        return `
            <div class="dl-item" style="animation-delay:${i * 60}ms">
                <div class="dl-date-box ${urgency}">
                    <span class="dl-day">${d.date.getDate()}</span>
                    <span class="dl-month">${MONTHS[d.date.getMonth()]}</span>
                </div>
                <div class="dl-info">
                    <p class="dl-title">${d.title}</p>
                    <p class="dl-course">${d.course}</p>
                </div>
                <span class="dl-days-left ${urgency}">${label}</span>
            </div>`;
    }).join('');
}

// ── MODAL ─────────────────────────────────

let currentAssignment = null;

function openSubmitModal(title, course) {
    currentAssignment = { title, course };
    document.getElementById('modalTitle').textContent  = 'Submit: ' + title;
    document.getElementById('modalCourse').textContent = course;
    document.getElementById('submitLink').value = '';
    document.getElementById('submitNote').value = '';
    document.getElementById('submitModal').classList.add('open');
}
window.openSubmitModal = openSubmitModal;

function initModal() {
    const modal      = document.getElementById('submitModal');
    const closeBtn   = document.getElementById('closeModal');
    const confirmBtn = document.getElementById('confirmSubmit');

    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

    confirmBtn.addEventListener('click', async () => {
        if (!currentAssignment) return;
        // The dashboard only knows the assignment by title/course (that's
        // all the summary cards carry) — the assignments page is the
        // fuller, id-backed place to submit; this quick action points
        // there so the real record actually gets updated.
        modal.classList.remove('open');
        showToast('Opening your assignments so you can attach your work…');
        setTimeout(() => { window.location.href = 'assignment.html'; }, 700);
    });
}

// ── TOAST ─────────────────────────────────

function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
        position:   'fixed',
        bottom:     '28px',
        right:      '28px',
        background: '#0F172A',
        color:      'white',
        padding:    '12px 22px',
        borderRadius: '12px',
        fontSize:   '14px',
        fontWeight: '600',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        boxShadow:  '0 8px 24px rgba(0,0,0,0.2)',
        zIndex:     '9999',
        animation:  'toastIn 0.3s ease',
        opacity:    '1',
        transition: 'opacity 0.4s',
    });

    if (!document.getElementById('toast-style')) {
        const s = document.createElement('style');
        s.id = 'toast-style';
        s.textContent = `@keyframes toastIn {
            from { opacity:0; transform:translateY(12px); }
            to   { opacity:1; transform:translateY(0); }
        }`;
        document.head.appendChild(s);
    }

    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
}

// ── NAV ───────────────────────────────────

function initNav() {
    const avatarBtn = document.getElementById('avatarBtn');
    const popup     = document.getElementById('profilePopup');
    if (avatarBtn && popup) {
        avatarBtn.addEventListener('click', e => {
            e.stopPropagation();
            popup.classList.toggle('open');
        });
        document.addEventListener('click', () => popup.classList.remove('open'));
    }

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) notifBtn.addEventListener('click', () => showToast('No new notifications.'));

    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar   = document.getElementById('sidebar');
    const overlay   = document.getElementById('sidebarOverlay');

    if (hamburger && sidebar && overlay) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            overlay.style.display = 'block';
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.style.display = 'none';
        });
    }
}

// ── WELCOME BANNER DISMISS ────────────────

function initWelcomeDismiss() {
    const btn    = document.getElementById('dismissBanner');
    const banner = document.getElementById('welcomeBanner');
    if (!btn || !banner) return;
    btn.addEventListener('click', () => {
        banner.style.transition  = 'opacity 0.3s, transform 0.3s, max-height 0.4s, margin 0.4s, padding 0.4s';
        banner.style.opacity     = '0';
        banner.style.transform   = 'translateY(-8px)';
        banner.style.maxHeight   = '0';
        banner.style.marginBottom = '0';
        banner.style.paddingTop  = '0';
        banner.style.paddingBottom = '0';
        setTimeout(() => banner.remove(), 420);
    });
}
