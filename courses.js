// ═══════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════
// Real data now — loaded from Firestore for whichever instructor is
// signed in (see DOMContentLoaded below). Starts empty; a brand new
// instructor account naturally sees the existing "No courses found"
// empty state below until they create their first course.
let courses = [];

// Simulated student notifications
const notifications = [
    {
        id: 1,
        student: 'Amara Okafor',
        avatar: 'https://i.pravatar.cc/40?img=5',
        courseTitle: 'Cloud Computing & AWS',
        action: 'enrolled in',
        time: '2 min ago',
        unread: true
    },
    {
        id: 2,
        student: 'Daniel Mensah',
        avatar: 'https://i.pravatar.cc/40?img=11',
        courseTitle: 'UI/UX Design Fundamentals',
        action: 'accessed material in',
        time: '18 min ago',
        unread: true
    },
    {
        id: 3,
        student: 'Chidinma Adeyemi',
        avatar: 'https://i.pravatar.cc/40?img=9',
        courseTitle: 'Data Analysis with Python & SQL',
        action: 'completed Lesson 4 in',
        time: '1 hr ago',
        unread: true
    },
    {
        id: 4,
        student: 'Emeka Nwosu',
        avatar: 'https://i.pravatar.cc/40?img=15',
        courseTitle: 'Introduction to Product Design',
        action: 'enrolled in',
        time: '3 hr ago',
        unread: false
    },
    {
        id: 5,
        student: 'Fatima Bello',
        avatar: 'https://i.pravatar.cc/40?img=20',
        courseTitle: 'Cloud Computing & AWS',
        action: 'downloaded a file from',
        time: 'Yesterday',
        unread: false
    }
];

// Per-course activity log (simulated)
const courseActivity = {
    1: [
        { student: 'Emeka Nwosu', avatar: 'https://i.pravatar.cc/40?img=15', action: 'enrolled', time: '3 hr ago' },
        { student: 'Kemi Adebayo', avatar: 'https://i.pravatar.cc/40?img=22', action: 'completed Lesson 2', time: '1 day ago' }
    ],
    2: [
        { student: 'Daniel Mensah', avatar: 'https://i.pravatar.cc/40?img=11', action: 'accessed material', time: '18 min ago' },
    ],
    4: [
        { student: 'Chidinma Adeyemi', avatar: 'https://i.pravatar.cc/40?img=9', action: 'completed Lesson 4', time: '1 hr ago' },
        { student: 'Tunde Afolabi', avatar: 'https://i.pravatar.cc/40?img=33', action: 'enrolled', time: '2 days ago' }
    ],
    6: [
        { student: 'Amara Okafor', avatar: 'https://i.pravatar.cc/40?img=5', action: 'enrolled', time: '2 min ago' },
        { student: 'Fatima Bello', avatar: 'https://i.pravatar.cc/40?img=20', action: 'downloaded AWS Architecture Guide.pdf', time: 'Yesterday' }
    ]
};

// State
let currentFilter = 'all';
let currentSearch = '';
let isSortedAsc = true;
let editingCourseId = null;    // null = adding new
let drawerCourseId = null;
let currentInstructorId = null; // set once auth resolves — every save/load uses this

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // Redirects to login.html if nobody's signed in. Resolves with the
    // Firebase user once someone is.
    const user = await TalentFlowAuth.requireAuth();
    currentInstructorId = user.uid;

    try {
        courses = await TalentFlowData.getCourses(currentInstructorId);
    } catch (err) {
        console.error('Loading courses failed:', err);
        showToast('Could not load courses', 'Check your connection and refresh.', 'error');
    }

    renderCourses();
    initFilters();
    initSearch();
    initSort();
    initModal();
    initDrawer();
    initNotifications();
    initMobileMenu();
    simulateStudentActivity();
});

// ═══════════════════════════════════════════
//  RENDER COURSES
// ═══════════════════════════════════════════
function renderCourses() {
    const grid = document.getElementById('course-grid');
    let list = courses.filter(c => {
        const matchFilter = currentFilter === 'all' || c.status === currentFilter;
        const matchSearch = c.title.toLowerCase().includes(currentSearch);
        return matchFilter && matchSearch;
    });

    list.sort((a, b) => {
        const cmp = a.title.localeCompare(b.title);
        return isSortedAsc ? cmp : -cmp;
    });

    if (!list.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                <p>No courses found</p>
            </div>`;
        return;
    }

    grid.innerHTML = list.map((c, i) => `
        <div class="course-card" style="animation-delay:${i * 70}ms" data-id="${c.id}">
            <div class="course-thumb">
                <img src="${c.thumb}" alt="${c.alt}" onerror="this.src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80'">
                ${c.materials.length ? `
                <span class="mat-chip">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    ${c.materials.length} file${c.materials.length > 1 ? 's' : ''}
                </span>` : ''}
            </div>
            <div class="course-info">
                <p class="course-title">${c.title}</p>
                ${c.desc ? `<p class="course-desc">${c.desc}</p>` : ''}
                <div class="course-meta">
                    <span class="dot ${c.status}"></span>
                    <span>${capitalize(c.status)} · ${c.lessons} Lesson${c.lessons !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="card-action-btn" onclick="openDrawer('${c.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    Materials
                </button>
                <button class="card-action-btn primary" onclick="openEditModal('${c.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                    Edit
                </button>
            </div>
        </div>
    `).join('');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ═══════════════════════════════════════════
//  FILTERS / SEARCH / SORT
// ═══════════════════════════════════════════
function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderCourses();
        });
    });
}

function initSearch() {
    document.querySelector('.search-wrap input').addEventListener('input', e => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderCourses();
    });
}

function initSort() {
    const btn = document.getElementById('sort-btn');
    btn.addEventListener('click', () => {
        isSortedAsc = !isSortedAsc;
        btn.classList.toggle('desc', !isSortedAsc);
        btn.childNodes[0].textContent = isSortedAsc ? 'Sort A–Z' : 'Sort Z–A';
        renderCourses();
    });
}

// ═══════════════════════════════════════════
//  MODAL — ADD / EDIT COURSE
// ═══════════════════════════════════════════
let pendingMaterials = []; // files staged in modal step 2

function initModal() {
    const modal = document.getElementById('course-modal');
    document.getElementById('open-add-modal').addEventListener('click', () => openAddModal());
    document.getElementById('modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // Tab navigation
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => goToStep(parseInt(tab.dataset.step)));
    });
    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.next)));
    });
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.back)));
    });

    // Thumbnail
    const thumbDrop = document.getElementById('thumb-drop');
    const thumbFileInput = document.getElementById('f-thumb-file');
    const thumbUrlInput = document.getElementById('f-thumb-url');

    thumbDrop.addEventListener('click', () => thumbFileInput.click());
    thumbDrop.addEventListener('dragover', e => { e.preventDefault(); thumbDrop.classList.add('drag-over'); });
    thumbDrop.addEventListener('dragleave', () => thumbDrop.classList.remove('drag-over'));
    thumbDrop.addEventListener('drop', e => {
        e.preventDefault(); thumbDrop.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) previewThumb(file);
    });
    thumbFileInput.addEventListener('change', () => {
        if (thumbFileInput.files[0]) previewThumb(thumbFileInput.files[0]);
    });
    thumbUrlInput.addEventListener('input', () => {
        const url = thumbUrlInput.value.trim();
        if (url) showThumbPreview(url);
    });

    // Materials drop zone
    const dropZone = document.getElementById('file-drop-zone');
    const matInput = document.getElementById('f-materials');
    document.getElementById('browse-files-btn').addEventListener('click', e => { e.stopPropagation(); matInput.click(); });
    dropZone.addEventListener('click', () => matInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('drag-over');
        addPendingFiles(e.dataTransfer.files);
    });
    matInput.addEventListener('change', () => { addPendingFiles(matInput.files); matInput.value = ''; });

    // Toggle label
    document.getElementById('f-notify').addEventListener('change', e => {
        document.getElementById('notify-label').textContent = e.target.checked ? 'Notifications ON' : 'Notifications OFF';
    });

    // Submit
    document.getElementById('course-submit').addEventListener('click', submitCourse);
}

function openAddModal() {
    editingCourseId = null;
    pendingMaterials = [];
    resetModalForm();
    document.getElementById('modal-title').textContent = 'Add New Course';
    document.getElementById('course-submit').textContent = 'Create Course';
    document.getElementById('course-submit').style.background = '#16A34A';
    goToStep(1);
    document.getElementById('course-modal').classList.add('open');
}

function openEditModal(id) {
    const course = courses.find(c => c.id === id);
    if (!course) return;
    editingCourseId = id;
    pendingMaterials = [...course.materials];
    resetModalForm();
    document.getElementById('modal-title').textContent = 'Edit Course';
    document.getElementById('course-submit').textContent = 'Save Changes';
    document.getElementById('course-submit').style.background = '#2563EB';

    document.getElementById('f-title').value = course.title;
    document.getElementById('f-desc').value = course.desc || '';
    document.getElementById('f-thumb-url').value = course.thumb;
    showThumbPreview(course.thumb);
    document.getElementById('f-lessons').value = course.lessons;
    document.getElementById('f-status').value = course.status;
    document.getElementById('f-notify').checked = course.notify;
    document.getElementById('notify-label').textContent = course.notify ? 'Notifications ON' : 'Notifications OFF';

    renderPendingFiles();
    goToStep(1);
    document.getElementById('course-modal').classList.add('open');
}

function closeModal() {
    document.getElementById('course-modal').classList.remove('open');
    pendingMaterials = [];
}

function resetModalForm() {
    document.getElementById('f-title').value = '';
    document.getElementById('f-desc').value = '';
    document.getElementById('f-thumb-url').value = '';
    document.getElementById('f-lessons').value = 1;
    document.getElementById('f-status').value = 'draft';
    document.getElementById('f-notify').checked = true;
    document.getElementById('notify-label').textContent = 'Notifications ON';
    document.getElementById('thumb-preview').style.display = 'none';
    document.getElementById('thumb-preview-placeholder').style.display = 'block';
    document.getElementById('uploaded-files-list').innerHTML = '';
}

function goToStep(step) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', parseInt(t.dataset.step) === step));
    document.querySelectorAll('.modal-step').forEach(s => s.classList.toggle('active', parseInt(s.dataset.step) === step));
}

function previewThumb(file) {
    const reader = new FileReader();
    reader.onload = e => showThumbPreview(e.target.result);
    reader.readAsDataURL(file);
}
function showThumbPreview(src) {
    const img = document.getElementById('thumb-preview');
    const placeholder = document.getElementById('thumb-preview-placeholder');
    img.src = src; img.style.display = 'block';
    placeholder.style.display = 'none';
}

function addPendingFiles(fileList) {
    Array.from(fileList).forEach(f => {
        pendingMaterials.push({
            name: f.name,
            size: formatSize(f.size),
            type: fileType(f.name),
            _file: f
        });
    });
    renderPendingFiles();
}

function renderPendingFiles() {
    const list = document.getElementById('uploaded-files-list');
    list.innerHTML = pendingMaterials.map((m, i) => `
        <div class="file-item" style="animation-delay:${i*50}ms">
            <span class="file-icon ${m.type}">${m.type.toUpperCase()}</span>
            <span class="file-name">${m.name}</span>
            <span class="file-size">${m.size}</span>
            <button class="file-remove" onclick="removePendingFile(${i})">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
            </button>
        </div>
    `).join('');
}
function removePendingFile(i) { pendingMaterials.splice(i, 1); renderPendingFiles(); }

async function submitCourse() {
    const title = document.getElementById('f-title').value.trim();
    if (!title) { document.getElementById('f-title').focus(); goToStep(1); showToast('Missing title', 'Please enter a course title.', 'warn'); return; }

    const thumbUrl = document.getElementById('f-thumb-url').value.trim() ||
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80';

    const courseData = {
        title,
        desc: document.getElementById('f-desc').value.trim(),
        thumb: thumbUrl,
        alt: title.split(' ')[0],
        lessons: parseInt(document.getElementById('f-lessons').value) || 1,
        status: document.getElementById('f-status').value,
        notify: document.getElementById('f-notify').checked,
        materials: pendingMaterials.map(({ _file, ...rest }) => rest)
    };

    const submitBtn = document.getElementById('course-submit');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
        if (editingCourseId !== null) {
            await TalentFlowData.saveCourse(currentInstructorId, courseData, editingCourseId);
            const idx = courses.findIndex(c => c.id === editingCourseId);
            courses[idx] = { ...courses[idx], ...courseData };
            showToast('Course updated', `"${title}" has been saved.`, 'success');
        } else {
            const newId = await TalentFlowData.saveCourse(currentInstructorId, courseData);
            courses.push({ id: newId, ...courseData });
            showToast('Course created', `"${title}" added to your courses.`, 'success');
        }
        renderCourses();
        closeModal();
    } catch (err) {
        console.error('Saving course failed:', err);
        showToast('Save failed', 'Could not save the course — please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
    }
}

// ═══════════════════════════════════════════
//  DRAWER — MATERIALS + ACTIVITY
// ═══════════════════════════════════════════
function initDrawer() {
    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);

    document.querySelectorAll('.drawer-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const pane = tab.dataset.dtab;
            document.querySelectorAll('.drawer-tab-pane').forEach(p => p.classList.toggle('active', p.id === `dtab-${pane}`));
        });
    });

    // Upload inside drawer
    const drawerInput = document.getElementById('drawer-file-input');
    document.getElementById('drawer-upload-btn').addEventListener('click', () => drawerInput.click());
    drawerInput.addEventListener('change', async () => {
        if (!drawerCourseId) return;
        const course = courses.find(c => c.id === drawerCourseId);
        const addedCount = drawerInput.files.length;
        Array.from(drawerInput.files).forEach(f => {
            course.materials.push({ name: f.name, size: formatSize(f.size), type: fileType(f.name) });
        });
        drawerInput.value = '';
        renderDrawerFiles(course);
        renderCourses();
        showToast('Files uploaded', `${addedCount} file(s) added to "${course.title}".`, 'success');

        try {
            await TalentFlowData.updateCourseMaterials(course.id, course.materials);
        } catch (err) {
            console.error('Saving materials failed:', err);
            showToast('Sync failed', 'Files are shown here but may not have saved — try refreshing.', 'warn');
        }
    });
}

function openDrawer(id) {
    drawerCourseId = id;
    const course = courses.find(c => c.id === id);
    document.getElementById('drawer-title').textContent = course.title;
    document.getElementById('drawer-subtitle').textContent = `${course.materials.length} material${course.materials.length !== 1 ? 's' : ''} · ${capitalize(course.status)}`;

    // Reset to materials tab
    document.querySelectorAll('.drawer-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
    document.querySelectorAll('.drawer-tab-pane').forEach((p, i) => p.classList.toggle('active', i === 0));

    renderDrawerFiles(course);
    renderDrawerActivity(id);

    document.getElementById('materials-drawer').classList.add('open');
    document.getElementById('drawer-backdrop').classList.add('open');
}

function closeDrawer() {
    document.getElementById('materials-drawer').classList.remove('open');
    document.getElementById('drawer-backdrop').classList.remove('open');
    drawerCourseId = null;
}

function renderDrawerFiles(course) {
    const container = document.getElementById('drawer-files');
    if (!course.materials.length) {
        container.innerHTML = '<p style="font-size:13px;color:#94A3B8;text-align:center;padding:24px 0">No materials uploaded yet.</p>';
        return;
    }
    container.innerHTML = course.materials.map((m, i) => `
        <div class="file-item" style="animation-delay:${i*40}ms">
            <span class="file-icon ${m.type}">${m.type.toUpperCase()}</span>
            <span class="file-name">${m.name}</span>
            <span class="file-size">${m.size}</span>
            <button class="file-remove" onclick="removeDrawerFile('${course.id}',${i})">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
            </button>
        </div>
    `).join('');
}

async function removeDrawerFile(courseId, idx) {
    const course = courses.find(c => c.id === courseId);
    course.materials.splice(idx, 1);
    renderDrawerFiles(course);
    document.getElementById('drawer-subtitle').textContent = `${course.materials.length} material${course.materials.length !== 1 ? 's' : ''} · ${capitalize(course.status)}`;
    renderCourses();

    try {
        await TalentFlowData.updateCourseMaterials(course.id, course.materials);
    } catch (err) {
        console.error('Removing material failed to sync:', err);
        showToast('Sync failed', 'Removed here but may not have saved — try refreshing.', 'warn');
    }
}

function renderDrawerActivity(courseId) {
    const container = document.getElementById('drawer-activity-list');
    const activity = courseActivity[courseId] || [];
    if (!activity.length) {
        container.innerHTML = '<div class="activity-empty">No student activity yet for this course.</div>';
        return;
    }
    container.innerHTML = activity.map(a => `
        <div class="activity-item">
            <img src="${a.avatar}" alt="${a.student}">
            <div class="activity-body">
                <strong>${a.student}</strong>
                <p>${a.action} this course</p>
                <span class="at">${a.time}</span>
            </div>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════
function initNotifications() {
    const btn = document.getElementById('notif-btn');
    const panel = document.getElementById('notif-panel');
    const backdrop = document.getElementById('notif-backdrop');

    btn.addEventListener('click', e => {
        e.stopPropagation();
        panel.classList.toggle('open');
        backdrop.classList.toggle('open', panel.classList.contains('open'));
        if (panel.classList.contains('open')) renderNotifPanel();
    });

    backdrop.addEventListener('click', () => {
        panel.classList.remove('open');
        backdrop.classList.remove('open');
    });

    document.getElementById('notif-clear-all').addEventListener('click', () => {
        notifications.forEach(n => n.unread = false);
        updateBadge();
        renderNotifPanel();
    });

    updateBadge();
    renderNotifPanel();
}

function renderNotifPanel() {
    const list = document.getElementById('notif-list');
    if (!notifications.length) {
        list.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
        return;
    }
    list.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="markNotifRead(${n.id})">
            <img class="notif-avatar" src="${n.avatar}" alt="${n.student}">
            <div class="notif-body">
                <strong>${n.student}</strong>
                <p>${n.action} <em>${n.courseTitle}</em></p>
                <span class="notif-time">${n.time}</span>
            </div>
            ${n.unread ? '<div class="notif-unread-dot"></div>' : ''}
        </div>
    `).join('');
}

function markNotifRead(id) {
    const n = notifications.find(n => n.id === id);
    if (n) { n.unread = false; updateBadge(); renderNotifPanel(); }
}

function updateBadge() {
    const count = notifications.filter(n => n.unread).length;
    const badge = document.getElementById('notif-badge');
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
}

// ═══════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════
function showToast(title, msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';

    const colors = { success: '#16A34A', warn: '#D97706', error: '#DC2626', info: '#2563EB' };
    const icons = {
        success: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
        warn: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>',
        error: '<path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>',
        info: '<path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/>'
    };

    el.innerHTML = `
        <div class="toast-icon" style="background:${colors[type]}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">${icons[type]}</svg>
        </div>
        <div>
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${msg}</div>
        </div>
    `;
    container.appendChild(el);

    const dismiss = () => {
        el.classList.add('exit');
        setTimeout(() => el.remove(), 300);
    };
    el.addEventListener('click', dismiss);
    setTimeout(dismiss, 4500);
}

// ═══════════════════════════════════════════
//  SIMULATE STUDENT ACTIVITY (demo)
// ═══════════════════════════════════════════
const fakeStudents = [
    { name: 'Ngozi Okonkwo', avatar: 'https://i.pravatar.cc/40?img=47' },
    { name: 'Seun Adeyemi',  avatar: 'https://i.pravatar.cc/40?img=55' },
    { name: 'Zainab Musa',   avatar: 'https://i.pravatar.cc/40?img=44' }
];
const fakeActions = ['enrolled in', 'completed a lesson in', 'downloaded a file from', 'started watching'];

function simulateStudentActivity() {
    // Fire a demo notification after 12s, then every 30s
    setTimeout(() => fireRandomNotification(), 12000);
    setInterval(() => fireRandomNotification(), 30000);
}

function fireRandomNotification() {
    const notifyableCourses = courses.filter(c => c.notify && c.status === 'published');
    if (!notifyableCourses.length) return;
    const course = notifyableCourses[Math.floor(Math.random() * notifyableCourses.length)];
    const student = fakeStudents[Math.floor(Math.random() * fakeStudents.length)];
    const action = fakeActions[Math.floor(Math.random() * fakeActions.length)];

    const newNotif = {
        id: Date.now(),
        student: student.name,
        avatar: student.avatar,
        courseTitle: course.title,
        action,
        time: 'Just now',
        unread: true
    };
    notifications.unshift(newNotif);
    updateBadge();
    renderNotifPanel();

    showToast('New student activity', `${student.name} ${action} "${course.title}".`, 'info');
}

// ═══════════════════════════════════════════
//  MOBILE MENU
// ═══════════════════════════════════════════
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    if (!hamburger) return;
    hamburger.addEventListener('click', () => { sidebar.classList.add('mobile-open'); document.body.style.overflow = 'hidden'; });
    overlay.addEventListener('click', () => { sidebar.classList.remove('mobile-open'); document.body.style.overflow = ''; });
}

// ═══════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════
function fileType(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc','docx'].includes(ext)) return 'doc';
    if (['ppt','pptx'].includes(ext)) return 'ppt';
    if (['mp4','mov','avi'].includes(ext)) return 'vid';
    if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'img';
    if (ext === 'zip') return 'zip';
    return 'other';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}