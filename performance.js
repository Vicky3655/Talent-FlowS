/* ═══════════════════════════════════════════
   TALENT FLOW — Performance
   performance.js
═══════════════════════════════════════════ */

/* ── Profile bridge ──────────────────────── */

// Was 'tf_student_profile' — this page is instructor-only, so it was
// reading the wrong bridge key and could never find anything relevant.
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
        badge:   { text: '↑ +12%', cls: 'up' },
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
        key:     'completion',
        label:   'Course Completion',
        accent:  '#7C3AED',
        accentL: '#F5F3FF',
        badge:   { text: '↑ +5%', cls: 'up' },
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
        badge:   { text: 'Live', cls: 'neutral' },
        icon: `<svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="#16A34A">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"/>
               </svg>`,
    },
    {
        key:     'assignments',
        label:   'Assignments Submitted',
        accent:  '#EA580C',
        accentL: '#FFF7ED',
        badge:   { text: 'This week', cls: 'steady' },
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

/* ── Metric time-series data ─────────────── */

const DATA = {
    'Last 7 days': {
        students:    { value: '1,240', badge: '↑ +12%',         points: [30,35,32,40,45,42,55] },
        completion:  { value: '68%',   badge: '↑ +5%',          points: [40,42,44,45,50,55,68] },
        enrolments:  { value: '320',   badge: 'Live',           points: [200,220,240,260,280,300,320] },
        assignments: { value: '89',    badge: 'This week',      points: [10,20,30,45,60,75,89] },
        engagement:  72,
    },
    'Last 30 days': {
        students:    { value: '1,450', badge: '↑ +18%',         points: [20,28,32,36,38,42,50,55,58,60] },
        completion:  { value: '72%',   badge: '↑ +9%',          points: [38,42,45,48,52,56,60,65,70,72] },
        enrolments:  { value: '410',   badge: 'Live',           points: [180,210,250,280,310,340,370,390,400,410] },
        assignments: { value: '214',   badge: 'This month',     points: [20,40,60,90,110,140,160,180,200,214] },
        engagement:  78,
    },
    'Last 3 months': {
        students:    { value: '1,890', badge: '↑ +32%',         points: [800,900,1000,1100,1200,1350,1500,1650,1750,1890] },
        completion:  { value: '75%',   badge: '↑ +12%',         points: [50,55,58,62,65,68,70,72,74,75] },
        enrolments:  { value: '540',   badge: 'Live',           points: [200,250,300,350,390,420,460,490,520,540] },
        assignments: { value: '620',   badge: 'This quarter',   points: [50,100,160,220,290,360,430,510,570,620] },
        engagement:  81,
    },
    'This year': {
        students:    { value: '3,100', badge: '↑ +65%',         points: [400,600,800,1000,1300,1600,1900,2200,2600,3100] },
        completion:  { value: '80%',   badge: '↑ +20%',         points: [40,48,55,60,65,68,72,75,78,80] },
        enrolments:  { value: '870',   badge: 'Live',           points: [100,200,350,450,550,620,700,780,830,870] },
        assignments: { value: '1,840', badge: 'This year',      points: [80,200,380,560,800,1000,1200,1450,1650,1840] },
        engagement:  85,
    },
    'All time': {
        students:    { value: '5,600', badge: 'All time',       points: [200,500,900,1400,2000,2700,3500,4300,4900,5600] },
        completion:  { value: '82%',   badge: 'Avg',            points: [30,40,52,60,65,70,74,78,80,82] },
        enrolments:  { value: '1,200', badge: 'Total active',   points: [100,250,450,650,800,900,1000,1080,1140,1200] },
        assignments: { value: '4,210', badge: 'All time',       points: [100,400,800,1300,1900,2500,3100,3600,3950,4210] },
        engagement:  88,
    },
};

/* ── Course performance data ─────────────── */

const COURSES_DATA = {
    'Last 7 days': [
        { name: 'Introduction to Product Design', enrolled: 124, completion: 78, grade: 84, color: '#2563EB' },
        { name: 'UI/UX Design Fundamentals',      enrolled: 98,  completion: 65, grade: 79, color: '#7C3AED' },
        { name: 'Data Analysis with Python & SQL',enrolled: 76,  completion: 55, grade: 80, color: '#EA580C' },
        { name: 'Frontend Dev for Designers',     enrolled: 87,  completion: 42, grade: 72, color: '#16A34A' },
        { name: 'Cloud Computing & AWS',          enrolled: 56,  completion: 35, grade: 74, color: '#0891B2' },
        { name: 'Intro to Backend Development',   enrolled: 65,  completion: 28, grade: 68, color: '#DC2626' },
    ],
    'Last 30 days': [
        { name: 'Introduction to Product Design', enrolled: 148, completion: 82, grade: 87, color: '#2563EB' },
        { name: 'UI/UX Design Fundamentals',      enrolled: 112, completion: 70, grade: 82, color: '#7C3AED' },
        { name: 'Data Analysis with Python & SQL',enrolled: 94,  completion: 61, grade: 83, color: '#EA580C' },
        { name: 'Frontend Dev for Designers',     enrolled: 105, completion: 50, grade: 75, color: '#16A34A' },
        { name: 'Cloud Computing & AWS',          enrolled: 72,  completion: 42, grade: 77, color: '#0891B2' },
        { name: 'Intro to Backend Development',   enrolled: 80,  completion: 33, grade: 70, color: '#DC2626' },
    ],
    'Last 3 months': [
        { name: 'Introduction to Product Design', enrolled: 180, completion: 85, grade: 88, color: '#2563EB' },
        { name: 'UI/UX Design Fundamentals',      enrolled: 152, completion: 74, grade: 84, color: '#7C3AED' },
        { name: 'Data Analysis with Python & SQL',enrolled: 130, completion: 67, grade: 85, color: '#EA580C' },
        { name: 'Frontend Dev for Designers',     enrolled: 140, completion: 56, grade: 77, color: '#16A34A' },
        { name: 'Cloud Computing & AWS',          enrolled: 98,  completion: 48, grade: 79, color: '#0891B2' },
        { name: 'Intro to Backend Development',   enrolled: 110, completion: 39, grade: 72, color: '#DC2626' },
    ],
    'This year': [
        { name: 'Introduction to Product Design', enrolled: 420, completion: 88, grade: 89, color: '#2563EB' },
        { name: 'UI/UX Design Fundamentals',      enrolled: 360, completion: 80, grade: 85, color: '#7C3AED' },
        { name: 'Data Analysis with Python & SQL',enrolled: 310, completion: 72, grade: 86, color: '#EA580C' },
        { name: 'Frontend Dev for Designers',     enrolled: 340, completion: 63, grade: 79, color: '#16A34A' },
        { name: 'Cloud Computing & AWS',          enrolled: 240, completion: 55, grade: 81, color: '#0891B2' },
        { name: 'Intro to Backend Development',   enrolled: 420, completion: 33, grade: 70, color: '#DC2626' },
    ],
    'All time': [
        { name: 'Introduction to Product Design', enrolled: 980, completion: 90, grade: 91, color: '#2563EB' },
        { name: 'UI/UX Design Fundamentals',      enrolled: 840, completion: 83, grade: 86, color: '#7C3AED' },
        { name: 'Data Analysis with Python & SQL',enrolled: 720, completion: 75, grade: 87, color: '#EA580C' },
        { name: 'Frontend Dev for Designers',     enrolled: 790, completion: 68, grade: 80, color: '#16A34A' },
        { name: 'Cloud Computing & AWS',          enrolled: 560, completion: 60, grade: 82, color: '#0891B2' },
        { name: 'Intro to Backend Development',   enrolled: 630, completion: 50, grade: 76, color: '#DC2626' },
    ],
};

/* ── Quick insights data ─────────────────── */

const INSIGHTS_DATA = {
    'Last 7 days':   [
        { icon: '🏆', label: 'Top Course',       value: 'Product Design',  sub: '78% completion rate' },
        { icon: '📅', label: 'Most Active Day',  value: 'Wednesday',       sub: '4.5h avg learning time' },
        { icon: '📤', label: 'Submission Rate',  value: '94%',             sub: 'On-time submissions' },
        { icon: '✅', label: 'Pass Rate',         value: '88%',             sub: 'Students scoring ≥ 60%' },
    ],
    'Last 30 days':  [
        { icon: '🏆', label: 'Top Course',       value: 'Product Design',  sub: '82% completion rate' },
        { icon: '📅', label: 'Most Active Day',  value: 'Tuesday',         sub: '5.1h avg learning time' },
        { icon: '📤', label: 'Submission Rate',  value: '91%',             sub: 'On-time submissions' },
        { icon: '✅', label: 'Pass Rate',         value: '90%',             sub: 'Students scoring ≥ 60%' },
    ],
    'Last 3 months': [
        { icon: '🏆', label: 'Top Course',       value: 'Product Design',  sub: '85% completion rate' },
        { icon: '📅', label: 'Most Active Day',  value: 'Thursday',        sub: '5.8h avg learning time' },
        { icon: '📤', label: 'Submission Rate',  value: '89%',             sub: 'On-time submissions' },
        { icon: '✅', label: 'Pass Rate',         value: '91%',             sub: 'Students scoring ≥ 60%' },
    ],
    'This year': [
        { icon: '🏆', label: 'Top Course',       value: 'Product Design',  sub: '88% completion rate' },
        { icon: '📅', label: 'Most Active Day',  value: 'Monday',          sub: '6.2h avg learning time' },
        { icon: '📤', label: 'Submission Rate',  value: '93%',             sub: 'On-time submissions' },
        { icon: '✅', label: 'Pass Rate',         value: '92%',             sub: 'Students scoring ≥ 60%' },
    ],
    'All time': [
        { icon: '🏆', label: 'Top Course',       value: 'Product Design',  sub: '90% completion rate' },
        { icon: '📅', label: 'Most Active Day',  value: 'Wednesday',       sub: '6.8h avg learning time' },
        { icon: '📤', label: 'Submission Rate',  value: '95%',             sub: 'On-time submissions' },
        { icon: '✅', label: 'Pass Rate',         value: '94%',             sub: 'Students scoring ≥ 60%' },
    ],
};

/* ── State ───────────────────────────────── */

let currentPeriod = 'Last 7 days';
let trendRafId    = null; // cancel previous chart animation

/* ── Counter animation ───────────────────── */

function animateCounter(el, endStr, delay = 0) {
    const isPercent = endStr.includes('%');
    const hasComma  = endStr.includes(',');
    const end       = parseInt(endStr.replace(/[^0-9]/g, ''), 10);
    const dur       = 900;

    setTimeout(() => {
        const t0 = performance.now();
        function step(now) {
            const p    = Math.min((now - t0) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            let   cur  = Math.round(end * ease);
            let   txt  = cur.toString();
            if (hasComma && cur >= 1000)
                txt = cur.toLocaleString('en-US');
            if (isPercent) txt += '%';
            el.textContent = txt;
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }, delay);
}

/* ── Sparkline ───────────────────────────── */

function drawSparkline(canvas, points, color) {
    const ctx = canvas.getContext('2d');
    const W   = canvas.offsetWidth  || canvas.width;
    const H   = canvas.offsetHeight || canvas.height;
    canvas.width  = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    if (points.length < 2) return;
    const min   = Math.min(...points);
    const max   = Math.max(...points);
    const range = max - min || 1;
    const pad   = 2;

    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
    const ys = points.map(v => H - pad - ((v - min) / range) * (H - pad * 2));

    /* gradient fill */
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '50');
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

    /* stroke */
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

/* ── Stat cards ──────────────────────────── */

function renderStatCards(period) {
    const d      = DATA[period];
    const container = document.getElementById('statCards');
    container.innerHTML = METRICS.map((m, i) => {
        const info = d[m.key];
        return `
        <div class="stat-card" style="--accent:${m.accent};--accent-l:${m.accentL};animation-delay:${i * 70}ms">
            <div class="card-top">
                <div class="card-icon">${m.icon}</div>
                <span class="card-badge ${m.badge.cls}">${info.badge}</span>
            </div>
            <div class="card-value" id="cv-${m.key}">0</div>
            <div class="card-label">${m.label}</div>
            <div class="card-spark"><canvas id="cs-${m.key}" height="52"></canvas></div>
        </div>`;
    }).join('');

    /* animate numbers + sparklines */
    METRICS.forEach((m, i) => {
        const info = d[m.key];
        animateCounter(document.getElementById('cv-' + m.key), info.value, i * 70);
        setTimeout(() => {
            const canvas = document.getElementById('cs-' + m.key);
            if (canvas) drawSparkline(canvas, info.points, m.accent);
        }, 200 + i * 70);
    });
}

/* ── Trend chart ─────────────────────────── */

function renderTrendChart(period) {
    const d      = DATA[period];
    const canvas = document.getElementById('trendCanvas');
    if (!canvas) return;

    /* size canvas to its CSS container */
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;

    const seriesColors = ['#2563EB', '#7C3AED', '#16A34A', '#EA580C'];
    const seriesKeys   = ['students', 'completion', 'enrolments', 'assignments'];
    const seriesLabels = ['Students', 'Completion', 'Enrolments', 'Assignments'];

    /* update legend */
    const legend = document.getElementById('chartLegend');
    legend.innerHTML = seriesKeys.map((k, i) => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${seriesColors[i]}"></div>
            ${seriesLabels[i]}
        </div>`).join('');

    /* normalise each series independently */
    const series = seriesKeys.map(k => {
        const pts = d[k].points;
        const mn  = Math.min(...pts), mx = Math.max(...pts);
        return pts.map(v => (v - mn) / (mx - mn || 1));
    });

    const nPts = series[0].length;
    const padL = 40, padR = 20, padT = 14, padB = 32;
    const cW   = W - padL - padR;
    const cH   = H - padT - padB;

    function xOf(i) { return padL + (i / (nPts - 1)) * cW; }
    function yOf(v) { return padT + (1 - v) * cH; }

    /* grid y-lines */
    function drawGrid() {
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth   = 1;
        [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
            const y = yOf(frac);
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();
        });

        /* x axis labels (generic) */
        const xLabels = nPts === 7
            ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
            : Array.from({ length: nPts }, (_, i) => `W${i + 1}`);
        ctx.font      = '500 10px Inter, sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.textAlign = 'center';
        xLabels.forEach((lbl, i) => ctx.fillText(lbl, xOf(i), H - 8));
    }

    /* draw single bezier series */
    function drawSeries(pts, color, progress) {
        const n = pts.length;
        /* clip to progress (animate left-to-right) */
        ctx.save();
        ctx.beginPath();
        ctx.rect(padL, 0, cW * progress, H);
        ctx.clip();

        /* fill */
        const grad = ctx.createLinearGradient(0, padT, 0, padT + cH);
        grad.addColorStop(0, color + '30');
        grad.addColorStop(1, color + '04');

        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(pts[0]));
        for (let i = 1; i < n; i++) {
            const cx = (xOf(i - 1) + xOf(i)) / 2;
            ctx.bezierCurveTo(cx, yOf(pts[i - 1]), cx, yOf(pts[i]), xOf(i), yOf(pts[i]));
        }
        ctx.lineTo(xOf(n - 1), padT + cH);
        ctx.lineTo(xOf(0), padT + cH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        /* stroke */
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(pts[0]));
        for (let i = 1; i < n; i++) {
            const cx = (xOf(i - 1) + xOf(i)) / 2;
            ctx.bezierCurveTo(cx, yOf(pts[i - 1]), cx, yOf(pts[i]), xOf(i), yOf(pts[i]));
        }
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2.2;
        ctx.stroke();
        ctx.restore();
    }

    /* draw end-point dots */
    function drawDots(pts, color) {
        const last = pts.length - 1;
        ctx.beginPath();
        ctx.arc(xOf(last), yOf(pts[last]), 4.5, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.strokeStyle = 'white';
        ctx.lineWidth   = 2;
        ctx.fill();
        ctx.stroke();
    }

    /* animation loop */
    if (trendRafId) cancelAnimationFrame(trendRafId);
    const dur = 1000, t0 = performance.now();

    function frame(now) {
        const p    = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);

        ctx.clearRect(0, 0, W, H);
        drawGrid();
        series.forEach((pts, i) => drawSeries(pts, seriesColors[i], ease));
        if (p >= 1) series.forEach((pts, i) => drawDots(pts, seriesColors[i]));
        if (p < 1)  trendRafId = requestAnimationFrame(frame);
    }

    trendRafId = requestAnimationFrame(frame);
}

/* ── Course performance table ────────────── */

function renderCourseTable(period) {
    const rows = [...(COURSES_DATA[period] || [])].sort((a, b) => b.completion - a.completion);
    const el   = document.getElementById('courseRows');

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
                         data-pct="${c.completion}"
                         style="background:${c.color}"></div>
                </div>
                <span class="cr-pct">${c.completion}%</span>
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

function renderInsights(period) {
    const items = INSIGHTS_DATA[period] || [];
    const list  = document.getElementById('insightsList');
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

/* ── Engagement ring (donut) ─────────────── */

function renderEngagementRing(period) {
    const pct    = DATA[period].engagement || 0;
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

        /* track */
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth   = lw;
        ctx.stroke();

        /* filled arc */
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

        /* counter */
        pctEl.textContent = Math.round(pct * ease) + '%';

        if (p < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
}

/* ── Period label (trend section) ────────── */

function updatePeriodLabel(period) {
    const el = document.getElementById('trendPeriodLabel');
    if (el) el.textContent = period;
}

/* ── Master update ───────────────────────── */

function updateAll(period) {
    renderStatCards(period);
    renderTrendChart(period);
    renderCourseTable(period);
    renderInsights(period);
    renderEngagementRing(period);
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
            updateAll(currentPeriod);
        });
    });
}

/* ── Redraw chart on resize ──────────────── */

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderTrendChart(currentPeriod), 200);
});

/* ── Mobile sidebar toggle ─────────────────── */

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    if (!hamburger || !overlay || !sidebar) return;
    hamburger.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        document.body.style.overflow = 'hidden';
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        document.body.style.overflow = '';
    });
}

/* ── Boot ────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    applyProfileToNav();
    initPeriodPills();
    initMobileMenu();
    updateAll(currentPeriod);
});
