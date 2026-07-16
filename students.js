/* ─── SAMPLE DATA ─────────────────────── */
const STUDENTS = [];
/* ─── AVATAR COLOUR PALETTE ───────────── */
const AVATAR_COLORS = [
    '#2563EB','#7C3AED','#16A34A','#EA580C',
    '#0891B2','#DB2777','#D97706','#059669',
];

function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

/* ─── GRADE COLOUR ────────────────────── */
function gradeColor(g) {
    if (g >= 85) return '#16A34A';
    if (g >= 70) return '#2563EB';
    if (g >= 55) return '#D97706';
    return '#DC2626';
}

/* ─── STATE ───────────────────────────── */
let currentView   = 'table';
let searchQuery   = '';
let statusFilter  = 'all';
let courseFilter  = 'all';
let sortKey       = 'name';
let sortDir       = 1;          // 1 asc, -1 desc
let currentPage   = 1;
const PER_PAGE    = 8;

/* ─── ELEMENTS ────────────────────────── */
const statCardsEl  = document.getElementById('statCards');
const tableBody    = document.getElementById('tableBody');
const gridWrap     = document.getElementById('gridWrap');
const tableWrap    = document.getElementById('tableWrap');
const emptyState   = document.getElementById('emptyState');
const pagination   = document.getElementById('pagination');
const searchInput  = document.getElementById('searchInput');
const statusSel    = document.getElementById('statusFilter');
const courseSel    = document.getElementById('courseFilter');
const viewTableBtn = document.getElementById('viewTable');
const viewGridBtn  = document.getElementById('viewGrid');

/* ─── STAT CARDS ──────────────────────── */
function renderStatCards() {
    const total    = STUDENTS.length;
    const active   = STUDENTS.filter(s => s.status === 'active').length;
    const avgGrade = Math.round(STUDENTS.reduce((a, s) => a + s.grade, 0) / total);
    const atRisk   = STUDENTS.filter(s => s.status === 'at-risk').length;

    const cards = [
        { label: 'Total Students', value: total,    badge: 'neutral', badgeText: 'All time',    accent: '#2563EB', accentL: '#EFF6FF',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2563EB"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>` },
        { label: 'Active Learners', value: active,   badge: 'up',      badgeText: `${Math.round(active/total*100)}%`,  accent: '#16A34A', accentL: '#F0FDF4',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#16A34A"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>` },
        { label: 'Average Grade', value: `${avgGrade}%`, badge: avgGrade >= 75 ? 'up' : 'warn', badgeText: avgGrade >= 75 ? 'Good' : 'Fair', accent: '#7C3AED', accentL: '#F5F3FF',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#7C3AED"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/></svg>` },
        { label: 'At-Risk Students', value: atRisk,  badge: atRisk > 3 ? 'warn' : 'neutral', badgeText: `Need help`, accent: '#EA580C', accentL: '#FFF7ED',
          icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#EA580C"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>` },
    ];

    statCardsEl.innerHTML = cards.map(c => `
        <div class="stat-card" style="--accent:${c.accent};--accent-l:${c.accentL}">
            <div class="card-top">
                <div class="card-icon">${c.icon}</div>
                <span class="card-badge ${c.badge}">${c.badgeText}</span>
            </div>
            <div class="card-value">${c.value}</div>
            <div class="card-label">${c.label}</div>
        </div>
    `).join('');
}

/* ─── COURSE FILTER DROPDOWN ──────────── */
function populateCourseFilter() {
    COURSES.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = name;
        courseSel.appendChild(opt);
    });
}

/* ─── FILTERED + SORTED STUDENTS ─────── */
function filtered() {
    return STUDENTS
        .filter(s => {
            const q = searchQuery.toLowerCase();
            const matchQ = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
            const matchS = statusFilter === 'all' || s.status === statusFilter;
            const matchC = courseFilter === 'all' || s.courses.includes(Number(courseFilter));
            return matchQ && matchS && matchC;
        })
        .sort((a, b) => {
            let av, bv;
            if (sortKey === 'name')    { av = a.name;     bv = b.name; }
            if (sortKey === 'grade')   { av = a.grade;    bv = b.grade; }
            if (sortKey === 'courses') { av = a.courses.length; bv = b.courses.length; }
            if (sortKey === 'status')  { av = a.status;   bv = b.status; }
            if (sortKey === 'last')    { av = a.last;     bv = b.last; }
            if (av < bv) return -1 * sortDir;
            if (av > bv) return 1 * sortDir;
            return 0;
        });
}

/* ─── AVATAR HTML ─────────────────────── */
function avatarHtml(s, size = 38) {
    if (s.avatar) {
        return `<img class="sr-avatar" src="${s.avatar}" width="${size}" height="${size}"
                     alt="${s.name}" onerror="this.replaceWith(initialsNode('${s.name}', ${size}))">`;
    }
    return `<div class="sr-avatar-initials" style="width:${size}px;height:${size}px;background:${avatarColor(s.name)}">${initials(s.name)}</div>`;
}

function initialsNode(name, size) {
    const d = document.createElement('div');
    d.className = 'sr-avatar-initials';
    d.style.cssText = `width:${size}px;height:${size}px;background:${avatarColor(name)}`;
    d.textContent = initials(name);
    return d;
}

/* ─── TABLE ROW HTML ──────────────────── */
function rowHtml(s, delay) {
    const courseNames = s.courses.map(i => COURSES[i]).join(', ');
    const statusLabel = s.status === 'at-risk' ? 'At Risk' : s.status.charAt(0).toUpperCase() + s.status.slice(1);
    return `
    <div class="student-row" style="animation-delay:${delay}ms">
        <div class="sr-student">
            ${avatarHtml(s)}
            <div>
                <div class="sr-name">${s.name}</div>
                <div class="sr-email">${s.email}</div>
            </div>
        </div>
        <div class="sr-courses">
            ${s.courses.length}
            <span title="${courseNames}">${s.courses.length === 1 ? 'course' : 'courses'}</span>
        </div>
        <div class="sr-grade" style="color:${gradeColor(s.grade)}">${s.grade}%</div>
        <div class="sr-status">
            <span class="status-pill ${s.status}">${statusLabel}</span>
        </div>
        <div class="sr-last">${s.last}</div>
        <div class="sr-actions">
            <button class="action-btn" title="View profile">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                </svg>
            </button>
            <button class="action-btn" title="Send message">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/>
                </svg>
            </button>
        </div>
    </div>`;
}

/* ─── GRID CARD HTML ──────────────────── */
function cardHtml(s) {
    const statusLabel = s.status === 'at-risk' ? 'At Risk' : s.status.charAt(0).toUpperCase() + s.status.slice(1);
    return `
    <div class="student-card">
        <div class="sc-top">
            ${avatarHtml(s, 44)}
            <div class="sc-info">
                <div class="sc-name">${s.name}</div>
                <div class="sc-email">${s.email}</div>
            </div>
        </div>
        <div class="sc-stats">
            <div class="sc-stat">
                <div class="sc-stat-val" style="color:${gradeColor(s.grade)}">${s.grade}%</div>
                <div class="sc-stat-lbl">Grade</div>
            </div>
            <div class="sc-stat">
                <div class="sc-stat-val">${s.courses.length}</div>
                <div class="sc-stat-lbl">Courses</div>
            </div>
            <div class="sc-stat">
                <div class="sc-stat-val" style="font-size:13px;color:var(--slate-5)">${s.last}</div>
                <div class="sc-stat-lbl">Last Active</div>
            </div>
        </div>
        <div class="sc-footer">
            <span class="status-pill ${s.status}">${statusLabel}</span>
            <div style="display:flex;gap:6px">
                <button class="action-btn" title="View profile">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                    </svg>
                </button>
                <button class="action-btn" title="Send message">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>`;
}

/* ─── PAGINATION HTML ─────────────────── */
function renderPagination(total) {
    const pages = Math.ceil(total / PER_PAGE);
    if (pages <= 1) { pagination.innerHTML = ''; return; }

    const start = (currentPage - 1) * PER_PAGE + 1;
    const end   = Math.min(currentPage * PER_PAGE, total);

    let btns = `<button class="page-btn" id="prevBtn" ${currentPage === 1 ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
        </svg>
    </button>`;

    for (let p = 1; p <= pages; p++) {
        btns += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
    }

    btns += `<button class="page-btn" id="nextBtn" ${currentPage === pages ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>
        </svg>
    </button>`;

    pagination.innerHTML = `
        <span class="page-info">Showing ${start}–${end} of ${total} students</span>
        <div class="page-btns">${btns}</div>`;

    pagination.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => { currentPage = +btn.dataset.page; render(); });
    });
    const prev = pagination.querySelector('#prevBtn');
    const next = pagination.querySelector('#nextBtn');
    if (prev) prev.addEventListener('click', () => { currentPage--; render(); });
    if (next) next.addEventListener('click', () => { currentPage++; render(); });
}

/* ─── MAIN RENDER ─────────────────────── */
function render() {
    const list = filtered();
    const isEmpty = list.length === 0;

    emptyState.classList.toggle('visible', isEmpty);

    if (currentView === 'table') {
        tableWrap.style.display = '';
        gridWrap.classList.remove('visible');

        if (!isEmpty) {
            const start = (currentPage - 1) * PER_PAGE;
            const page  = list.slice(start, start + PER_PAGE);
            tableBody.innerHTML = page.map((s, i) => rowHtml(s, i * 40)).join('');
        } else {
            tableBody.innerHTML = '';
        }
        renderPagination(list.length);
    } else {
        tableWrap.style.display = 'none';
        gridWrap.classList.add('visible');
        gridWrap.innerHTML = isEmpty ? '' : list.map(s => cardHtml(s)).join('');
        pagination.innerHTML = '';
    }
}

/* ─── SORT CLICK ──────────────────────── */
document.querySelectorAll('.th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortKey === key) sortDir *= -1;
        else { sortKey = key; sortDir = 1; }
        currentPage = 1;
        render();
    });
});

/* ─── SEARCH ──────────────────────────── */
searchInput.addEventListener('input', () => {
    searchQuery = searchQuery.trim();
    currentPage = 1;
    render();
});

/* ─── FILTERS ─────────────────────────── */
statusSel.addEventListener('change', () => { statusFilter = statusSel.value; currentPage = 1; render(); });
courseSel.addEventListener('change', () => { courseFilter = courseSel.value; currentPage = 1; render(); });

/* ─── VIEW TOGGLE ─────────────────────── */
viewTableBtn.addEventListener('click', () => {
    currentView = 'table';
    viewTableBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    render();
});
viewGridBtn.addEventListener('click', () => {
    currentView = 'grid';
    viewGridBtn.classList.add('active');
    viewTableBtn.classList.remove('active');
    render();
});

/* ─── INIT ────────────────────────────── */
renderStatCards();
populateCourseFilter();
render();

const EJS_KEY      = 'YOUR_PUBLIC_KEY';
const EJS_SERVICE  = 'service_f4dl4md';
const EJS_TEMPLATE = 'YOUR_TEMPLATE_ID';
const SENDER_NAME  = 'CHIME VICTOR CHINAGOROM';
const SENDER_EMAIL = 'victrends365@gmail.com';
const BASE_LINK    = 'https://talentflow.app/join/';

/* ─── INVITE MODAL ────────────────────── */
(function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const overlay        = document.getElementById('inviteOverlay');
    const btnOpen        = document.getElementById('inviteBtn');
    const btnClose       = document.getElementById('modalClose');
    const btnCancel      = document.getElementById('modalCancel');
    const btnSend        = document.getElementById('sendInviteBtn');
    const sendBtnText    = document.getElementById('sendBtnText');
    const tabs           = document.querySelectorAll('.modal-tab');
    const panelEmail     = document.getElementById('panelEmail');
    const panelLink      = document.getElementById('panelLink');
    const progressPanel  = document.getElementById('progressPanel');
    const progressTitle  = document.getElementById('progressTitle');
    const progressNote   = document.getElementById('progressNote');
    const progressList   = document.getElementById('progressList');
    const sendSpinner    = document.getElementById('sendSpinner');
    const progressCheck  = document.getElementById('progressCheck');
    const demoNotice     = document.getElementById('demoNotice');
    const chipInput      = document.getElementById('chipInput');
    const emailTyping    = document.getElementById('emailTypingInput');
    const emailChecks    = document.getElementById('emailCourseChecks');
    const linkChecks     = document.getElementById('linkCourseChecks');
    const copyLinkBtn    = document.getElementById('copyLinkBtn');
    const copyBtnText    = document.getElementById('copyBtnText');
    const footerWrap     = document.getElementById('modalFooterWrap');
    const successPanel   = document.getElementById('modalSuccess');
    const btnDone        = document.getElementById('btnDone');
    const modalTabsEl    = document.querySelector('.modal-tabs');

    let chips               = [];
    let activeTab           = 'email';
    let emailCourseSelected = [];
    let linkCourseSelected  = [];
    let isSending           = false;

    function openModal() {
        resetModal();
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => emailTyping.focus(), 120);
    }

    function closeModal() {
        if (isSending) return;
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    btnOpen.addEventListener('click', openModal);
    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    btnDone.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });

    function resetModal() {
        chips = []; activeTab = 'email';
        emailCourseSelected = []; linkCourseSelected = [];
        isSending = false;
        emailTyping.value = '';
        document.getElementById('personalMsg').value = '';
        chipInput.querySelectorAll('.chip').forEach(c => c.remove());
        chipInput.classList.add('empty');

        progressPanel.classList.add('hidden');
        successPanel.classList.remove('visible');
        panelEmail.classList.remove('hidden');
        panelLink.classList.add('hidden');
        modalTabsEl.style.display = '';
        footerWrap.style.display  = '';
        btnSend.style.display     = '';
        btnCancel.textContent     = 'Cancel';

        sendSpinner.style.display = '';
        progressCheck.classList.add('hidden');
        progressCheck.classList.remove('error-state');
        progressList.innerHTML = '';
        demoNotice.classList.add('hidden');

        buildCourseChecks(emailChecks, emailCourseSelected);
        buildCourseChecks(linkChecks,  linkCourseSelected);
        switchTab('email');
        updateSendBtn();
    }

    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

    function switchTab(name) {
        activeTab = name;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        panelEmail.classList.toggle('hidden', name !== 'email');
        panelLink.classList.toggle('hidden',  name !== 'link');
        updateSendBtn();
    }

    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
    }

    function addChip(raw) {
        const email = raw.trim().replace(/,+$/, '');
        if (!email) return;
        if (!isValidEmail(email)) { shakeChipInput(); return; }
        if (chips.includes(email)) { emailTyping.value = ''; return; }
        chips.push(email);
        renderChips();
        emailTyping.value = '';
        chipInput.classList.remove('empty');
        updateSendBtn();
    }

    function removeChip(email) {
        chips = chips.filter(c => c !== email);
        renderChips();
        chipInput.classList.toggle('empty', chips.length === 0);
        updateSendBtn();
        emailTyping.focus();
    }

    function renderChips() {
        chipInput.querySelectorAll('.chip').forEach(c => c.remove());
        chips.forEach(email => {
            const div = document.createElement('div');
            div.className = 'chip';
            div.innerHTML = `${email}<button class="chip-x" type="button" aria-label="Remove ${email}">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg></button>`;
            div.querySelector('.chip-x').addEventListener('click', () => removeChip(email));
            chipInput.insertBefore(div, emailTyping);
        });
    }

    function shakeChipInput() {
        chipInput.style.borderColor = '#EF4444';
        chipInput.animate(
            [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
             { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' },
             { transform: 'translateX(0)' }],
            { duration: 300, easing: 'ease' }
        );
        setTimeout(() => { chipInput.style.borderColor = ''; }, 700);
    }

    emailTyping.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(emailTyping.value); }
        if (e.key === 'Backspace' && !emailTyping.value && chips.length) removeChip(chips[chips.length - 1]);
    });
    emailTyping.addEventListener('paste', () => {
        setTimeout(() => { emailTyping.value.split(/[\s,;]+/).forEach(addChip); emailTyping.value = ''; }, 0);
    });
    chipInput.addEventListener('click', () => emailTyping.focus());

    function buildCourseChecks(container, selectedArr) {
        container.innerHTML = COURSES.map((name, i) => `
            <label class="course-check-item${selectedArr.includes(i) ? ' checked' : ''}" data-idx="${i}">
                <input type="checkbox" ${selectedArr.includes(i) ? 'checked' : ''}>
                <div class="check-box">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
                    </svg>
                </div>
                <div class="check-name">${name}</div>
            </label>`).join('');

        container.querySelectorAll('.course-check-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = +item.dataset.idx;
                item.classList.toggle('checked');
                item.querySelector('input').checked = item.classList.contains('checked');
                if (item.classList.contains('checked')) {
                    if (!selectedArr.includes(idx)) selectedArr.push(idx);
                } else {
                    const pos = selectedArr.indexOf(idx);
                    if (pos > -1) selectedArr.splice(pos, 1);
                }
            });
        });
    }

    buildCourseChecks(emailChecks, emailCourseSelected);
    buildCourseChecks(linkChecks,  linkCourseSelected);

    function updateSendBtn() {
        if (activeTab === 'email') {
            const n = chips.length;
            btnSend.disabled = n === 0;
            sendBtnText.textContent = n === 0 ? 'Send invite'
                : n === 1 ? 'Send 1 invite'
                : `Send ${n} invites`;
        } else {
            btnSend.disabled = false;
            sendBtnText.textContent = 'Regenerate link';
        }
    }

    function buildProgressList(emailList) {
        progressList.innerHTML = emailList.map(email => `
            <div class="pi-row" data-email="${email.replace(/"/g,'&quot;')}">
                <div class="pi-icon">
                    <div class="pi-spin" style="display:none"></div>
                    <svg class="pi-svg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" stroke="#CBD5E1" stroke-width="2"/>
                    </svg>
                </div>
                <div class="pi-email">${email}</div>
                <span class="pi-badge pending">Pending</span>
            </div>`).join('');
    }

    function setItemStatus(email, status) {
        const row = progressList.querySelector(`[data-email="${email.replace(/"/g,'&quot;')}"]`);
        if (!row) return;
        const spinner = row.querySelector('.pi-spin');
        const svg     = row.querySelector('.pi-svg');
        const badge   = row.querySelector('.pi-badge');
        badge.className = `pi-badge ${status}`;

        if (status === 'sending') {
            spinner.style.display = '';
            svg.style.display = 'none';
            badge.textContent = 'Sending…';
        } else if (status === 'sent') {
            spinner.style.display = 'none';
            svg.style.display = '';
            svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="#16A34A" stroke-width="2"/>`;
            badge.textContent = 'Sent ✓';
        } else if (status === 'failed') {
            spinner.style.display = 'none';
            svg.style.display = '';
            svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" fill="none" stroke="#DC2626" stroke-width="2"/>`;
            badge.textContent = 'Failed';
        }
    }

    function setProgressHead(title, note, icon) {
        progressTitle.textContent = title;
        progressNote.textContent  = note;
        if (icon === 'spinner') {
            sendSpinner.style.display = '';
            progressCheck.classList.add('hidden');
        } else {
            sendSpinner.style.display = 'none';
            progressCheck.classList.remove('hidden');
            progressCheck.classList.toggle('error-state', icon === 'error');
            progressCheck.innerHTML = icon === 'error'
                ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`;
        }
    }

    async function doSendEmails() {
        if (emailTyping.value.trim()) addChip(emailTyping.value);
        if (chips.length === 0) return;

        isSending = true;
        const emailList   = [...chips];
        const courseNames = emailCourseSelected.map(i => COURSES[i]);
        const message     = document.getElementById('personalMsg').value.trim();
        const isDemo      = EJS_KEY === 'YOUR_PUBLIC_KEY';
        const inviteToken = Math.random().toString(36).slice(2, 10);
        const inviteLink  = BASE_LINK + 'inv_' + inviteToken;

        panelEmail.classList.add('hidden');
        modalTabsEl.style.display = 'none';
        progressPanel.classList.remove('hidden');
        footerWrap.style.display  = 'none';

        buildProgressList(emailList);
        setProgressHead(
            `Sending ${emailList.length} invite${emailList.length > 1 ? 's' : ''}…`,
            'Please keep this window open',
            'spinner'
        );

        if (isDemo) demoNotice.classList.remove('hidden');
        else        emailjs.init({ publicKey: EJS_KEY });

        let sentCount = 0, failCount = 0;

        for (let i = 0; i < emailList.length; i++) {
            const email = emailList[i];
            setProgressHead(`Sending ${i + 1} of ${emailList.length}…`, 'Please keep this window open', 'spinner');
            setItemStatus(email, 'sending');

            try {
                if (isDemo) {
                    await sleep(800 + Math.random() * 600);
                } else {
                    await emailjs.send(EJS_SERVICE, EJS_TEMPLATE, {
                        to_name:          email.split('@')[0],
                        to_email:         email,
                        from_name:        SENDER_NAME,
                        reply_to:         SENDER_EMAIL,
                        courses:          courseNames.length
                                            ? courseNames.join(', ')
                                            : 'your enrolled courses',
                        personal_message: message || "You've been invited to join Talent Flow.",
                        invite_link:      inviteLink,
                    });
                }
                setItemStatus(email, 'sent');
                sentCount++;
            } catch (err) {
                console.error('EmailJS error for', email, err);
                setItemStatus(email, 'failed');
                failCount++;
            }
        }

        isSending = false;
        if (failCount === 0) {
            setProgressHead(
                sentCount === 1 ? 'Invite sent!' : `${sentCount} invites sent!`,
                isDemo
                    ? 'Demo mode — add your EmailJS credentials to send real emails.'
                    : 'Students will receive their invitation shortly.',
                'check'
            );
        } else if (sentCount === 0) {
            setProgressHead('Failed to send', 'Check your EmailJS credentials and try again.', 'error');
        } else {
            setProgressHead(`${sentCount} sent, ${failCount} failed`, 'Some invites could not be delivered.', 'check');
        }

        footerWrap.style.display = '';
        btnSend.style.display    = 'none';
        btnCancel.textContent    = 'Close';
    }

    btnSend.addEventListener('click', async () => {
        if (activeTab === 'email') {
            await doSendEmails();
        } else {
            const rand = Math.random().toString(36).slice(2, 10);
            document.getElementById('inviteLink').textContent = `${BASE_LINK}inv_${rand}`;
            copyBtnText.textContent = 'Copy';
            copyLinkBtn.classList.remove('copied');
        }
    });

    copyLinkBtn.addEventListener('click', () => {
        const link = document.getElementById('inviteLink').textContent;
        navigator.clipboard.writeText(link).catch(() => {});
        copyBtnText.textContent = 'Copied!';
        copyLinkBtn.classList.add('copied');
        setTimeout(() => { copyBtnText.textContent = 'Copy'; copyLinkBtn.classList.remove('copied'); }, 2000);
    });
})();