/* ═══════════════════════════════════════════════════════════
   TALENT FLOW — Instructor Assignments
   instructor-assignments.js
═══════════════════════════════════════════════════════════ */

// auth.js is an ES module fetching an external dependency, so there's
// no hard guarantee window.TalentFlowAuth exists the instant this
// script runs. Poll briefly instead of assuming it's already there.
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

/* ── Profile bridge ─────────────────────────────────────────── */

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

/* ── QUICK FEEDBACK TEMPLATES ─────────────────────────────── */

const QUICK_FEEDBACK = [
    'Great work overall!',
    'Well-structured submission.',
    'Needs more detail.',
    'Please revise and resubmit.',
    'Outstanding effort!',
    'Missing key requirements.',
    'Excellent research depth.',
    'Review the rubric criteria.',
];

/* ── STATE ───────────────────────────────────────────────── */

let assignments = [];          // populated from Supabase once auth resolves — see init() below
let enrolledStudents = [];     // real students enrolled in this instructor's courses
let courseOptions = [];        // [{id, title}] this instructor's real courses
let currentInstructorId = null;
let currentFilter = 'all';
let currentSearch = '';
let sortField = 'title';
let sortAsc   = true;
let activeGradeAssignmentId = null; // which assignment is open in grade modal

/* ── STORAGE ─────────────────────────────────────────────── */
// Supabase owns persistence now (see data-store.js). Each mutation
// below calls TalentFlowData directly, since every edit here only
// touches its own row.

async function init() {
    applyProfileToNav();

    const auth = await waitForTalentFlowAuth();
    if (!auth) {
        showToast('⚠️ Could not connect — please refresh the page');
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
        const [loadedAssignments, courses, students] = await Promise.all([
            TalentFlowData.getAssignments(currentInstructorId),
            TalentFlowData.getCourses(currentInstructorId),
            TalentFlowData.getStudentsForInstructor(currentInstructorId).catch((err) => {
                console.error('Could not load enrolled students:', err);
                return [];
            }),
        ]);
        assignments = loadedAssignments;
        courseOptions = courses.map(c => ({ id: c.id, title: c.title }));
        enrolledStudents = students;
    } catch (err) {
        console.error('Loading assignments failed:', err);
        showToast('Could not load assignments — check your connection');
    }

    populateCourseSelect();
    render();
}

function populateCourseSelect() {
    const sel = document.getElementById('f-course');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Select a course…</option>' +
        courseOptions.map(c => `<option value="${escapeHtml(c.title)}">${escapeHtml(c.title)}</option>`).join('');
    if (current && courseOptions.some(c => c.title === current)) sel.value = current;
}

/* ── HELPERS ─────────────────────────────────────────────── */

function offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function uid() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function getStudent(id) {
    return enrolledStudents.find(s => s.id === id) || { id, name: 'Unknown Student', avatar: '' };
}

function studentAvatarSrc(student) {
    if (student.avatar) return student.avatar;
    return window.TalentFlowAuth?.initialsAvatar ? window.TalentFlowAuth.initialsAvatar(student.name || '?') : '';
}

function pendingCount(a) {
    return a.submissions.filter(s => s.submittedAt && s.score === null).length;
}

function gradedCount(a) {
    return a.submissions.filter(s => s.score !== null).length;
}

function avgScore(a) {
    const graded = a.submissions.filter(s => s.score !== null);
    if (!graded.length) return null;
    return Math.round(graded.reduce((sum, s) => sum + s.score, 0) / graded.length);
}

/* ── RENDER: SUMMARY CARDS ───────────────────────────────── */

function renderSummaryCards() {
    const total   = assignments.length;
    const pending = assignments.reduce((n, a) => n + pendingCount(a), 0);
    const graded  = assignments.reduce((n, a) => n + gradedCount(a), 0);

    const allGraded = assignments.flatMap(a => a.submissions.filter(s => s.score !== null));
    const avg = allGraded.length
        ? Math.round(allGraded.reduce((sum, s) => sum + s.score, 0) / allGraded.length)
        : null;

    animateNumber('statTotal',   total);
    animateNumber('statPending', pending);
    animateNumber('statGraded',  graded);
    document.getElementById('statAvg').textContent = avg !== null ? avg + '%' : '—';
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const dur = 600;
    const t0  = performance.now();
    const step = now => {
        const p = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (target - start) * ease);
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/* ── RENDER: ASSIGNMENT TABLE ────────────────────────────── */

function renderTable() {
    const body = document.getElementById('tableBody');
    const empty = document.getElementById('emptyState');

    let list = assignments.filter(a => {
        const matchFilter = currentFilter === 'all' || a.status === currentFilter;
        const q = currentSearch.toLowerCase();
        const matchSearch = !q ||
            a.title.toLowerCase().includes(q) ||
            a.course.toLowerCase().includes(q) ||
            a.status.toLowerCase().includes(q);
        return matchFilter && matchSearch;
    });

    list.sort((a, b) => {
        let va = a[sortField] || '', vb = b[sortField] || '';
        if (sortField === 'dueDate') { va = new Date(va); vb = new Date(vb); }
        if (va < vb) return sortAsc ? -1 : 1;
        if (va > vb) return sortAsc ?  1 : -1;
        return 0;
    });

    if (!list.length) {
        body.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    const pc = pendingCount, gc = gradedCount;

    body.innerHTML = list.map((a, i) => {
        const pending = pc(a);
        const total   = a.submissions.filter(s => s.submittedAt).length;
        const allDone = pending === 0 && total > 0;

        let subClass = 'no-subs', subText = 'No submissions';
        if (total > 0 && pending > 0) { subClass = 'has-pending'; subText = `${pending} pending`; }
        else if (allDone)             { subClass = 'all-graded';  subText = `${total} graded`; }
        else if (total > 0)           { subClass = 'all-graded';  subText = `${total} submitted`; }

        return `
        <div class="assignment-row" style="animation-delay:${i * 40}ms" data-id="${a.id}">
            <div>
                <div class="row-title">${escapeHtml(a.title)}</div>
                <div class="row-course">${escapeHtml(a.course)}</div>
            </div>
            <div class="row-due">${formatDate(a.dueDate)}</div>
            <div class="row-sub">
                <span class="sub-count ${subClass}">${subText}</span>
            </div>
            <div class="row-status"><span class="status-badge ${a.status}">${capitalize(a.status)}</span></div>
            <div class="row-actions">
                <button class="action-btn grade" onclick="openGradeModal('${a.id}')">Grade</button>
                <button class="action-btn edit"  onclick="openEditModal('${a.id}')">Edit</button>
                <button class="action-btn delete" onclick="deleteAssignment('${a.id}')">Delete</button>
            </div>
        </div>`;
    }).join('');
}

function render() {
    renderSummaryCards();
    renderTable();
}

/* ── MODAL HELPERS ───────────────────────────────────────── */

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
    const closeId = e.target.dataset.close;
    if (closeId) closeModal(closeId);

    // Click outside modal content closes it
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('open');
    }
});

/* ── CREATE / EDIT MODAL ─────────────────────────────────── */

let editingId = null;

function openCreateModal() {
    editingId = null;
    document.getElementById('createModalTitle').textContent = 'Create Assignment';
    document.getElementById('createSubmitBtn').textContent = 'Create Assignment';
    document.getElementById('createForm').reset();
    populateCourseSelect();
    openModal('createModal');
}

function openEditModal(id) {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    editingId = id;

    document.getElementById('createModalTitle').textContent = 'Edit Assignment';
    document.getElementById('createSubmitBtn').textContent  = 'Save Changes';

    populateCourseSelect();
    document.getElementById('f-title').value        = a.title;
    document.getElementById('f-course').value       = a.course;
    document.getElementById('f-instructions').value = a.instructions || '';
    document.getElementById('f-dueDate').value      = a.dueDate;
    document.getElementById('f-maxScore').value     = a.maxScore || 100;
    document.getElementById('f-status').value       = a.status;
    document.querySelector(`input[name="assignTo"][value="${a.assignTo || 'all'}"]`).checked = true;

    openModal('createModal');
}

document.getElementById('createForm').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);

    const assignmentData = {
        title:        fd.get('title'),
        course:       fd.get('course'),
        instructions: fd.get('instructions'),
        dueDate:      fd.get('dueDate'),
        maxScore:     parseInt(fd.get('maxScore')) || 100,
        assignTo:     fd.get('assignTo'),
        status:       fd.get('status'),
    };

    const submitBtn = document.getElementById('createSubmitBtn');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
        if (editingId) {
            await TalentFlowData.saveAssignment(currentInstructorId, assignmentData, editingId);
            const a = assignments.find(x => x.id === editingId);
            if (a) Object.assign(a, assignmentData);
            showToast('✏️ Assignment updated');
        } else {
            const newId = await TalentFlowData.saveAssignment(currentInstructorId, {
                ...assignmentData,
                submissions: [],
            });
            assignments.push({ id: newId, ...assignmentData, submissions: [] });
            showToast('✅ Assignment created');
        }
        render();
        closeModal('createModal');
        e.target.reset();
    } catch (err) {
        console.error('Saving assignment failed:', err);
        showToast('⚠️ Could not save — please try again');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
    }
});

/* ── DELETE ──────────────────────────────────────────────── */

async function deleteAssignment(id) {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;

    try {
        await TalentFlowData.deleteAssignmentDoc(id);
        assignments = assignments.filter(x => x.id !== id);
        render();
        showToast('🗑️ Assignment deleted');
    } catch (err) {
        console.error('Deleting assignment failed:', err);
        showToast('⚠️ Could not delete — please try again');
    }
}

/* ── GRADE MODAL (submission list) ──────────────────────── */

function openGradeModal(id) {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    activeGradeAssignmentId = id;

    document.getElementById('gradeModalTitle').textContent = a.title;
    document.getElementById('gradeModalSub').textContent   = a.course + ' · Max score: ' + (a.maxScore || 100);

    const submitted = a.submissions.filter(s => s.submittedAt).length;
    const pending   = pendingCount(a);
    document.getElementById('gmSubmitted').textContent = submitted + ' submitted';
    document.getElementById('gmPending').textContent   = pending + ' pending';

    const list = document.getElementById('submissionsList');

    // Show all enrolled students; not-submitted ones shown separately
    const submittedStudents = a.submissions.filter(s => s.submittedAt);
    const notSubmitted = enrolledStudents.filter(
        st => !a.submissions.some(s => s.studentId === st.id && s.submittedAt)
    );

    let html = '';

    if (submittedStudents.length) {
        html += `<p style="font-size:12px;font-weight:600;color:var(--slate-4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;padding:0 4px">Submitted</p>`;
        html += submittedStudents.map(sub => {
            const student = getStudent(sub.studentId);
            const isGraded = sub.score !== null;
            const scoreLabel = isGraded
                ? `<span class="sub-grade-display graded">${sub.score}/${a.maxScore || 100}</span>`
                : `<span class="sub-grade-display pending">Pending</span>`;
            const btn = isGraded
                ? `<button class="grade-action-btn re-grade" onclick="openSingleGrade('${a.id}','${sub.studentId}')">Update</button>`
                : `<button class="grade-action-btn give-grade" onclick="openSingleGrade('${a.id}','${sub.studentId}')">Grade</button>`;
            return `
            <div class="sub-row">
                <div class="sub-student">
                    <img class="sub-avatar" src="${studentAvatarSrc(student)}" alt="${escapeHtml(student.name)}">
                    <div>
                        <div class="sub-name">${escapeHtml(student.name)}</div>
                        <div class="sub-date">Submitted ${formatDate(sub.submittedAt)}${isGraded ? ' · Graded' : ''}</div>
                    </div>
                </div>
                <div class="sub-row-end">
                    ${scoreLabel}
                    ${btn}
                </div>
            </div>`;
        }).join('');
    }

    if (notSubmitted.length) {
        html += `<p style="font-size:12px;font-weight:600;color:var(--slate-4);text-transform:uppercase;letter-spacing:.05em;margin:16px 0 8px;padding:0 4px">Not submitted</p>`;
        html += notSubmitted.map(st => `
            <div class="sub-row" style="opacity:.55">
                <div class="sub-student">
                    <img class="sub-avatar" src="${studentAvatarSrc(st)}" alt="${escapeHtml(st.name)}">
                    <div>
                        <div class="sub-name">${escapeHtml(st.name)}</div>
                        <div class="sub-date">No submission yet</div>
                    </div>
                </div>
                <div class="sub-row-end">
                    <span class="sub-grade-display pending">—</span>
                    <button class="grade-action-btn re-grade" onclick="addManualSubmission('${a.id}','${st.id}')">Add manually</button>
                </div>
            </div>`).join('');
    }

    if (!html) html = '<p style="text-align:center;color:var(--slate-4);padding:32px">No students are enrolled in this course yet.</p>';

    list.innerHTML = html;
    openModal('gradeModal');
}

// Allow instructor to manually record a submission for absent uploads
async function addManualSubmission(aId, sId) {
    const a = assignments.find(x => x.id === aId);
    if (!a) return;
    let sub = a.submissions.find(s => s.studentId === sId);
    if (!sub) {
        sub = { studentId: sId, submittedAt: new Date().toISOString().split('T')[0], score: null, feedback: '',
                submissionText: '', submissionLink: '' };
        a.submissions.push(sub);
        try {
            await TalentFlowData.updateSubmissions(aId, a.submissions);
        } catch (err) {
            console.error('Saving manual submission failed:', err);
            showToast('⚠️ Could not save — try again');
        }
    }
    openGradeModal(aId); // refresh the list
    openSingleGrade(aId, sId);
}

/* ── SINGLE GRADE MODAL ──────────────────────────────────── */

function openSingleGrade(aId, sId) {
    const a = assignments.find(x => x.id === aId);
    if (!a) return;
    const sub     = a.submissions.find(s => s.studentId === sId);
    const student = getStudent(sId);

    document.getElementById('sg-assignmentId').value = aId;
    document.getElementById('sg-studentId').value    = sId;
    document.getElementById('sg-maxDisplay').textContent = a.maxScore || 100;

    const scoreInput = document.getElementById('sg-score');
    scoreInput.max   = a.maxScore || 100;
    scoreInput.value = sub?.score !== null && sub?.score !== undefined ? sub.score : '';

    document.getElementById('sg-feedback').value = sub?.feedback || '';

    // Header
    document.getElementById('sgHeader').innerHTML = `
        <img class="sgh-avatar" src="${studentAvatarSrc(student)}" alt="${escapeHtml(student.name)}">
        <div>
            <div class="sgh-name">${escapeHtml(student.name)}</div>
            <div class="sgh-course">${escapeHtml(a.title)} · ${escapeHtml(a.course)}</div>
        </div>`;

    // What the student actually submitted, shown read-only above the
    // grading form so the instructor reads it before scoring.
    const contentEl = document.getElementById('sgSubmissionContent');
    const linkEl    = document.getElementById('sgSubmissionLink');
    const linkLabel = document.getElementById('sgSubmissionLinkLabel');

    if (sub?.submissionText) {
        contentEl.textContent = sub.submissionText;
        contentEl.classList.remove('sp-empty');
    } else if (sub) {
        contentEl.textContent = 'No written submission on file — this entry was added manually by the instructor.';
        contentEl.classList.add('sp-empty');
    } else {
        contentEl.textContent = 'This student has not submitted anything yet.';
        contentEl.classList.add('sp-empty');
    }

    if (sub?.submissionLink) {
        linkEl.href = sub.submissionLink;
        linkLabel.textContent = sub.submissionLink.replace(/^https?:\/\//, '');
        linkEl.hidden = false;
    } else {
        linkEl.hidden = true;
    }

    updateScoreBar();

    // Quick feedback chips
    const chips = document.getElementById('qfChips');
    chips.innerHTML = QUICK_FEEDBACK.map(t =>
        `<button type="button" class="qf-chip" data-text="${escapeHtml(t)}">${escapeHtml(t)}</button>`
    ).join('');

    openModal('singleGradeModal');
}

function appendFeedback(text) {
    const ta = document.getElementById('sg-feedback');
    ta.value = ta.value ? ta.value + ' ' + text : text;
    ta.focus();
}

// Delegated listener: handles every .qf-chip, including ones re-rendered
// each time the grade modal opens for a different student.
document.getElementById('qfChips').addEventListener('click', e => {
    const chip = e.target.closest('.qf-chip');
    if (!chip) return;
    appendFeedback(chip.dataset.text);
});

function updateScoreBar() {
    const scoreInput = document.getElementById('sg-score');
    const maxEl      = document.getElementById('sg-maxDisplay');
    const fill       = document.getElementById('sg-barFill');
    const pct        = document.getElementById('sg-pctLabel');

    const max  = parseInt(maxEl.textContent) || 100;
    const val  = parseInt(scoreInput.value);

    if (isNaN(val)) {
        fill.style.width = '0%';
        fill.style.background = 'var(--slate-3)';
        pct.textContent = '—';
        return;
    }

    const p = Math.min(100, Math.max(0, Math.round((val / max) * 100)));
    fill.style.width = p + '%';
    pct.textContent  = p + '%';
    fill.style.background =
        p >= 80 ? 'var(--green)' :
        p >= 60 ? 'var(--blue)' :
        p >= 40 ? 'var(--amber)' : 'var(--red)';
}

document.getElementById('sg-score').addEventListener('input', updateScoreBar);

document.getElementById('gradeForm').addEventListener('submit', async e => {
    e.preventDefault();
    const aId     = document.getElementById('sg-assignmentId').value;
    const sId     = document.getElementById('sg-studentId').value;
    const scoreRaw = parseInt(document.getElementById('sg-score').value);
    const feedback = document.getElementById('sg-feedback').value.trim();

    const a = assignments.find(x => x.id === aId);
    if (!a) return;

    const max = a.maxScore || 100;
    if (isNaN(scoreRaw) || scoreRaw < 0 || scoreRaw > max) {
        showToast(`⚠️ Score must be between 0 and ${max}`);
        return;
    }

    let sub = a.submissions.find(s => s.studentId === sId);
    if (!sub) {
        sub = { studentId: sId, submittedAt: offsetDate(0), score: null, feedback: '' };
        a.submissions.push(sub);
    }

    sub.score    = scoreRaw;
    sub.feedback = feedback;
    sub.gradedAt = new Date().toISOString();

    try {
        await TalentFlowData.updateSubmissions(aId, a.submissions);
        render();
        closeModal('singleGradeModal');

        // Refresh grade modal if still open
        if (activeGradeAssignmentId === aId) {
            openGradeModal(aId);
        }

        const student = getStudent(sId);
        showToast(`✅ Grade saved for ${student.name} — ${scoreRaw}/${max}`);
    } catch (err) {
        console.error('Saving grade failed:', err);
        showToast('⚠️ Could not save this grade — please try again');
    }
});

/* ── FILTERS ─────────────────────────────────────────────── */

document.getElementById('filterBtns').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
});

/* ── SEARCH ──────────────────────────────────────────────── */

document.getElementById('searchInput').addEventListener('input', e => {
    currentSearch = e.target.value.toLowerCase().trim();
    render();
});

/* ── SORT ────────────────────────────────────────────────── */

const SORT_FIELDS = ['title', 'course', 'dueDate', 'status'];
let sortIdx = 0;

document.getElementById('sortBtn').addEventListener('click', () => {
    if (sortField === SORT_FIELDS[sortIdx]) {
        sortAsc = !sortAsc;
    } else {
        sortField = SORT_FIELDS[sortIdx];
        sortAsc   = true;
    }
    sortIdx = (sortIdx + 1) % SORT_FIELDS.length;

    const labels = { title: 'Title', course: 'Course', dueDate: 'Due Date', status: 'Status' };
    document.getElementById('sortBtn').childNodes[0].textContent = 'Sort: ' + labels[sortField] + ' ';
    document.getElementById('sortIcon').style.transform = sortAsc ? 'rotate(0deg)' : 'rotate(180deg)';
    render();
});

/* ── OPEN MODAL BUTTONS ──────────────────────────────────── */

document.getElementById('openCreateModal').addEventListener('click', openCreateModal);
document.getElementById('emptyCreateBtn').addEventListener('click', openCreateModal);

/* ── MOBILE SIDEBAR — handled by mobile-nav.js ──────────── */

/* ── TOAST ───────────────────────────────────────────────── */

let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── GLOBAL EXPOSE (for inline onclick) ──────────────────── */

window.openGradeModal       = openGradeModal;
window.openEditModal        = openEditModal;
window.openSingleGrade      = openSingleGrade;
window.deleteAssignment     = deleteAssignment;
window.appendFeedback       = appendFeedback;
window.addManualSubmission  = addManualSubmission;

/* ── INIT ────────────────────────────────────────────────── */

init();
