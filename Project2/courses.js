/* ============================================================
   TALENT FLOW  |  courses.js
   ------------------------------------------------------------
   Student Course Catalog logic.
   Enrolling toggles card buttons to "Access Course Files",
   which opens the mobile-optimized instructor materials sheet.
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

/* ── STATE ── */
let allCourses = [];
let myEnrollments = new Set();
let searchTerm = '';
let activeFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    setupNavPopups();
    initFiltersAndSearch();
    setupModalListeners();

    const auth = await waitForTalentFlowAuth();
    if (!auth) {
        showToast('Could not load auth provider', 'error');
        return;
    }

    try {
        await auth.requireAuth(); // Redirects if logged out
    } catch (err) {
        console.error('Auth verification failed:', err);
        return;
    }

    try {
        const [courses, enrollments] = await Promise.all([
            window.TalentFlowData.getPublishedCourses(),
            auth.listMyEnrollments().catch(() => []),
        ]);
        allCourses = courses || [];
        myEnrollments = new Set((enrollments || []).map(e => e.courseId));
    } catch (err) {
        console.error('Loading course catalog failed:', err);
        showToast('Could not load courses. Check your connection.', 'error');
    }

    updateSummaryChips();
    render();

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logOut();
    });
});

/* ── NAV & POPUPS ── */
function setupNavPopups() {
    const avatarBtn = document.getElementById('avatarBtn');
    const profilePopup = document.getElementById('profilePopup');
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');

    avatarBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        profilePopup?.classList.toggle('open');
        notifPanel?.classList.remove('open');
    });

    notifBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel?.classList.toggle('open');
        profilePopup?.classList.remove('open');
    });

    document.addEventListener('click', () => {
        profilePopup?.classList.remove('open');
        notifPanel?.classList.remove('open');
    });

    document.getElementById('clearNotifs')?.addEventListener('click', () => {
        const notifList = document.getElementById('notifList');
        const badge = document.getElementById('notifBadge');
        if (notifList) notifList.innerHTML = '<p class="np-empty">No notifications yet</p>';
        if (badge) {
            badge.textContent = '0';
            badge.setAttribute('data-count', '0');
        }
    });
}

/* ── FILTERS & SEARCH ── */
function initFiltersAndSearch() {
    const input = document.getElementById('courseSearch');
    input?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase().trim();
        render();
    });

    const filterTabs = document.getElementById('filterTabs');
    filterTabs?.addEventListener('click', (e) => {
        const pill = e.target.closest('.tab-pill');
        if (!pill) return;

        filterTabs.querySelectorAll('.tab-pill').forEach(btn => btn.classList.remove('active'));
        pill.classList.add('active');

        activeFilter = pill.dataset.filter || 'all';
        render();
    });
}

/* ── SUMMARY CHIPS ── */
function updateSummaryChips() {
    const totalEl = document.getElementById('chipTotalCount');
    const enrolledEl = document.getElementById('chipEnrolledCount');
    const availableEl = document.getElementById('chipAvailableCount');

    const total = allCourses.length;
    const enrolled = allCourses.filter(c => myEnrollments.has(c.id)).length;
    const available = total - enrolled;

    if (totalEl) totalEl.textContent = total;
    if (enrolledEl) enrolledEl.textContent = enrolled;
    if (availableEl) availableEl.textContent = Math.max(0, available);
}

/* ── RENDER COURSES ── */
function render() {
    const grid = document.getElementById('courseGrid');
    const empty = document.getElementById('emptyState');
    const emptyText = document.getElementById('emptyStateText');
    if (!grid) return;

    const list = allCourses.filter(c => {
        const isEnrolled = myEnrollments.has(c.id);
        const matchesSearch = !searchTerm ||
            c.title.toLowerCase().includes(searchTerm) ||
            (c.instructorName || '').toLowerCase().includes(searchTerm) ||
            (c.desc || '').toLowerCase().includes(searchTerm);

        let matchesFilter = true;
        if (activeFilter === 'enrolled') matchesFilter = isEnrolled;
        if (activeFilter === 'available') matchesFilter = !isEnrolled;

        return matchesSearch && matchesFilter;
    });

    if (!list.length) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        if (emptyText) {
            emptyText.textContent = allCourses.length
                ? 'No courses match your search or selected filter.'
                : 'No published courses yet — check back soon.';
        }
        return;
    }

    if (empty) empty.style.display = 'none';

    grid.innerHTML = list.map((c, i) => {
        const enrolled = myEnrollments.has(c.id);
        const avatar = c.instructorAvatar || fallbackAvatar(c.instructorName);
        const thumbUrl = c.thumb || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80';

        return `
        <div class="course-card" style="animation-delay:${i * 50}ms">
            <div class="course-thumb">
                <img src="${thumbUrl}" alt="${c.alt || c.title}" onerror="this.src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80'">
                <span class="course-badge ${enrolled ? 'is-enrolled' : ''}">${enrolled ? 'Enrolled' : 'Course'}</span>
            </div>
            <div class="course-body">
                <p class="course-title">${c.title}</p>
                ${c.desc ? `<p class="course-desc">${c.desc}</p>` : ''}
                <div class="course-meta">
                    <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>
                    </svg>
                    <span>${c.lessons || 0} Lesson${c.lessons !== 1 ? 's' : ''}</span>
                </div>
                <div class="course-instructor">
                    <img src="${avatar}" alt="${c.instructorName || 'Instructor'}">
                    <div class="course-instructor-info">
                        Instructor: <strong>${c.instructorName || 'TalentFlow Instructor'}</strong>
                    </div>
                </div>
                <button class="course-btn ${enrolled ? 'is-enrolled' : ''}" data-id="${c.id}">
                    ${enrolled ? `
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                        </svg> Access Course Files
                    ` : 'Enroll Now'}
                </button>
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.course-btn').forEach(btn => {
        const courseId = btn.dataset.id;
        const isEnrolled = myEnrollments.has(courseId);

        btn.addEventListener('click', () => {
            if (isEnrolled) {
                openCourseMaterialsModal(courseId);
            } else {
                enroll(courseId, btn);
            }
        });
    });
}

function fallbackAvatar(name) {
    const auth = window.TalentFlowAuth;
    if (auth?.initialsAvatar) return auth.initialsAvatar(name || 'T');
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80';
}

/* ── ENROLL ACTION ── */
async function enroll(courseId, btn) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;
    const auth = window.TalentFlowAuth;

    btn.disabled = true;
    btn.textContent = 'Enrolling…';

    try {
        await auth.enrollInCourse(course);
        myEnrollments.add(courseId);

        // Toggle UI button to Access Course Files
        btn.disabled = false;
        btn.classList.add('is-enrolled');
        btn.innerHTML = `
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
            </svg> Access Course Files`;

        updateSummaryChips();
        showToast(`Enrolled in "${course.title}"! Opening course files…`, 'success');

        openCourseMaterialsModal(courseId);
    } catch (err) {
        console.error('Enrolling failed:', err);
        btn.disabled = false;
        btn.textContent = 'Enroll Now';
        showToast('Could not enroll. Please try again.', 'error');
    }
}

/* ── INSTRUCTOR FILES & MATERIALS MODAL ── */
function openCourseMaterialsModal(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    document.getElementById('modalCourseTitle').textContent = course.title;
    document.getElementById('modalCourseInstructor').textContent = `Taught by ${course.instructorName || 'Instructor'}`;
    
    // Welcome message / notes
    document.getElementById('modalInstructorNotes').textContent = 
        course.instructorNotes || course.desc || 'Welcome to the course! Below you will find all downloadable files, syllabus slides, and reference links provided for your study.';

    // Files rendering
    const filesContainer = document.getElementById('modalFilesList');
    const files = course.files || course.materials || [
        { name: `${course.title} — Syllabus.pdf`, type: 'PDF Document', size: '2.4 MB', url: '#' },
        { name: 'Lecture Slides & Resources.pdf', type: 'PDF Document', size: '4.1 MB', url: '#' },
        { name: 'Starter Code & Examples.zip', type: 'Zip Archive', size: '8.7 MB', url: '#' }
    ];

    filesContainer.innerHTML = files.map(file => `
        <div class="resource-item">
            <div class="resource-left">
                <div class="resource-icon">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                    </svg>
                </div>
                <div style="min-width:0">
                    <p class="resource-title">${file.name}</p>
                    <p class="resource-sub">${file.type || 'Resource File'} · ${file.size || 'Download'}</p>
                </div>
            </div>
            <a href="${file.url || '#'}" class="btn-open-file" target="_blank" onclick="event.preventDefault(); showToast('Opening instructor file…', 'info');">
                Download
            </a>
        </div>
    `).join('');

    document.getElementById('materialsModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCourseMaterialsModal() {
    document.getElementById('materialsModal').classList.remove('open');
    document.body.style.overflow = '';
}

function setupModalListeners() {
    document.getElementById('materialsModalClose')?.addEventListener('click', closeCourseMaterialsModal);
    document.getElementById('closeMaterialsBtn')?.addEventListener('click', closeCourseMaterialsModal);
    document.getElementById('materialsModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('materialsModal')) closeCourseMaterialsModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCourseMaterialsModal();
    });
}

/* ── TOAST MESSAGES ── */
function showToast(msg, type = 'success') {
    const icons = {
        success: `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`,
        info:    `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></svg>`,
        warning: `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>`,
        error:   `<svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>`,
    };

    const container = document.getElementById('toastContainer');
    if (!container) return;

    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
    container.appendChild(t);

    setTimeout(() => {
        t.style.animation = 'toastOut 0.3s ease forwards';
        t.addEventListener('animationend', () => t.remove());
    }, 3800);
}
