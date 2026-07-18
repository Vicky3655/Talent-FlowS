/* ═══════════════════════════════════════════
   TALENT FLOW — Performance
   performance.js
   ------------------------------------------------------------
   Every number on this page now comes from Supabase (courses +
   assignments + enrollments), computed once on load. There's no
   historical, day-by-day tracking anywhere in the schema yet, so
   the period pills all show the same real current snapshot
   rather than a fabricated growth curve — that's the honest
   thing to do until real time-series data exists.
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

/* ── Profile bridge (fast local paint for the nav avatar) ─── */
const PROFILE_KEY = 'tf_instructor_profile';

function getSavedProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch { return {}; }
}

function applyProfileToNav() {
    const p = getSavedProfile();
    if (!Object.keys(p).length) return;
    if (p.avatar) {
        const navImg = document.querySelector('.avatar img');
        if (navImg) navImg.src = p.avatar;
    }
}

/* ── Metric config ───────────────────────── */

const METRICS = [
    {
        key:     'students',
        label:   'Total Students',
        accent:  '#2563EB',
        accentL: '#EFF6FF',
        icon: `<svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#2563EB">
                 <path stroke-linecap="round" stroke-linejoin="round"
                   d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952
                      4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07
                      M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766
                      l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75
                      0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625
                      2.625 0 0 1 5.25 0Z"/>
               </svg>`,
    },
    {
        key:     'submissionRate',
        label:   'Submission Rate',
        accent:  '#7C3AED',
        accentL: '#F5F3FF',
        icon: `<svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#7C3AED">
                 <path stroke-linecap="round" stroke-linejoin="round"
                   d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
               </svg>`,
    },
    {
        key:     'enrolments',
        label:   'Active Enrolments',
        accent:  '#16A34A',
        accentL: '#F0FDF4',
        icon: `<svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#16A34A">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"/>
               </svg>`,
    },
    {
        key:     'assignments',
        label:   'Assignments Submitted',
        accent:  '#EA580C',
        accentL: '#FFF7ED',
        icon: `<svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#EA580C">
                 <path stroke-linecap="round" stroke-linejoin="round"
                   d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1
                      13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15
                      12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504
                      1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0
                      0-9-9Z"/>
               </svg>`,
    },
];

/* ── State ───────────────────────────────── */

let currentPeriod  = 'Last 7 days';
let trendRafId      = null;
let currentInstructorId = null;

// Populated once from Supabase; every period pill reads from this
// same real snapshot (see the header comment above).
let SNAPSHOT = {
    students: 0,
    submissionRate: 0,
    enrolments: 0,
    assignmentsSubmitted: 0,
    gradingCompletion: 0,
    avgGrade: 0,
    passRate: 0,
    topCourse: '—',
    courses: [], // [{name, enrolled, submissionRate, grade, color}]
};

const SPARK_COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#EA580C'];
const COURSE_COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#EA580C', '#0891B2', '#DC2626'];

/* ── Load + derive real data ─────────────── */

async function loadSnapshot() {
    const [courses, assignments, students] = await Promise.all([
        TalentFlowData.getCourses(currentInstructorId),
        TalentFlowData.getAssignments(currentInstructorId),
        TalentFlowData.getStudentsForInstructor(currentInstructorId).catch((err) => {
            console.error('Could not load enrolled students:', err);
            return [];
        }),
    ]);

    const enrollCountByCourse = {};
    students.forEach((s) => {
        s.courseIds.forEach((cid) => { enrollCountByCourse[cid] = (enrollCountByCourse[cid] || 0) + 1; });
    });

    let submittedTotal = 0, gradedTotal = 0, passCount = 0, scoreSum = 0, scoreCount = 0;
    const byCourseTitle = {};
    courses.forEach((c) => { byCourseTitle[c.title] = { sum: 0, count: 0, submitted: 0, graded: 0 }; });

    assignments.forEach((a) => {
        const max = a.maxScore || 100;
        const bucket = byCourseTitle[a.course] || (byCourseTitle[a.course] = { sum: 0, count: 0, submitted: 0, graded: 0 });
        (a.submissions || []).forEach((s) => {
            if (!s.submittedAt) return;
            submittedTotal++;
            bucket.submitted++;
            if (s.score !== null && s.score !== undefined) {
                const pct = (s.score / max) * 100;
                gradedTotal++;
                scoreSum += pct;
                scoreCount++;
                if (pct >= 60) passCount++;
                bucket.sum += pct;
                bucket.count++;
                bucket.graded++;
            }
        });
    });

    const totalPossible = assignments.reduce((sum, a) => sum + (a.status !== 'draft' ? students.length : 0), 0);

    const courseRows = courses.map((c, i) => {
        const b = byCourseTitle[c.title] || { sum: 0, count: 0 };
        return {
            name: c.title,
            enrolled: enrollCountByCourse[c.id] || 0,
            submissionRate: 0, // filled below once we know possible submissions per course
            grade: b.count ? Math.round(b.sum / b.count) : 0,
            color: COURSE_COLORS[i % COURSE_COLORS.length],
        };
    }).sort((a, b) => b.enrolled - a.enrolled);

    SNAPSHOT = {
        students: students.length,
        submissionRate: totalPossible ? Math.round((submittedTotal / totalPossible) * 100) : 0,
        enrolments: students.reduce((sum, s) => sum + s.courseIds.length, 0),
        assignmentsSubmitted: submittedTotal,
        gradingCompletion: submittedTotal ? Math.round((gradedTotal / submittedTotal) * 100) : 0,
        avgGrade: scoreCount ? Math.round(scoreSum / scoreCount) : 0,
        passRate: gradedTotal ? Math.round((passCount / gradedTotal) * 100) : 0,
        topCourse: courseRows[0]?.name || '—',
        courses: courseRows,
    };
}

/* ── Sparkline (flat — see header note on why) ───────────── */

function drawSparkline(canvas, value, color) {
    const ctx = canvas.getContext('2d');
    const W   = canvas.offsetWidth  || canvas.width;
    const H   = canvas.offsetHeight || canvas.height;
    canvas.width  = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const y = H / 2;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '30');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(2, y);
    ctx.lineTo(W - 2, y);
    ctx.lineTo(W - 2, H);
    ctx.lineTo(2, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, y);
    ctx.lineTo(W - 2, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

/* ── Counter animation ───────────────────── */

function animateCounter(el, end, suffix = '', delay = 0) {
    const dur = 900;
    setTimeout(() => {
        const t0 = performance.now();
        function step(now) {
            const p    = Math.min((now - t0) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            let cur  = Math.round(end * ease);
            let txt  = cur >= 1000 ? cur.toLocaleString('en-US') : String(cur);
            if (suffix) txt += suffix;
            el.textContent = txt;
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }, delay);
}

/* ── Stat cards ──────────────────────────── */

function metricValue(key) {
    switch (key) {
        case 'students':       return { value: SNAPSHOT.students, suffix: '' };
        case 'submissionRate': return { value: SNAPSHOT.submissionRate, suffix: '%' };
        case 'enrolments':     return { value: SNAPSHOT.enrolments, suffix: '' };
        case 'assignments':    return { value: SNAPSHOT.assignmentsSubmitted, suffix: '' };
        default:                return { value: 0, suffix: '' };
    }
}

function renderStatCards() {
    const container = document.getElementById('statCards');
    container.innerHTML = METRICS.map((m, i) => `
        <div class="stat-card" style="--accent:${m.accent};--accent-l:${m.accentL};animation-delay:${i * 70}ms">
            <div class="card-top">
                <div class="card-icon">${m.icon}</div>
                <span class="card-badge neutral">Live</span>
            </div>
            <div class="card-value" id="cv-${m.key}">0</div>
            <div class="card-label">${m.label}</div>
            <div class="card-spark"><canvas id="cs-${m.key}" height="52"></canvas></div>
        </div>`).join('');

    METRICS.forEach((m, i) => {
        const { value, suffix } = metricValue(m.key);
        animateCounter(document.getElementById('cv-' + m.key), value, suffix, i * 70);
        setTimeout(() => {
            const canvas = document.getElementById('cs-' + m.key);
            if (canvas) drawSparkline(canvas, value, m.accent);
        }, 200 + i * 70);
    });
}

/* ── Trend chart — real snapshot, drawn as a flat reference
   line per metric rather than an invented curve ───────────── */

function renderTrendChart() {
    const canvas = document.getElementById('trendCanvas');
    if (!canvas) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    const seriesLabels = ['Students', 'Submission Rate', 'Enrolments', 'Assignments'];
    const seriesKeys   = ['students', 'submissionRate', 'enrolments', 'assignments'];

    const legend = document.getElementById('chartLegend');
    legend.innerHTML = seriesKeys.map((k, i) => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${SPARK_COLORS[i]}"></div>
            ${seriesLabels[i]}
        </div>`).join('');

    const padL = 40, padR = 20, padT = 14, padB = 32;
    const cW = W - padL - padR, cH = H - padT - padB;

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach((frac) => {
        const y = padT + frac * cH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
    });

    ctx.font = '600 12px Inter, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.fillText('No day-by-day history is tracked yet — showing today\u2019s real totals', W / 2, H - 8);

    const maxVal = Math.max(1, ...seriesKeys.map((k) => metricValue(k).value));
    seriesKeys.forEach((k, i) => {
        const { value } = metricValue(k);
        const y = padT + cH - (value / maxVal) * cH;
        const x = padL + (i / (seriesKeys.length - 1)) * cW;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = SPARK_COLORS[i];
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

/* ── Course performance table ────────────── */

function renderCourseTable() {
    const rows = SNAPSHOT.courses;
    const el   = document.getElementById('courseRows');

    if (!rows.length) {
        el.innerHTML = `<p style="text-align:center;color:var(--slate-4);padding:20px;font-size:13px">No courses yet.</p>`;
        return;
    }

    el.innerHTML = rows.map((c, i) => `
        <div class="course-row" style="animation-delay:${i * 60}ms">
            <div>
                <div class="cr-name" title="${c.name}">${c.name}</div>
            </div>
            <div class="cr-enrolled">
                <strong>${c.enrolled.toLocaleString()}</strong>
                <span>enrolled</span>
            </div>
            <div class="cr-bar-wrap">
                <div class="cr-bar-bg">
                    <div class="cr-bar-fill"
                         data-pct="${c.grade}"
                         style="background:${c.color}"></div>
                </div>
                <span class="cr-pct">${c.grade}% avg</span>
            </div>
            <div class="cr-grade" style="color:${gradeColor(c.grade)}">${c.grade}%</div>
        </div>`).join('');

    requestAnimationFrame(() => {
        setTimeout(() => {
            el.querySelectorAll('.cr-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.pct + '%';
            });
        }, 80);
    });
}

function gradeColor(g) {
    if (g >= 85) return '#16A34A';
    if (g >= 75) return '#2563EB';
    if (g >= 65) return '#EA580C';
    return '#DC2626';
}

/* ── Quick insights ──────────────────────── */

function renderInsights() {
    const items = [
        { icon: '🏆', label: 'Top Course',      value: SNAPSHOT.topCourse, sub: `${SNAPSHOT.courses[0]?.enrolled || 0} students enrolled` },
        { icon: '📤', label: 'Submission Rate', value: `${SNAPSHOT.submissionRate}%`, sub: 'Of assigned work turned in' },
        { icon: '✅', label: 'Pass Rate',        value: `${SNAPSHOT.passRate}%`, sub: 'Graded work scoring \u2265 60%' },
        { icon: '📝', label: 'Grading Progress', value: `${SNAPSHOT.gradingCompletion}%`, sub: 'Of submissions graded so far' },
    ];
    const list = document.getElementById('insightsList');
    list.innerHTML = items.map((item, i) => `
        <div class="insight-item" style="animation-delay:${i * 60}ms">
            <div class="insight-icon">${item.icon}</div>
            <div class="insight-body">
                <div class="insight-label">${item.label}</div>
                <div class="insight-value">${item.value}</div>
                <div class="insight-sub">${item.sub}</div>
            </div>
        </div>`).join('');
}

/* ── Engagement ring (donut) — grading completion ────────── */

function renderEngagementRing() {
    const pct    = SNAPSHOT.gradingCompletion || 0;
    const canvas = document.getElementById('engagementRing');
    const pctEl  = document.getElementById('ringPct');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = 140 * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    const cx = 70, cy = 70, r = 50, lw = 12;
    const startAngle = -Math.PI / 2;
    const dur = 1000;
    const t0  = performance.now();

    function draw(now) {
        const p = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const endAngle = startAngle + (Math.PI * 2 * (pct / 100) * ease);

        ctx.clearRect(0, 0, 140, 140);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth   = lw;
        ctx.stroke();

        if (pct > 0) {
            const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
            grad.addColorStop(0, '#7C3AED');
            grad.addColorStop(1, '#2563EB');

            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.strokeStyle = grad;
            ctx.lineWidth   = lw;
            ctx.lineCap     = 'round';
            ctx.stroke();
        }

        pctEl.textContent = Math.round(pct * ease) + '%';

        if (p < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
}

/* ── Period label ─────────────────────────── */

function updatePeriodLabel(period) {
    const el = document.getElementById('trendPeriodLabel');
    if (el) el.textContent = period;
}

/* ── Master update ───────────────────────── */

function updateAll(period) {
    renderStatCards();
    renderTrendChart();
    renderCourseTable();
    renderInsights();
    renderEngagementRing();
    updatePeriodLabel(period);
}

/* ── Period pill switching ───────────────── */

function initPeriodPills() {
    const pills = document.querySelectorAll('.period-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            if (pill.dataset.value === currentPeriod) return;
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentPeriod = pill.dataset.value;
            // No real per-period history exists yet, so this just
            // re-renders the same live snapshot under the new label.
            updateAll(currentPeriod);
        });
    });
}

/* ── Redraw chart on resize ──────────────── */

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderTrendChart(), 200);
});

/* ── Boot ────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
    applyProfileToNav();
    initPeriodPills();

    const auth = await waitForTalentFlowAuth();
    if (!auth) {
        document.getElementById('statCards').innerHTML =
            `<p style="grid-column:1/-1;color:var(--slate-4);padding:20px">Couldn't connect — please refresh the page.</p>`;
        return;
    }

    let user;
    try {
        user = await auth.requireAuth(); // redirects to login.html if signed out
    } catch (err) {
        console.error('Auth check failed:', err);
        return;
    }
    if (!user) return;
    currentInstructorId = user.uid;

    try {
        await loadSnapshot();
    } catch (err) {
        console.error('Loading performance data failed:', err);
    }

    updateAll(currentPeriod);
});
