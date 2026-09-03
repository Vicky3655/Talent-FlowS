/* ============================================================
   TALENT FLOW  |  courses.js
   ------------------------------------------------------------
   Student Course Catalog logic.
   Handles published course rendering, enrollments, real file
   downloads for course materials, public instructor profile
   views, and notifications.
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
let allCourses = [];
let myEnrollments = new Set();
let searchTerm = '';
let activeFilter = 'all';

// Only ping the instructor once per course per page-load when a student
// opens the materials modal — reopening the same modal to re-read
// something they already opened isn't new activity worth notifying
// about again.
const notifiedMaterialAccess = new Set();

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
    const grid = document.getElementById('courseGrid') || document.getElementById('course-grid');
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
        <div class="course-card" style="animation-delay:${i * 40}ms">
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

                <!-- Interactive Instructor Info Bar -->
                <div class="course-instructor" data-instructor-id="${c.instructorId || ''}" data-course-id="${c.id}" title="View Instructor Profile">
                    <img src="${avatar}" alt="${c.instructorName || 'Instructor'}">
                    <div class="course-instructor-info">
                        <span>Instructor</span>
                        <strong>${c.instructorName || 'TalentFlow Instructor'}</strong>
                    </div>
                    <span class="inst-view-badge">View Profile</span>
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

    // Attach Course Action Events
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

    // Attach Instructor Profile Click Listeners
    grid.querySelectorAll('.course-instructor').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const courseId = row.dataset.courseId;
            openInstructorProfileModal(courseId);
        });
    });
}

function fallbackAvatar(name) {
    const auth = window.TalentFlowAuth;
    if (auth?.initialsAvatar) return auth.initialsAvatar(name || 'T');
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80';
}

/* ── INSTRUCTOR NOTIFICATIONS ──────────────────────────────
   Backed by notifications-store.js — lights up the red dot on
   the instructor's Courses/Students/Assignments sidebar icons
   and shows up in their "Student Activity" bell. Never blocks
   the student's own action if it fails. ────────────────────── */
function notifyInstructorOfEnrollment(course) {
    if (!window.TalentFlowNotifications || !course.instructorId) return;
    const student = TalentFlowNotifications.resolveStudentIdentity();
    TalentFlowNotifications.notifyEnrollment({
        instructorId: course.instructorId,
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatar,
        courseId: course.id,
        courseTitle: course.title,
    });
}

function notifyInstructorOfMaterialAccess(course) {
    if (!window.TalentFlowNotifications || !course.instructorId) return;
    const student = TalentFlowNotifications.resolveStudentIdentity();
    TalentFlowNotifications.notifyMaterialAccess({
        instructorId: course.instructorId,
        studentId: student.id,
        studentName: student.name,
        studentAvatar: student.avatar,
        courseId: course.id,
        courseTitle: course.title,
    });
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
        notifyInstructorOfEnrollment(course);

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

/* ── DOWNLOAD FILE HANDLER ── */
window.downloadCourseFile = function(fileName, fileUrl) {
    showToast(`Downloading "${fileName}"…`, 'info');

    // If a valid HTTP/HTTPS storage URL or Data URL is present, trigger direct download
    if (fileUrl && fileUrl !== '#' && !fileUrl.startsWith('javascript:')) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
    } else {
        // Dynamic file generator fallback for uploaded/sample course material
        const sampleText = `TALENT FLOW COURSE MATERIAL\n` +
                           `============================\n` +
                           `Document: ${fileName}\n` +
                           `Downloaded by Student\n` +
                           `Date: ${new Date().toLocaleDateString()}\n\n` +
                           `Welcome to your course materials! Happy learning on Talent Flow.`;
                           
        const blob = new Blob([sampleText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName.includes('.') ? fileName : `${fileName}.txt`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        setTimeout(() => URL.revokeObjectURL(url), 8000);
    }
};

/* ── INSTRUCTOR FILES & MATERIALS MODAL ── */
function openCourseMaterialsModal(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    document.getElementById('modalCourseTitle').textContent = course.title;
    document.getElementById('modalCourseInstructor').textContent = `Taught by ${course.instructorName || 'Instructor'}`;
    document.getElementById('modalInstructorNotes').textContent = 
        course.instructorNotes || course.desc || 'Welcome to the course! Below you will find all downloadable files, syllabus slides, and reference links provided for your study.';

    const filesContainer = document.getElementById('modalFilesList');
    const files = course.files || course.materials || [
        { name: `${course.title} — Syllabus.pdf`, type: 'PDF Document', size: '2.4 MB', url: '#' },
        { name: 'Lecture Slides & Resources.pdf', type: 'PDF Document', size: '4.1 MB', url: '#' },
        { name: 'Starter Code & Examples.zip', type: 'Zip Archive', size: '8.7 MB', url: '#' }
    ];

    filesContainer.innerHTML = files.map(file => {
        const fName = escapeHtml(file.name);
        const fUrl = escapeHtml(file.url || '#');
        const fType = escapeHtml(file.type || 'Resource File');
        const fSize = escapeHtml(file.size || 'Download');

        return `
        <div class="resource-item">
            <div class="resource-left">
                <div class="resource-icon">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                    </svg>
                </div>
                <div style="min-width:0">
                    <p class="resource-title">${fName}</p>
                    <p class="resource-sub">${fType} · ${fSize}</p>
                </div>
            </div>
            <button type="button" class="btn-open-file" onclick="downloadCourseFile('${fName}', '${fUrl}')">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-4.5-4.5m4.5 4.5 4.5-4.5M12 12.75V3"/>
                </svg>
                Download
            </button>
        </div>`;
    }).join('');

    document.getElementById('materialsModal').classList.add('open');
    document.body.style.overflow = 'hidden';

    if (!notifiedMaterialAccess.has(courseId)) {
        notifiedMaterialAccess.add(courseId);
        notifyInstructorOfMaterialAccess(course);
    }
}

function closeCourseMaterialsModal() {
    document.getElementById('materialsModal').classList.remove('open');
    document.body.style.overflow = '';
}

/* ── PUBLIC INSTRUCTOR PROFILE MODAL ── */
async function openInstructorProfileModal(courseId) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;

    let profile = {};
    if (course.instructorId && window.TalentFlowData?.getPublicProfile) {
        try {
            profile = await window.TalentFlowData.getPublicProfile(course.instructorId) || {};
        } catch (err) {
            console.error('Could not fetch instructor public profile:', err);
        }
    }

    const name = profile.fullName || course.instructorName || 'TalentFlow Instructor';
    const avatar = profile.avatar || course.instructorAvatar || fallbackAvatar(name);
    const title = profile.title || course.instructorTitle || 'Senior Instructor';
    const bio = profile.bio || course.instructorBio || 'Passionate educator committed to sharing industry knowledge and helping students achieve their career goals.';
    const education = profile.education || profile.experience ? `${profile.experience ? profile.experience + ' years experience · ' : ''}${profile.education || 'Expert Educator'}` : 'Qualified Educator & Industry Expert';

    document.getElementById('instName').textContent = name;
    document.getElementById('instTitle').textContent = title;
    document.getElementById('instBio').textContent = bio;
    document.getElementById('instEducation').textContent = education;

    const instAvatarEl = document.getElementById('instAvatar');
    instAvatarEl.src = avatar;
    instAvatarEl.onerror = function () { this.onerror = null; this.src = fallbackAvatar(name); };

    // Expertise tags
    const expertiseContainer = document.getElementById('instExpertisePills');
    const tags = profile.expertise ? profile.expertise.split(',').map(t => t.trim()) : ['Instruction', 'Mentorship', 'Curriculum Design'];
    expertiseContainer.innerHTML = tags.map(t => `<span class="inst-tag">${escapeHtml(t)}</span>`).join('');

    // Social Links
    const socialContainer = document.getElementById('instSocialLinks');
    let linksHtml = '';
    if (profile.website) linksHtml += `<a href="${escapeHtml(profile.website)}" target="_blank" rel="noopener" class="inst-social-btn">🌐 Website</a>`;
    if (profile.linkedin) linksHtml += `<a href="${escapeHtml(profile.linkedin)}" target="_blank" rel="noopener" class="inst-social-btn">💼 LinkedIn</a>`;
    if (!linksHtml) linksHtml = `<span style="font-size:12px;color:var(--slate-4);">Instructor verified on Talent Flow.</span>`;
    socialContainer.innerHTML = linksHtml;

    // Render published courses by this instructor
    const instCoursesList = document.getElementById('instCoursesList');
    const instructorCourses = allCourses.filter(c => 
        (c.instructorId && c.instructorId === course.instructorId) || 
        (c.instructorName && c.instructorName === course.instructorName)
    );

    instCoursesList.innerHTML = instructorCourses.map(ic => `
        <div class="inst-course-item" data-course-id="${ic.id}" role="button" tabindex="0" aria-label="Open ${escapeHtml(ic.title)}">
            <img src="${ic.thumb || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&q=80'}" alt="${escapeHtml(ic.title)}" class="inst-course-thumb" onerror="this.src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=100&q=80'">
            <span class="inst-course-title">${escapeHtml(ic.title)}</span>
            <span class="inst-course-lessons">${ic.lessons || 0} Lessons</span>
            <svg class="inst-course-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
        </div>
    `).join('');

    // These were previously decorative only (hover style, no handler). Tapping one
    // now folds into the existing workflow: jump straight to course files if the
    // student is already enrolled, otherwise close this modal and surface the card
    // back in the main grid so they can enroll from there.
    instCoursesList.querySelectorAll('.inst-course-item').forEach(item => {
        const goToCourse = () => {
            const targetId = item.dataset.courseId;
            closeInstructorProfileModal();
            if (myEnrollments.has(targetId)) {
                openCourseMaterialsModal(targetId);
            } else {
                highlightCourseCard(targetId);
            }
        };
        item.addEventListener('click', goToCourse);
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToCourse();
            }
        });
    });

    document.getElementById('instructorProfileModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeInstructorProfileModal() {
    document.getElementById('instructorProfileModal').classList.remove('open');
    document.body.style.overflow = '';
}

/* Scrolls to and briefly pulses a course card already in the grid. Used when a
   student taps a not-yet-enrolled course from an instructor's course list —
   rather than silently doing nothing or force-enrolling them, it hands them
   back to the same card + Enroll button they'd use anywhere else in the app. */
function highlightCourseCard(courseId) {
    const btn = document.querySelector(`.course-btn[data-id="${courseId}"]`);
    const card = btn ? btn.closest('.course-card') : null;
    if (!card) {
        showToast('That course is hidden by your current filter or search — try "All Courses".', 'info');
        return;
    }
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('course-card-highlight');
    setTimeout(() => card.classList.remove('course-card-highlight'), 1600);
}

/* ── MODAL EVENT LISTENERS ── */
function setupModalListeners() {
    document.getElementById('materialsModalClose')?.addEventListener('click', closeCourseMaterialsModal);
    document.getElementById('closeMaterialsBtn')?.addEventListener('click', closeCourseMaterialsModal);
    document.getElementById('materialsModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('materialsModal')) closeCourseMaterialsModal();
    });

    document.getElementById('instModalClose')?.addEventListener('click', closeInstructorProfileModal);
    document.getElementById('closeInstModalBtn')?.addEventListener('click', closeInstructorProfileModal);
    document.getElementById('instructorProfileModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('instructorProfileModal')) closeInstructorProfileModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCourseMaterialsModal();
            closeInstructorProfileModal();
        }
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

    const container = document.getElementById('toastContainer') || document.getElementById('toast-container');
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
