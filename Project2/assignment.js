/* ══════════════════════════════════════════
   student-assignment.js
   Talent Flow – Student Assignment Page
══════════════════════════════════════════ */

/* ── Mock assignment data ── */
const ASSIGNMENTS = [
    {
        id: 1,
        title: 'HTML & CSS Portfolio Page',
        course: 'Web Development',
        dueDate: '2026-06-04',
        status: 'pending',
        grade: null,
        feedback: null,
        submittedAt: null,
        gradedAt: null,
    },
    {
        id: 2,
        title: 'JavaScript DOM Manipulation',
        course: 'Web Development',
        dueDate: '2026-06-01',   // today = late
        status: 'late',
        grade: null,
        feedback: null,
        submittedAt: null,
        gradedAt: null,
    },
    {
        id: 3,
        title: 'Data Wrangling with Pandas',
        course: 'Data Science',
        dueDate: '2026-05-28',
        status: 'submitted',
        grade: null,
        feedback: null,
        submittedAt: '2026-05-27T14:32:00',
        gradedAt: null,
    },
    {
        id: 4,
        title: 'Network Security Audit Report',
        course: 'Cyber Security',
        dueDate: '2026-05-20',
        status: 'graded',
        grade: 88,
        feedback: 'Excellent analysis of the vulnerability landscape. Your mitigation strategies were well-researched. Next time, include a section on post-incident recovery procedures.',
        submittedAt: '2026-05-18T09:15:00',
        gradedAt: '2026-05-22T16:40:00',
    },
    {
        id: 5,
        title: 'Cloud Deployment Pipeline',
        course: 'Cloud Computing',
        dueDate: '2026-06-10',
        status: 'pending',
        grade: null,
        feedback: null,
        submittedAt: null,
        gradedAt: null,
    },
    {
        id: 6,
        title: 'Machine Learning Model Evaluation',
        course: 'Data Science',
        dueDate: '2026-05-15',
        status: 'graded',
        grade: 74,
        feedback: 'Good attempt on the confusion matrix. However, the precision/recall trade-off section needed more depth. Your visualisations were clear and informative.',
        submittedAt: '2026-05-14T20:05:00',
        gradedAt: '2026-05-16T11:20:00',
    },
];

/* ── Notification store ── */
let notifications = [];
let activeFilter  = 'all';
let activeSearch  = '';
let currentSubmitId = null;

/* ── Helpers ── */

function daysUntil(dateStr) {
    const now  = new Date();
    now.setHours(0, 0, 0, 0);
    const due  = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.round((due - now) / 86400000);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(isoStr) {
    return new Date(isoStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function gradeLabel(score) {
    if (score >= 90) return 'Outstanding';
    if (score >= 75) return 'Distinction';
    if (score >= 60) return 'Merit';
    if (score >= 50) return 'Pass';
    return 'Needs Improvement';
}

function dueUrgency(days) {
    if (days < 0) return 'late';
    if (days <= 2) return 'urgent';
    if (days <= 5) return 'soon';
    return 'normal';
}

/* ── Render assignment cards ── */

function renderCards() {
    const grid  = document.getElementById('assignmentsGrid');
    const empty = document.getElementById('emptyState');

    const filtered = ASSIGNMENTS.filter(a => {
        const matchFilter = activeFilter === 'all' || a.status === activeFilter;
        const matchSearch = a.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
                            a.course.toLowerCase().includes(activeSearch.toLowerCase());
        return matchFilter && matchSearch;
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';

    filtered.forEach((a, idx) => {
        const card = buildCard(a, idx);
        grid.appendChild(card);
    });

    // Animate grade bars after paint
    requestAnimationFrame(() => {
        document.querySelectorAll('.grade-bar-fill[data-pct]').forEach(el => {
            el.style.width = el.dataset.pct + '%';
        });
    });
}

function buildCard(a, idx) {
    const days = daysUntil(a.dueDate);
    const urgency = dueUrgency(days);

    const card = document.createElement('div');
    card.className = `asgn-card status-${a.status}`;
    card.style.animationDelay = `${idx * 55}ms`;

    // ── Top row
    const statusLabels = { pending: 'Pending', submitted: 'Submitted', graded: 'Graded', late: 'Late' };

    let topHTML = `
        <div class="card-top">
            <p class="card-title">${a.title}</p>
            <span class="status-badge ${a.status}">${statusLabels[a.status]}</span>
        </div>`;

    // ── Meta
    let dueText = '';
    if (a.status === 'pending' || a.status === 'late') {
        if (days < 0) dueText = `${Math.abs(days)}d overdue`;
        else if (days === 0) dueText = 'Due today';
        else if (days === 1) dueText = 'Due tomorrow';
        else dueText = `Due in ${days}d`;
    } else {
        dueText = `Due ${formatDate(a.dueDate)}`;
    }

    const urgencyClass = (a.status === 'pending' || a.status === 'late') ? ` ${urgency}` : '';

    topHTML += `
        <div class="card-meta">
            <div class="meta-item">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>
                </svg>
                <strong>${a.course}</strong>
            </div>
            <div class="meta-item${urgencyClass}">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                <strong>${dueText}</strong>
            </div>
        </div>`;

    // ── Grade / submitted strip
    if (a.status === 'graded') {
        topHTML += `
            <div class="card-grade">
                <div class="grade-score">${a.grade}<span>/100</span></div>
                <div class="grade-bar-wrap">
                    <p class="grade-bar-label">${gradeLabel(a.grade)}</p>
                    <div class="grade-bar-bg">
                        <div class="grade-bar-fill" data-pct="${a.grade}" style="width:0"></div>
                    </div>
                </div>
            </div>`;
    } else if (a.status === 'submitted') {
        topHTML += `
            <div class="card-submitted">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                Submitted ${formatDateTime(a.submittedAt)}
            </div>`;
    }

    // ── Footer buttons
    let footerHTML = '<div class="card-footer">';

    if (a.status === 'pending' || a.status === 'late') {
        footerHTML += `
            <button class="btn-submit" data-id="${a.id}">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
                </svg>
                Submit
            </button>`;
    } else if (a.status === 'submitted') {
        footerHTML += `
            <button class="btn-resubmit" data-id="${a.id}">Resubmit</button>`;
    } else if (a.status === 'graded') {
        footerHTML += `
            <button class="btn-view-grade" data-id="${a.id}">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/>
                </svg>
                View Grade
            </button>`;
    }

    footerHTML += '</div>';

    card.innerHTML = topHTML + footerHTML;

    // Attach events
    const submitBtn     = card.querySelector('.btn-submit');
    const resubmitBtn   = card.querySelector('.btn-resubmit');
    const viewGradeBtn  = card.querySelector('.btn-view-grade');

    if (submitBtn)    submitBtn.addEventListener('click',    () => openSubmitModal(a.id));
    if (resubmitBtn)  resubmitBtn.addEventListener('click',  () => openSubmitModal(a.id));
    if (viewGradeBtn) viewGradeBtn.addEventListener('click', () => openGradeModal(a.id));

    return card;
}

/* ── Update summary chips ── */
function updateChips() {
    document.getElementById('chipPendingCount').textContent   = ASSIGNMENTS.filter(a => a.status === 'pending' || a.status === 'late').length;
    document.getElementById('chipSubmittedCount').textContent = ASSIGNMENTS.filter(a => a.status === 'submitted').length;
    document.getElementById('chipGradedCount').textContent    = ASSIGNMENTS.filter(a => a.status === 'graded').length;
}

/* ── Submit modal ── */
function openSubmitModal(id) {
    const a = ASSIGNMENTS.find(a => a.id === id);
    if (!a) return;
    currentSubmitId = id;

    document.getElementById('submitModalTitle').textContent = a.title;
    document.getElementById('submitModalCourse').textContent = a.course;
    const days = daysUntil(a.dueDate);
    let dueText = `Due ${formatDate(a.dueDate)}`;
    if (days < 0) dueText += ` — ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
    else if (days === 0) dueText += ' — Due today';
    document.getElementById('submitModalDue').textContent = dueText;

    // Reset file UI
    clearFileUI();
    document.getElementById('submitNote').value = '';

    document.getElementById('submitModal').classList.add('open');
}

function closeSubmitModal() {
    document.getElementById('submitModal').classList.remove('open');
    currentSubmitId = null;
}

/* ── File handling ── */
let selectedFile = null;

function clearFileUI() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('uploadZone').style.display  = 'block';
}

function handleFileSelect(file) {
    if (!file) return;
    const MAX = 20 * 1024 * 1024;
    if (file.size > MAX) { showToast('File exceeds 20 MB limit', 'error'); return; }

    selectedFile = file;
    document.getElementById('filePreviewName').textContent = file.name;
    document.getElementById('filePreviewSize').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    document.getElementById('filePreview').style.display = 'flex';
    document.getElementById('uploadZone').style.display  = 'none';
}

/* ── Confirm submission ── */
function handleSubmit() {
    if (!selectedFile) { showToast('Please attach a file first', 'warning'); return; }
    const a = ASSIGNMENTS.find(a => a.id === currentSubmitId);
    if (!a) return;

    // Optimistic update
    a.status      = 'submitted';
    a.submittedAt = new Date().toISOString();

    closeSubmitModal();
    updateChips();
    renderCards();

    showToast(`"${a.title}" submitted successfully!`, 'success');

    // Simulate instructor grading after 8 seconds (demo purposes)
    setTimeout(() => {
        simulateGrading(a.id);
    }, 8000);
}

/* ── Simulate instructor grading ── */
function simulateGrading(id) {
    const a = ASSIGNMENTS.find(a => a.id === id);
    if (!a || a.status !== 'submitted') return;

    const score = Math.floor(Math.random() * 31) + 70; // 70–100
    const feedbacks = [
        'Well-structured submission with clear explanations. Your approach to problem-solving is commendable. Keep up the great work!',
        'Good effort overall. The core concepts are well-understood. Work on edge-case handling and documentation for an even stronger result.',
        'Solid foundation shown here. Your analysis was thorough. Consider exploring alternative approaches in future submissions.',
        'Impressive work! Demonstrates strong command of the subject matter. The practical examples you included were particularly effective.',
    ];

    a.grade     = score;
    a.status    = 'graded';
    a.gradedAt  = new Date().toISOString();
    a.feedback  = feedbacks[Math.floor(Math.random() * feedbacks.length)];

    // Push notification
    addNotification({
        type: 'grade',
        title: 'Assignment Graded',
        text: `"${a.title}" has been marked: ${score}/100 — ${gradeLabel(score)}`,
        time: 'Just now',
    });

    updateChips();
    renderCards();

    showToast(`Your assignment has been graded: ${score}/100`, 'success');
}

/* ── Grade modal ── */
function openGradeModal(id) {
    const a = ASSIGNMENTS.find(a => a.id === id);
    if (!a || a.status !== 'graded') return;

    document.getElementById('gradeModalTitle').textContent   = a.title;
    document.getElementById('gradeModalCourse').textContent  = a.course;
    document.getElementById('gradeScore').textContent        = a.grade;
    document.getElementById('gradeLabel').textContent        = gradeLabel(a.grade);
    document.getElementById('gradeDate').textContent         = `Graded ${formatDateTime(a.gradedAt)}`;
    document.getElementById('feedbackText').textContent      = a.feedback || 'No feedback provided.';

    // Colour the circle by score
    const circle = document.getElementById('gradeCircle');
    if (a.grade >= 75)       circle.style.boxShadow = '0 0 0 4px #BBF7D0';
    else if (a.grade >= 60)  circle.style.boxShadow = '0 0 0 4px #FEF08A';
    else                     circle.style.boxShadow = '0 0 0 4px #FECACA';

    document.getElementById('gradeModal').classList.add('open');
}

function closeGradeModal() {
    document.getElementById('gradeModal').classList.remove('open');
}

/* ── Notifications ── */
function addNotification(n) {
    notifications.unshift({ ...n, id: Date.now(), unread: true });
    renderNotifications();
}

function renderNotifications() {
    const list  = document.getElementById('notifList');
    const badge = document.getElementById('notifBadge');
    const unread = notifications.filter(n => n.unread).length;

    badge.textContent = unread;
    badge.setAttribute('data-count', unread);

    if (notifications.length === 0) {
        list.innerHTML = '<p class="np-empty">No notifications yet</p>';
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="np-item ${n.unread ? 'unread' : ''}">
            <div class="np-dot ${n.type}"></div>
            <div class="np-body">
                <p class="np-title">${n.title}</p>
                <p class="np-text">${n.text}</p>
                <p class="np-time">${n.time}</p>
            </div>
        </div>
    `).join('');
}

/* ── Toast ── */
function showToast(msg, type = 'success') {
    const icons = {
        success: `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`,
        info:    `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></svg>`,
        warning: `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>`,
        error:   `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>`,
    };

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
    document.getElementById('toastContainer').appendChild(t);

    setTimeout(() => {
        t.style.animation = 'toastOut 0.3s ease forwards';
        t.addEventListener('animationend', () => t.remove());
    }, 4000);
}

/* ── Filter & search ── */
function setFilter(f) {
    activeFilter = f;
    document.querySelectorAll('.tab-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.filter === f);
    });
    renderCards();
}

/* ── Nav pop-ups ── */
function setupNavPopups() {
    const avatarBtn    = document.getElementById('avatarBtn');
    const profilePopup = document.getElementById('profilePopup');
    const notifBtn     = document.getElementById('notifBtn');
    const notifPanel   = document.getElementById('notifPanel');

    avatarBtn.addEventListener('click', e => {
        e.stopPropagation();
        profilePopup.classList.toggle('open');
        notifPanel.classList.remove('open');
    });

    notifBtn.addEventListener('click', e => {
        e.stopPropagation();
        notifPanel.classList.toggle('open');
        profilePopup.classList.remove('open');
        // Mark all read when panel opens
        notifications.forEach(n => { n.unread = false; });
        renderNotifications();
    });

    document.addEventListener('click', () => {
        profilePopup.classList.remove('open');
        notifPanel.classList.remove('open');
    });

    document.getElementById('clearNotifs').addEventListener('click', () => {
        notifications = [];
        renderNotifications();
    });
}

/* ── DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {

    // Seed one existing "graded" notification for the graded item already in the data
    addNotification({
        type: 'grade',
        title: 'Assignment Graded',
        text: '"Network Security Audit Report" has been marked: 88/100 — Distinction',
        time: '3 days ago',
    });
    addNotification({
        type: 'grade',
        title: 'Assignment Graded',
        text: '"Machine Learning Model Evaluation" has been marked: 74/100 — Merit',
        time: '5 days ago',
    });

    updateChips();
    renderCards();
    setupNavPopups();

    /* Filter tabs */
    document.getElementById('filterTabs').addEventListener('click', e => {
        const pill = e.target.closest('.tab-pill');
        if (pill) setFilter(pill.dataset.filter);
    });

    /* Search */
    document.getElementById('searchInput').addEventListener('input', e => {
        activeSearch = e.target.value;
        renderCards();
    });

    /* Submit modal — open/close */
    document.getElementById('submitModalClose').addEventListener('click', closeSubmitModal);
    document.getElementById('submitModal').addEventListener('click', e => {
        if (e.target === document.getElementById('submitModal')) closeSubmitModal();
    });

    /* Grade modal — open/close */
    document.getElementById('gradeModalClose').addEventListener('click', closeGradeModal);
    document.getElementById('closeGradeBtn').addEventListener('click', closeGradeModal);
    document.getElementById('gradeModal').addEventListener('click', e => {
        if (e.target === document.getElementById('gradeModal')) closeGradeModal();
    });

    /* Confirm submit */
    document.getElementById('confirmSubmit').addEventListener('click', handleSubmit);

    /* File input */
    const fileInput  = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    const browseLink = document.getElementById('browseLink');
    const fpRemove   = document.getElementById('fpRemove');

    browseLink.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('click', e => {
        if (e.target !== browseLink) fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
    });

    fpRemove.addEventListener('click', clearFileUI);

    /* Drag & drop */
    uploadZone.addEventListener('dragover', e => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
    });

    /* Keyboard close */
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeSubmitModal();
            closeGradeModal();
        }
    });
});
