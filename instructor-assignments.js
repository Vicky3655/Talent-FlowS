/* ═══════════════════════════════════════════════════════════
   TALENT FLOW — Instructor Assignments
   instructor-assignments.js
═══════════════════════════════════════════════════════════ */

/* ── Profile bridge ─────────────────────────────────────────── */

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

/* ── SEED DATA ───────────────────────────────────────────── */

const SEED_STUDENTS = [
    { id: 's1', name: 'Alex Johnson',    avatar: 'https://i.pravatar.cc/40?img=12' },
    { id: 's2', name: 'Favour Chidi',    avatar: 'https://i.pravatar.cc/40?img=21' },
    { id: 's3', name: 'Samuel Kofi',     avatar: 'https://i.pravatar.cc/40?img=33' },
    { id: 's4', name: 'Priya Nair',      avatar: 'https://i.pravatar.cc/40?img=44' },
    { id: 's5', name: 'James Okafor',    avatar: 'https://i.pravatar.cc/40?img=55' },
    { id: 's6', name: 'Aisha Mensah',    avatar: 'https://i.pravatar.cc/40?img=16' },
];

// No longer loaded automatically — real assignments now come from
// Firestore (see init() below). Left here as a reference for the
// exact shape each assignment document should match.
const SEED_ASSIGNMENTS = [
    {
        id: 'a1',
        title: 'Brand Identity Case Study',
        course: 'Introduction to Product Design',
        instructions: 'Research a well-known brand, analyse its identity system, and present a redesign concept with rationale.',
        dueDate: offsetDate(2),
        maxScore: 100,
        assignTo: 'all',
        status: 'published',
        submissions: [
            { studentId: 's1', submittedAt: offsetDate(-1), score: null, feedback: '',
              submissionText: 'I chose Nimbus Coffee Co. for this case study. Their current identity leans heavily on a generic green-and-brown palette that blends in with every other coffee brand on the block, and the logo doesn\'t scale well below 32px.\n\nMy redesign concept shifts the palette to a warmer terracotta and cream combination, paired with a simplified cloud mark that still nods to the "Nimbus" name. I\'ve also proposed a modular logo lockup so it holds up on cup sleeves, app icons, and signage alike.\n\nRationale is in the attached deck — happy to walk through the typography choices if useful.',
              submissionLink: 'https://www.figma.com/file/example-nimbus-rebrand' },
            { studentId: 's2', submittedAt: offsetDate(-2), score: 88,   feedback: 'Excellent research depth. Colour theory section was outstanding.',
              submissionText: 'For this case study I analysed Verde Outdoors, a mid-size outdoor gear retailer. Their current mark is strong but the supporting colour system is inconsistent across packaging vs. digital.\n\nI standardized the palette around three core greens with a single accent (a burnt orange) for CTAs and sale tags, and rebuilt the type system around a single grotesque family at two weights instead of the four they currently mix. Included a one-page brand sheet summarizing usage rules.',
              submissionLink: '' },
            { studentId: 's3', submittedAt: null,           score: null, feedback: '',
              submissionText: '', submissionLink: '' },
        ]
    },
    {
        id: 'a2',
        title: 'Wireframe Prototype',
        course: 'UI/UX Design Fundamentals',
        instructions: 'Create a mid-fidelity wireframe for a mobile e-commerce checkout flow. Include at least 5 screens.',
        dueDate: offsetDate(-1),
        maxScore: 100,
        assignTo: 'all',
        status: 'published',
        submissions: [
            { studentId: 's1', submittedAt: offsetDate(-3), score: 92,   feedback: 'Great hierarchy and clear user flow. Minor spacing inconsistencies on screen 3.',
              submissionText: 'Six screens covering cart review, shipping details, payment method, order summary, confirmation, and an error state for a declined card. I focused on keeping the primary CTA in the same position across every screen so the thumb doesn\'t have to hunt for it.\n\nLinked the full clickable prototype below — screen 3 (shipping) still needs a pass on field spacing, I ran out of time to tighten it.',
              submissionLink: 'https://www.figma.com/proto/example-checkout-flow' },
            { studentId: 's4', submittedAt: offsetDate(-2), score: 75,   feedback: 'Good effort. Work on the confirmation screen — it feels incomplete.',
              submissionText: 'Five screens: cart, address, payment, review, confirmation. Kept it minimal on purpose so the flow feels fast. The confirmation screen is intentionally sparse — wanted to avoid overwhelming the user right after checkout, though I see now it might read as unfinished.',
              submissionLink: 'https://www.figma.com/proto/example-checkout-priya' },
            { studentId: 's5', submittedAt: offsetDate(-1), score: null, feedback: '',
              submissionText: 'Submitting a bit rough — five screens covering the core flow (cart → address → payment → review → confirmation). I added a "save card for next time" toggle on the payment screen since that came up a lot in the usability notes from class. Would love feedback on whether the toggle placement makes sense there.',
              submissionLink: 'https://www.figma.com/proto/example-checkout-james' },
        ]
    },
    {
        id: 'a3',
        title: 'Responsive Layout Exercise',
        course: 'Frontend Development for Designers',
        instructions: 'Build a fully responsive 3-column blog layout that collapses to a single column on mobile. Use CSS Grid.',
        dueDate: offsetDate(5),
        maxScore: 100,
        assignTo: 'all',
        status: 'draft',
        submissions: []
    },
    {
        id: 'a4',
        title: 'SQL Query Challenge',
        course: 'Data Analysis with Python & SQL',
        instructions: 'Complete the 10 SQL query tasks in the provided dataset. Export your results as a CSV.',
        dueDate: offsetDate(-7),
        maxScore: 50,
        assignTo: 'all',
        status: 'closed',
        submissions: [
            { studentId: 's1', submittedAt: offsetDate(-8), score: 46, feedback: 'Near-perfect. Double check question 7 logic.',
              submissionText: 'All 10 queries completed. For question 7 I used a correlated subquery instead of a window function — got the same row count as the sample output but flagging it in case the approach matters for grading. CSV of results attached.',
              submissionLink: '' },
            { studentId: 's2', submittedAt: offsetDate(-8), score: 40, feedback: 'Good understanding of joins. Subqueries need work.',
              submissionText: 'Completed 9 of 10 — got stuck on question 9 (the nested subquery for repeat customers) and ran out of time to debug it cleanly, so I left my best attempt commented in the file along with notes on where I think the logic breaks down.',
              submissionLink: '' },
            { studentId: 's3', submittedAt: offsetDate(-9), score: 35, feedback: 'Partial completion. Please review GROUP BY clauses.',
              submissionText: 'Completed questions 1-6 and attempted 7-8. Struggled with the GROUP BY + HAVING combination on the aggregate questions — I think I\'m filtering before aggregating instead of after. Ran out of time to fix 9 and 10.',
              submissionLink: '' },
            { studentId: 's4', submittedAt: offsetDate(-7), score: 48, feedback: 'Excellent work. Very clean queries throughout.',
              submissionText: 'All 10 complete. Used CTEs throughout instead of nested subqueries to keep things readable — let me know if you\'d prefer the more traditional subquery style for consistency with the course material. Results CSV attached.',
              submissionLink: '' },
        ]
    },
];

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

let assignments = [];          // populated from Firestore once auth resolves — see init() below
let currentInstructorId = null;
let currentFilter = 'all';
let currentSearch = '';
let sortField = 'title';
let sortAsc   = true;
let activeGradeAssignmentId = null; // which assignment is open in grade modal

/* ── STORAGE ─────────────────────────────────────────────── */
// Firestore owns persistence now (see data-store.js). There's no single
// shared save() anymore — each mutation below calls TalentFlowData
// directly, since every edit here only touches its own document.

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

async function init() {
    // Redirects to login.html if nobody's signed in.
    const user = await TalentFlowAuth.requireAuth();
    currentInstructorId = user.uid;

    try {
        assignments = await TalentFlowData.getAssignments(currentInstructorId);
    } catch (err) {
        console.error('Loading assignments failed:', err);
        showToast('Could not load assignments — check your connection');
    }

    render();
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

function getStudent(id) { return SEED_STUDENTS.find(s => s.id === id) || { id, name: 'Unknown', avatar: '' }; }

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
                <div class="row-title">${a.title}</div>
                <div class="row-course">${a.course}</div>
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
    openModal('createModal');
}

function openEditModal(id) {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    editingId = id;

    document.getElementById('createModalTitle').textContent = 'Edit Assignment';
    document.getElementById('createSubmitBtn').textContent  = 'Save Changes';

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

    // Show all students; not-submitted ones shown separately
    const submittedStudents = a.submissions.filter(s => s.submittedAt);
    const notSubmitted = SEED_STUDENTS.filter(
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
                    <img class="sub-avatar" src="${student.avatar}" alt="${student.name}">
                    <div>
                        <div class="sub-name">${student.name}</div>
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
                    <img class="sub-avatar" src="${st.avatar}" alt="${st.name}">
                    <div>
                        <div class="sub-name">${st.name}</div>
                        <div class="sub-date">No submission yet</div>
                    </div>
                </div>
                <div class="sub-row-end">
                    <span class="sub-grade-display pending">—</span>
                    <button class="grade-action-btn re-grade" onclick="addManualSubmission('${a.id}','${st.id}')">Add manually</button>
                </div>
            </div>`).join('');
    }

    if (!html) html = '<p style="text-align:center;color:var(--slate-4);padding:32px">No submissions for this assignment yet.</p>';

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
        <img class="sgh-avatar" src="${student.avatar}" alt="${student.name}">
        <div>
            <div class="sgh-name">${student.name}</div>
            <div class="sgh-course">${a.title} · ${a.course}</div>
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

applyProfileToNav();
init();
