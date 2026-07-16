/* ═══════════════════════════════════════════
   TALENT FLOW — Instructor Dashboard
   instructor-dashboard.js
═══════════════════════════════════════════ */

// ── INITIAL DATA MODEL ─────────────────────
// ── DATA ──────────────────────────────────
const STATS = {
    courses: 0,
    students: 0,
    pending: 0,
    classAverage: 0,
    gradedToday: 0
};

const COURSES = [];
const GIVEN_ASSIGNMENTS = [];

const SUBMISSIONS = {
    pending: [],
    graded: []
};

const GRADING_ACTIVITY = [0, 0, 0, 0, 0, 0, 0]; // Fresh grading activity curve
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY_IDX = (new Date().getDay() + 6) % 7; 

const CLASS_ENGAGEMENT = {
    labels: ['Attendance', 'Quizzes', 'Forum Activity', 'Submissions', 'Project Grades'],
    scores: [0, 0, 0, 0, 0], // Fresh engagement ring metric
    color: '#2563EB'
};

const GRADING_SCHEDULE = [];

// ── NUMERICAL ANIMATION HELPER ─────────────
function animateNumber(el, target, suffix = '', duration = 800) {
    if (!el) return;
    const start = performance.now();
    const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * ease) + suffix;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// ── SPARKLINE DRAWER ───────────────────────
function drawSparkline(canvasId, points, color = '#2563EB') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (points.length < 2) return;

    const min = Math.min(...points), max = Math.max(...points);
    const range = max - min || 1;
    const pad = 3;
    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
    const ys = points.map(v => H - pad - ((v - min) / range) * (H - pad * 2));

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
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ── INITIALIZE APPLICATION ─────────────────
document.addEventListener('DOMContentLoaded', () => {
    setGreeting();
    updateUIElements();
    renderGivenAssignments();
    renderSubmissions('pending');
    initTabs();
    renderGradingChart();
    renderRadar();
    renderSchedule();
    initModals();
    initNavbar();
    initWelcomeDismiss();
});

// ── GREETINGS ──────────────────────────────
function setGreeting() {
    const hours = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        if (hours < 12) greetingEl.textContent = 'Good morning,';
        else if (hours < 17) greetingEl.textContent = 'Good afternoon,';
        else greetingEl.textContent = 'Good evening,';
    }

    // Real name comes from the shared instructor profile bridge (written
    // by profile.js the moment the instructor saves their profile) —
    // blank until then, rather than a hardcoded placeholder name.
    const wbNameEl = document.getElementById('wbName');
    if (wbNameEl) {
        try {
            const raw = localStorage.getItem('tf_instructor_profile');
            const profile = raw ? JSON.parse(raw) : null;
            wbNameEl.textContent = profile?.fullName ? `${profile.fullName} 👋` : '';
        } catch (err) {
            wbNameEl.textContent = '';
        }
    }
}

// ── CORE UI UPDATER ────────────────────────
function updateUIElements() {
    // Stat elements
    animateNumber(document.getElementById('statCourses'), STATS.courses);
    animateNumber(document.getElementById('statStudents'), STATS.students);
    animateNumber(document.getElementById('statPending'), STATS.pending);
    animateNumber(document.getElementById('statAvgGrade'), STATS.classAverage, '%');
    
    // Graded counter inside banner
    const streakCounter = document.getElementById('streakCount');
    if (streakCounter) animateNumber(streakCounter, STATS.gradedToday);
    
    // Summary line inside banner
    const bannerPendingCount = document.getElementById('bannerPendingCount');
    if (bannerPendingCount) bannerPendingCount.textContent = STATS.pending;

    // Draw Quick Stat Sparklines
    drawSparkline('sparkCourses', [2, 2, 3, 3, 3], '#2563EB');
    drawSparkline('sparkStudents', [30, 34, 38, 42, 45], '#16A34A');
    drawSparkline('sparkPending', [12, 10, 15, 8, STATS.pending], '#EA580C');
    drawSparkline('sparkGrade', [78, 79, 81, 80, STATS.classAverage], '#7C3AED');
}

// ── RENDER GIVEN ASSIGNMENTS ───────────────
function renderGivenAssignments() {
    const list = document.getElementById('givenAssignmentsList');
    if (!list) return;

    if (GIVEN_ASSIGNMENTS.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>No assignments created yet.</p>
            </div>`;
        return;
    }

    list.innerHTML = GIVEN_ASSIGNMENTS.map((a, i) => `
        <div class="assign-item" style="animation-delay:${i * 60}ms; align-items: center;">
            <div class="ai-status-dot ${a.status === 'Active' ? 'submitted' : 'pending'}"></div>
            <div class="ai-body" style="margin-right: 12px;">
                <p class="ai-title" style="margin-bottom: 2px;">${a.title}</p>
                <p class="ai-course">${a.course}</p>
            </div>
            <span class="badge-pill ${a.status === 'Active' ? 'green' : 'blue'}" style="margin-left: auto; flex-shrink: 0;">
                ${a.status === 'Active' ? a.subCount + ' Done' : 'Draft'}
            </span>
        </div>
    `).join('');
}

// ── RENDER STUDENT SUBMISSIONS ─────────────
let activeSubmissionsTab = 'pending';

function renderSubmissions(tab) {
    const list = document.getElementById('submissionsList');
    if (!list) return;

    const items = SUBMISSIONS[tab];
    if (!items || items.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="width:40px; height:40px; opacity:0.3; margin-bottom:8px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                <p>No submissions found here.</p>
            </div>`;
        return;
    }

    list.innerHTML = items.map((s, i) => {
        const actionButton = tab === 'pending'
            ? `<button class="ai-action-btn" onclick="openGradeModal(${s.id})">Grade</button>`
            : '';
        const gradeBadge = s.grade ? `<span class="ai-grade">${s.grade}%</span>` : '';
        const subtitle = tab === 'pending'
            ? `${s.studentName} · Submitted ${s.dueLabel}`
            : `${s.studentName} · Graded`;

        return `
            <div class="assign-item" style="animation-delay:${i * 50}ms">
                <div class="ai-status-dot ${tab === 'pending' ? 'pending' : 'graded'}"></div>
                <div class="ai-body">
                    <p class="ai-title">${s.title}</p>
                    <p class="ai-course">${subtitle}</p>
                    ${s.studentNote ? `<p style="font-size:11px; color:var(--slate-5); background:var(--slate-0); padding:4px 8px; border-radius:6px; margin-top:6px; font-style:italic;">"${s.studentNote}"</p>` : ''}
                </div>
                <div style="margin-left:auto; display:flex; align-items:center; gap:12px; flex-shrink:0;">
                    ${gradeBadge}
                    ${actionButton}
                </div>
            </div>`;
    }).join('');
}

function initTabs() {
    const tabs = document.querySelectorAll('#submissionTabs .tab-pill');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeSubmissionsTab = tab.dataset.tab;
            renderSubmissions(activeSubmissionsTab);
        });
    });
}

// ── GRADING ACTIVITY WEEKLY CHART ──────────
function renderGradingChart() {
    const barsEl = document.getElementById('weeklyBars');
    if (!barsEl) return;
    const maxH = 90;
    const maxVal = Math.max(...GRADING_ACTIVITY) || 1;

    barsEl.innerHTML = GRADING_ACTIVITY.map((v, i) => `
        <div class="wc-bar-wrap">
            <span class="wc-val">${v > 0 ? v : ''}</span>
            <div class="wc-bar${i === TODAY_IDX ? ' today' : ''}"
                 data-height="${(v / maxVal) * maxH}"
                 style="height:0px"></div>
        </div>
    `).join('');

    setTimeout(() => {
        barsEl.querySelectorAll('.wc-bar').forEach(bar => {
            bar.style.height = bar.dataset.height + 'px';
        });
    }, 300);

    const total = GRADING_ACTIVITY.reduce((a, b) => a + b, 0);
    const avg = (total / (GRADING_ACTIVITY.filter(v => v > 0).length || 1)).toFixed(1);
    const bestIdx = GRADING_ACTIVITY.indexOf(Math.max(...GRADING_ACTIVITY));

    document.getElementById('totalGraded').textContent = total;
    document.getElementById('avgGraded').textContent = total > 0 ? avg : '0';
    document.getElementById('bestGradingDay').textContent = total > 0 ? DAYS[bestIdx] : '—';
}

// ── COHORT RADAR CANVAS ────────────────────
function renderRadar() {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = 82;
    const labels = CLASS_ENGAGEMENT.labels;
    const scores = CLASS_ENGAGEMENT.scores.map(s => s / 100);
    const n = labels.length;
    const color = CLASS_ENGAGEMENT.color;

    function pt(idx, r) {
        const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    }

    ctx.clearRect(0, 0, W, H);

    let frame = 0;
    const totalFrames = 40;

    function drawFrame() {
        const t = Math.min(frame / totalFrames, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        ctx.clearRect(0, 0, W, H);

        // Grid rings
        [0.25, 0.5, 0.75, 1].forEach(frac => {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const [x, y] = pt(i, R * frac);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = frac === 1 ? '#E2E8F0' : '#F1F5F9';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Spokes
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Polygon
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R * scores[i] * ease);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color + '22';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dots
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R * scores[i] * ease);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Labels
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R + 15);
            ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
            ctx.fillStyle = '#64748B';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[i], x, y);
        }

        if (frame < totalFrames) { frame++; requestAnimationFrame(drawFrame); }
    }
    drawFrame();

    // Legend Mapping
    const legend = document.getElementById('radarLegend');
    if (legend) {
        const colors = ['#2563EB', '#16A34A', '#EA580C', '#7C3AED', '#0891B2'];
        legend.innerHTML = labels.map((lbl, i) => `
            <div class="rl-item">
                <div class="rl-dot" style="background:${colors[i % colors.length]}"></div>
                <span>${lbl}: ${CLASS_ENGAGEMENT.scores[i]}%</span>
            </div>
        `).join('');
    }
}

// ── GRADING DEADLINES SCHEDULE ─────────────
function renderSchedule() {
    const list = document.getElementById('deadlineList');
    const badge = document.getElementById('deadlineCount');
    if (!list) return;

    if (badge) badge.textContent = GRADING_SCHEDULE.length;

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();

    list.innerHTML = GRADING_SCHEDULE.map((s, i) => {
        const daysLeft = Math.ceil((s.date - now) / 86400000);
        const urgency = daysLeft <= 2 ? 'urgent' : 'normal';
        const label = daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d deadline`;

        return `
            <div class="dl-item" style="animation-delay:${i * 60}ms">
                <div class="dl-date-box ${urgency}">
                    <span class="dl-day">${s.date.getDate()}</span>
                    <span class="dl-month">${MONTHS[s.date.getMonth()]}</span>
                </div>
                <div class="dl-info">
                    <p class="dl-title">${s.title}</p>
                    <p class="dl-course">${s.course}</p>
                </div>
                <span class="dl-days-left ${urgency}">${label}</span>
            </div>`;
    }).join('');
}

// ── INTERACTIVE GRADING & CREATION MODALS ──
let targetGradingId = null;

function openGradeModal(id) {
    const submission = SUBMISSIONS.pending.find(s => s.id === id);
    if (!submission) return;

    targetGradingId = id;
    document.getElementById('gradeModalDetail').textContent = `${submission.studentName} · ${submission.course}`;
    
    // File Preview Mapping
    const filePreview = document.getElementById('studentFilePreview');
    filePreview.innerHTML = `
        <svg width="18" height="18" fill="none" stroke="#2563EB" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
        </svg>
        <span>${submission.file}</span>
        <span style="color:#94A3B8; font-size:11px; margin-left:auto">${submission.fileSize}</span>
    `;

    document.getElementById('gradeValue').value = '';
    document.getElementById('gradeFeedback').value = '';
    document.getElementById('gradeModal').classList.add('open');
}

// Make openGradeModal accessible globally to onclick attributes
window.openGradeModal = openGradeModal;

function initModals() {
    const gradeModal = document.getElementById('gradeModal');
    const closeGrade = document.getElementById('closeGradeModal');
    const confirmGrade = document.getElementById('confirmGrade');

    const addAssignmentModal = document.getElementById('add-assignment-modal');
    const createBtn = document.getElementById('createAssignmentBtn');
    const closeCreate = document.getElementById('closeCreateModal');
    const confirmCreate = document.getElementById('confirmCreateAssignment');

    // Close on overlay click
    [gradeModal, addAssignmentModal].forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
    });

    closeGrade.addEventListener('click', () => gradeModal.classList.remove('open'));
    
    // Process grading
    confirmGrade.addEventListener('click', () => {
        const scoreInput = document.getElementById('gradeValue');
        const score = parseInt(scoreInput.value);

        if (isNaN(score) || score < 0 || score > 100) {
            showToast('Please enter a valid grade between 0 and 100.');
            return;
        }

        const idx = SUBMISSIONS.pending.findIndex(s => s.id === targetGradingId);
        if (idx !== -1) {
            const [item] = SUBMISSIONS.pending.splice(idx, 1);
            item.grade = score;
            item.feedback = document.getElementById('gradeFeedback').value;
            SUBMISSIONS.graded.unshift(item);

            // Dynamically recalculate statistics
            STATS.gradedToday++;
            STATS.pending = SUBMISSIONS.pending.length;
            
            // Recompute running average from graded entries
            const sum = SUBMISSIONS.graded.reduce((acc, curr) => acc + curr.grade, 0);
            STATS.classAverage = Math.round(sum / SUBMISSIONS.graded.length);

            // Update Weekday Log
            GRADING_ACTIVITY[TODAY_IDX]++;
            renderGradingChart();

            updateUIElements();
            renderSubmissions(activeSubmissionsTab);
            showToast(`Submission graded successfully! Score: ${score}% ✅`);
        }

        gradeModal.classList.remove('open');
        targetGradingId = null;
    });

    // Handle Creating New Assignments
    createBtn.addEventListener('click', () => {
        document.getElementById('newTitle').value = '';
        document.getElementById('newDueDate').value = '';
        addAssignmentModal.classList.add('open');
    });

    closeCreate.addEventListener('click', () => addAssignmentModal.classList.remove('open'));

    confirmCreate.addEventListener('click', () => {
        const title = document.getElementById('newTitle').value.trim();
        const course = document.getElementById('newCourse').value;
        const rawDate = document.getElementById('newDueDate').value;
        const urgency = document.getElementById('newUrgency').value;

        if (!title || !rawDate) {
            showToast('Please complete all assignment fields.');
            return;
        }

        const parsedDate = new Date(rawDate);

        // Append to Assignments Model
        GIVEN_ASSIGNMENTS.unshift({
            id: Date.now(),
            title: title,
            course: course,
            status: "Active",
            subCount: 0
        });

        // Append to Grading Schedule list
        GRADING_SCHEDULE.unshift({
            title: title + " Review",
            course: course,
            date: parsedDate
        });

        renderGivenAssignments();
        renderSchedule();
        addAssignmentModal.classList.remove('open');
        showToast('New assignment published successfully! 🚀');
    });
}

// ── TOAST NOTIFICATION ─────────────────────
function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        background: '#0F172A',
        color: 'white',
        padding: '12px 22px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: '9999',
        animation: 'toastIn 0.3s ease',
        opacity: '1',
        transition: 'opacity 0.4s'
    });

    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `@keyframes toastIn {
            from { opacity:0; transform:translateY(12px); }
            to { opacity:1; transform:translateY(0); }
        }`;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ── GENERAL NAVIGATION & MENU HANDLERS ─────
function initNavbar() {
    const avatarBtn = document.getElementById('avatarBtn');
    const popup = document.getElementById('profilePopup');
    if (avatarBtn && popup) {
        avatarBtn.addEventListener('click', e => {
            e.stopPropagation();
            popup.classList.toggle('open');
        });
        document.addEventListener('click', () => popup.classList.remove('open'));
    }

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            showToast('No unread alerts.');
            const badge = document.getElementById('notifBadge');
            if (badge) badge.remove();
        });
    }

    const logoutLink = document.getElementById('navLogoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.TalentFlowAuth) window.TalentFlowAuth.logOut();
        });
    }

    // Mobile hamburger/sidebar/overlay are handled by mobile-nav.js
    // (also loaded on this page) — it covers everything the old handler
    // here did, plus escape key, aria states, and closing on nav-link tap.
}

// ── WELCOME BANNER DISMISSAL ───────────────
function initWelcomeDismiss() {
    const btn = document.getElementById('dismissBanner');
    const banner = document.getElementById('welcomeBanner');
    if (!btn || !banner) return;
    btn.addEventListener('click', () => {
        banner.style.transition = 'opacity 0.3s, transform 0.3s, max-height 0.4s, margin 0.4s, padding 0.4s';
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-8px)';
        banner.style.maxHeight = '0';
        banner.style.marginBottom = '0';
        banner.style.paddingTop = '0';
        banner.style.paddingBottom = '0';
        setTimeout(() => banner.remove(), 420);
    });
}