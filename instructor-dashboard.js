/* ============================================================
   TALENT FLOW — Instructor Dashboard
   instructor-dashboard.js
   ============================================================ */

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

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ── STATE ── */
const STATS = {
    courses: 0,
    students: 0,
    pending: 0,
    classAverage: 0,
    gradedToday: 0
};

let COURSES = [];
let ASSIGNMENTS = [];
let STUDENTS = [];
let GIVEN_ASSIGNMENTS = [];

const SUBMISSIONS = { pending: [], graded: [] };
const GRADING_ACTIVITY = [0, 0, 0, 0, 0, 0, 0];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY_IDX = (new Date().getDay() + 6) % 7;

const CLASS_ENGAGEMENT = {
    labels: ['On-Time Submissions', 'Grading Progress', 'Avg. Score', 'Published Courses', 'Published Assignments'],
    scores: [0, 0, 0, 0, 0],
    color: '#2563EB'
};

let GRADING_SCHEDULE = [];
let currentInstructorId = null;
let activeSubmissionsTab = 'pending';

/* ── NUMERICAL ANIMATION HELPER ── */
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

/* ── SPARKLINE DRAWER ── */
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
    grad.addColorStop(0, color + '44');
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
    ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) {
        const cx = (xs[i - 1] + xs[i]) / 2;
        ctx.bezierCurveTo(cx, ys[i - 1], cx, ys[i], xs[i], ys[i]);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
}

/* ── DATA PROCESSING ── */
function studentInfo(id) {
    return STUDENTS.find(s => s.id === id) || { id, name: 'Student', avatar: '' };
}

function formatShortDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeDerivedData() {
    STATS.courses = COURSES.length;
    STATS.students = STUDENTS.length;

    let pendingCount = 0, gradedSum = 0, gradedCount = 0, gradedTodayCount = 0;
    let onTimeCount = 0, submittedTotalCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const activityByDow = [0, 0, 0, 0, 0, 0, 0];
    const pendingList = [];
    const gradedList = [];

    ASSIGNMENTS.forEach((a) => {
        const max = a.maxScore || 100;
        (a.submissions || []).forEach((s) => {
            if (!s.submittedAt) return;
            submittedTotalCount++;
            if (a.dueDate && s.submittedAt.slice(0, 10) <= a.dueDate) onTimeCount++;

            if (s.score === null || s.score === undefined) {
                pendingCount++;
                pendingList.push({
                    id: `${a.id}::${s.studentId}`,
                    assignmentId: a.id,
                    studentId: s.studentId,
                    title: a.title,
                    course: a.course,
                    maxScore: max,
                    studentName: studentInfo(s.studentId).name,
                    dueLabel: formatShortDate(s.submittedAt),
                    studentNote: s.submissionText || s.link ? (s.link || s.submissionText) : '',
                });
            } else {
                gradedSum += (s.score / max) * 100;
                gradedCount++;
                gradedList.push({
                    id: `${a.id}::${s.studentId}`,
                    assignmentId: a.id,
                    studentId: s.studentId,
                    title: a.title,
                    course: a.course,
                    studentName: studentInfo(s.studentId).name,
                    grade: Math.round((s.score / max) * 100),
                });
                if (s.gradedAt) {
                    const dayStr = s.gradedAt.slice(0, 10);
                    if (dayStr === todayStr) gradedTodayCount++;
                    const diffDays = Math.round((new Date(todayStr) - new Date(dayStr)) / 86400000);
                    if (diffDays >= 0 && diffDays < 7) {
                        const dow = (new Date(dayStr + 'T12:00:00').getDay() + 6) % 7;
                        activityByDow[dow]++;
                    }
                }
            }
        });
    });

    STATS.pending = pendingCount;
    STATS.classAverage = gradedCount ? Math.round(gradedSum / gradedCount) : 0;
    STATS.gradedToday = gradedTodayCount;

    SUBMISSIONS.pending = pendingList;
    SUBMISSIONS.graded = gradedList;
    GRADING_ACTIVITY.splice(0, 7, ...activityByDow);

    GIVEN_ASSIGNMENTS = ASSIGNMENTS
        .slice()
        .sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0))
        .slice(0, 8)
        .map(a => ({
            id: a.id,
            title: a.title,
            course: a.course,
            status: a.status || 'published',
            subCount: (a.submissions || []).filter(s => s.submittedAt).length,
        }));

    const publishedCourses = COURSES.filter(c => c.status === 'published').length;
    const publishedAssignments = ASSIGNMENTS.filter(a => a.status !== 'draft').length;
    CLASS_ENGAGEMENT.scores = [
        submittedTotalCount ? Math.round((onTimeCount / submittedTotalCount) * 100) : 0,
        submittedTotalCount ? Math.round((gradedCount / submittedTotalCount) * 100) : 0,
        STATS.classAverage,
        COURSES.length ? Math.round((publishedCourses / COURSES.length) * 100) : 0,
        ASSIGNMENTS.length ? Math.round((publishedAssignments / ASSIGNMENTS.length) * 100) : 0,
    ];

    GRADING_SCHEDULE = ASSIGNMENTS
        .filter(a => a.status !== 'draft' && pendingList.some(p => p.assignmentId === a.id) && a.dueDate)
        .map(a => ({ title: a.title, course: a.course, date: new Date(a.dueDate + 'T12:00:00') }))
        .sort((a, b) => a.date - b.date)
        .slice(0, 6);
}

async function loadData() {
    const [courses, assignments, students] = await Promise.all([
        window.TalentFlowData.getCourses(currentInstructorId),
        window.TalentFlowData.getAssignments(currentInstructorId),
        window.TalentFlowData.getStudentsForInstructor(currentInstructorId).catch(() => []),
    ]);
    COURSES = courses || [];
    ASSIGNMENTS = assignments || [];
    STUDENTS = students || [];
    computeDerivedData();
}

function populateCourseSelect() {
    const sel = document.getElementById('newCourse');
    if (!sel) return;
    if (!COURSES.length) {
        sel.innerHTML = '<option value="">Create a course first in Courses page</option>';
        return;
    }
    sel.innerHTML = COURSES.map(c => `<option value="${escapeHtml(c.title)}">${escapeHtml(c.title)}</option>`).join('');
}

async function refreshAndRender() {
    try {
        await loadData();
    } catch (err) {
        console.error('Loading dashboard data failed:', err);
        showToast('Could not load latest data — check connection.');
    }
    updateUIElements();
    renderGivenAssignments();
    renderSubmissions(activeSubmissionsTab);
    renderGradingChart();
    renderRadar();
    renderSchedule();
    populateCourseSelect();
}

/* ── GREETINGS ── */
function setGreeting() {
    const hours = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        if (hours < 12) greetingEl.textContent = 'Good morning,';
        else if (hours < 17) greetingEl.textContent = 'Good afternoon,';
        else greetingEl.textContent = 'Good evening,';
    }

    const wbNameEl = document.getElementById('wbName');
    if (wbNameEl) {
        try {
            const raw = localStorage.getItem('tf_instructor_profile');
            const profile = raw ? JSON.parse(raw) : null;
            wbNameEl.textContent = profile?.fullName ? `${profile.fullName} 👋` : 'Instructor 👋';
        } catch (err) {
            wbNameEl.textContent = 'Instructor 👋';
        }
    }
}

/* ── UI UPDATERS ── */
function updateUIElements() {
    animateNumber(document.getElementById('statCourses'), STATS.courses);
    animateNumber(document.getElementById('statStudents'), STATS.students);
    animateNumber(document.getElementById('statPending'), STATS.pending);
    animateNumber(document.getElementById('statAvgGrade'), STATS.classAverage, '%');

    const streakCounter = document.getElementById('streakCount');
    if (streakCounter) animateNumber(streakCounter, STATS.gradedToday);

    const bannerPendingCount = document.getElementById('bannerPendingCount');
    if (bannerPendingCount) bannerPendingCount.textContent = STATS.pending;

    drawSparkline('sparkCourses', Array(5).fill(STATS.courses || 0.1), '#2563EB');
    drawSparkline('sparkStudents', Array(5).fill(STATS.students || 0.1), '#16A34A');
    drawSparkline('sparkPending', Array(5).fill(STATS.pending || 0.1), '#EA580C');
    drawSparkline('sparkGrade', Array(5).fill(STATS.classAverage || 0.1), '#7C3AED');
}

/* ── RENDER GIVEN ASSIGNMENTS ── */
function renderGivenAssignments() {
    const list = document.getElementById('givenAssignmentsList');
    if (!list) return;

    if (GIVEN_ASSIGNMENTS.length === 0) {
        list.innerHTML = `<p style="font-size:13px;color:var(--slate-4);text-align:center;padding:16px 0;">No assignments created yet.</p>`;
        return;
    }

    list.innerHTML = GIVEN_ASSIGNMENTS.map((a, i) => `
        <div class="assign-item" style="animation-delay:${i * 50}ms">
            <div class="ai-status-dot ${a.status === 'draft' ? 'pending' : 'submitted'}"></div>
            <div class="ai-body">
                <p class="ai-title">${escapeHtml(a.title)}</p>
                <p class="ai-course">${escapeHtml(a.course)}</p>
            </div>
            <span class="badge-pill ${a.status === 'draft' ? 'blue' : 'green'}" style="margin-left: auto;">
                ${a.status === 'draft' ? 'Draft' : `${a.subCount} submitted`}
            </span>
        </div>
    `).join('');
}

/* ── RENDER STUDENT SUBMISSIONS ── */
function renderSubmissions(tab) {
    const list = document.getElementById('submissionsList');
    if (!list) return;

    const items = SUBMISSIONS[tab];
    if (!items || items.length === 0) {
        list.innerHTML = `<p style="font-size:13px;color:var(--slate-4);text-align:center;padding:20px 0;">No submissions found.</p>`;
        return;
    }

    list.innerHTML = items.map((s, i) => {
        const actionButton = tab === 'pending'
            ? `<button class="ai-action-btn" onclick="openGradeModal('${s.id}')">Grade</button>`
            : '';
        const gradeBadge = (s.grade !== undefined && s.grade !== null) ? `<span class="ai-grade">${s.grade}%</span>` : '';
        const subtitle = tab === 'pending'
            ? `${escapeHtml(s.studentName)} · Submitted ${s.dueLabel}`
            : `${escapeHtml(s.studentName)} · Graded`;

        return `
            <div class="assign-item" style="animation-delay:${i * 40}ms">
                <div class="ai-status-dot ${tab === 'pending' ? 'pending' : 'graded'}"></div>
                <div class="ai-body">
                    <p class="ai-title">${escapeHtml(s.title)}</p>
                    <p class="ai-course">${subtitle}</p>
                </div>
                <div style="margin-left:auto; display:flex; align-items:center; gap:10px;">
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

/* ── WEEKLY CHART ── */
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
    }, 250);

    const total = GRADING_ACTIVITY.reduce((a, b) => a + b, 0);
    const avg = (total / (GRADING_ACTIVITY.filter(v => v > 0).length || 1)).toFixed(1);
    const bestIdx = GRADING_ACTIVITY.indexOf(Math.max(...GRADING_ACTIVITY));

    document.getElementById('totalGraded').textContent = total;
    document.getElementById('avgGraded').textContent = total > 0 ? avg : '0';
    document.getElementById('bestGradingDay').textContent = total > 0 ? DAYS[bestIdx] : '—';
}

/* ── COHORT RADAR ── */
function renderRadar() {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = 80;
    const labels = CLASS_ENGAGEMENT.labels;
    const scores = CLASS_ENGAGEMENT.scores.map(s => s / 100);
    const n = labels.length;
    const color = CLASS_ENGAGEMENT.color;

    function pt(idx, r) {
        const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    }

    ctx.clearRect(0, 0, W, H);

    [0.25, 0.5, 0.75, 1].forEach(frac => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R * frac);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = frac === 1 ? '#E2E8F0' : '#F1F5F9';
        ctx.lineWidth = 1; ctx.stroke();
    });

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const [x, y] = pt(i, R * scores[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color + '22'; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

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

/* ── DEADLINES SCHEDULE ── */
function renderSchedule() {
    const list = document.getElementById('deadlineList');
    const badge = document.getElementById('deadlineCount');
    if (!list) return;

    if (badge) badge.textContent = GRADING_SCHEDULE.length;

    if (!GRADING_SCHEDULE.length) {
        list.innerHTML = `<p style="text-align:center;color:var(--slate-4);padding:16px;font-size:13px">No deadlines right now.</p>`;
        return;
    }

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();

    list.innerHTML = GRADING_SCHEDULE.map((s) => {
        const daysLeft = Math.ceil((s.date - now) / 86400000);
        const urgency = daysLeft <= 2 ? 'urgent' : 'normal';
        const label = daysLeft === 1 ? 'Tomorrow' : daysLeft <= 0 ? 'Overdue' : `${daysLeft}d deadline`;

        return `
            <div class="dl-item">
                <div class="dl-date-box ${urgency}">
                    <span class="dl-day">${s.date.getDate()}</span>
                    <span class="dl-month">${MONTHS[s.date.getMonth()]}</span>
                </div>
                <div class="dl-info">
                    <p class="dl-title">${escapeHtml(s.title)}</p>
                    <p class="dl-course">${escapeHtml(s.course)}</p>
                </div>
                <span class="dl-days-left ${urgency}">${label}</span>
            </div>`;
    }).join('');
}

/* ── MODAL INTERACTION ── */
let targetGradingId = null;

function openGradeModal(id) {
    const submission = SUBMISSIONS.pending.find(s => s.id === id);
    if (!submission) return;

    targetGradingId = id;
    document.getElementById('gradeModalDetail').textContent = `${submission.studentName} · ${submission.course}`;

    const filePreview = document.getElementById('studentFilePreview');
    filePreview.innerHTML = submission.studentNote
        ? `<span style="font-size:13px;color:var(--slate-7)">${escapeHtml(submission.studentNote)}</span>`
        : `<span style="font-size:13px;color:var(--slate-4);font-style:italic">No written note attached.</span>`;

    const scoreInput = document.getElementById('gradeValue');
    scoreInput.max = submission.maxScore;
    scoreInput.placeholder = `Grade (out of ${submission.maxScore})`;
    scoreInput.value = '';
    document.getElementById('gradeFeedback').value = '';
    document.getElementById('gradeModal').classList.add('open');
}

window.openGradeModal = openGradeModal;

function initModals() {
    const gradeModal = document.getElementById('gradeModal');
    const closeGrade = document.getElementById('closeGradeModal');
    const confirmGrade = document.getElementById('confirmGrade');

    const addAssignmentModal = document.getElementById('add-assignment-modal');
    const createBtn = document.getElementById('createAssignmentBtn');
    const closeCreate = document.getElementById('closeCreateModal');
    const confirmCreate = document.getElementById('confirmCreateAssignment');

    [gradeModal, addAssignmentModal].forEach(m => {
        m?.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
    });

    closeGrade?.addEventListener('click', () => gradeModal.classList.remove('open'));

    confirmGrade?.addEventListener('click', async () => {
        const submission = SUBMISSIONS.pending.find(s => s.id === targetGradingId);
        if (!submission) return;

        const scoreInput = document.getElementById('gradeValue');
        const score = parseInt(scoreInput.value);

        if (isNaN(score) || score < 0 || score > submission.maxScore) {
            showToast(`Please enter a grade between 0 and ${submission.maxScore}.`, 'warning');
            return;
        }

        const assignment = ASSIGNMENTS.find(a => a.id === submission.assignmentId);
        if (!assignment) return;

        const feedback = document.getElementById('gradeFeedback').value;
        const updatedSubmissions = assignment.submissions.map(s => s.studentId === submission.studentId
            ? { ...s, score, feedback, gradedAt: new Date().toISOString() }
            : s);

        confirmGrade.disabled = true;
        try {
            await window.TalentFlowData.updateSubmissions(assignment.id, updatedSubmissions);
            assignment.submissions = updatedSubmissions;
            computeDerivedData();
            updateUIElements();
            renderGivenAssignments();
            renderSubmissions(activeSubmissionsTab);
            renderGradingChart();
            renderRadar();
            renderSchedule();
            showToast(`Graded successfully! Score: ${score}/${submission.maxScore}`, 'success');
            gradeModal.classList.remove('open');
            targetGradingId = null;
        } catch (err) {
            console.error('Saving grade failed:', err);
            showToast('Could not save grade — please try again.', 'error');
        } finally {
            confirmGrade.disabled = false;
        }
    });

    // Create Assignment
    createBtn?.addEventListener('click', () => {
        document.getElementById('newTitle').value = '';
        document.getElementById('newInstructions').value = '';
        document.getElementById('newDueDate').value = '';
        populateCourseSelect();
        addAssignmentModal.classList.add('open');
    });

    closeCreate?.addEventListener('click', () => addAssignmentModal.classList.remove('open'));

    confirmCreate?.addEventListener('click', async () => {
        const title = document.getElementById('newTitle').value.trim();
        const course = document.getElementById('newCourse').value;
        const instructions = document.getElementById('newInstructions').value.trim();
        const dueDate = document.getElementById('newDueDate').value;
        const maxScore = parseInt(document.getElementById('newMaxScore').value) || 100;
        const status = document.getElementById('newStatus').value;

        if (!title || !course || !dueDate) {
            showToast('Please fill in Title, Course, and Due Date.', 'warning');
            return;
        }

        confirmCreate.disabled = true;
        confirmCreate.textContent = 'Publishing…';

        try {
            const newId = await window.TalentFlowData.saveAssignment(currentInstructorId, {
                title,
                course,
                instructions,
                dueDate,
                maxScore,
                assignTo: 'all',
                status
            });

            ASSIGNMENTS.push({
                id: newId,
                instructorId: currentInstructorId,
                title,
                course,
                instructions,
                dueDate,
                maxScore,
                assignTo: 'all',
                status,
                submissions: []
            });

            computeDerivedData();
            updateUIElements();
            renderGivenAssignments();
            renderSchedule();
            addAssignmentModal.classList.remove('open');
            showToast(`Assignment "${title}" created!`, 'success');
        } catch (err) {
            console.error('Creating assignment failed:', err);
            showToast('Could not create assignment. Try again.', 'error');
        } finally {
            confirmCreate.disabled = false;
            confirmCreate.textContent = 'Publish Assignment';
        }
    });
}

/* ── NAV POPUPS ── */
function initProfilePopup() {
    const avatarBtn = document.getElementById('avatarBtn');
    const popup = document.getElementById('profilePopup');

    avatarBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        popup?.classList.toggle('open');
    });

    document.addEventListener('click', () => popup?.classList.remove('open'));

    document.getElementById('navLogoutLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.TalentFlowAuth?.logOut();
    });
}

/* ── WELCOME BANNER DISMISS ── */
function initWelcomeDismiss() {
    const btn = document.getElementById('dismissBanner');
    const banner = document.getElementById('welcomeBanner');
    btn?.addEventListener('click', () => {
        if (banner) banner.style.display = 'none';
    });
}

/* ── TOAST ── */
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${msg}</span>`;
    container.appendChild(t);

    setTimeout(() => {
        t.remove();
    }, 3500);
}

/* ── INIT DOM ── */
document.addEventListener('DOMContentLoaded', async () => {
    setGreeting();
    initProfilePopup();
    initTabs();
    initModals();
    initWelcomeDismiss();

    const auth = await waitForTalentFlowAuth();
    if (!auth) {
        showToast('Could not load auth provider', 'error');
        return;
    }

    let user;
    try {
        user = await auth.requireAuth();
    } catch (err) {
        console.error('Auth check failed:', err);
        return;
    }
    if (!user) return;

    currentInstructorId = user.uid;
    await refreshAndRender();
});
