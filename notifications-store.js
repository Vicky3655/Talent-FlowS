/* ============================================================
   TALENT FLOW  |  notifications-store.js  (Supabase)
   ------------------------------------------------------------
   Backend for the instructor "Student Activity" notification
   bell and the red unread dots on the Courses / Assignments /
   Students sidebar icons.

   Reuses the Supabase client auth.js already created, via
   window.TalentFlowAuth.supabase — same pattern as data-store.js.
   Every call resolves the client lazily (instead of caching it
   at the top of the file) so this still works no matter what
   order auth.js and this script finish loading in.

   Producers (student-side pages — Project2/courses.js when a
   student enrolls or opens a course's materials, and
   Project2/assignment.js when a student submits) call the
   notify*() helpers below.

   Consumers (instructor-side pages, see notifications-ui.js)
   call getRecent / getForCourse / getUnreadSummary / markAllRead
   / markCategoryRead, and can subscribeToInstructor() for
   realtime updates so the bell and dots update live without a
   page refresh.

   Run notifications-schema.sql once in the Supabase SQL editor
   before any of this will work — that's what creates the table,
   its indexes, and its Row Level Security policies.
   ============================================================ */
(function () {
    'use strict';

    function getSupabase() {
        return window.TalentFlowAuth && window.TalentFlowAuth.supabase;
    }

    function mapRow(r) {
        return {
            id: r.id,
            instructorId: r.instructor_id,
            studentId: r.student_id,
            studentName: r.student_name || 'A student',
            studentAvatar: r.student_avatar || '',
            type: r.type,
            categories: r.categories || [],
            courseId: r.course_id,
            courseTitle: r.course_title || '',
            assignmentId: r.assignment_id,
            assignmentTitle: r.assignment_title || '',
            message: r.message,
            read: r.read,
            createdAt: r.created_at,
        };
    }

    /* ── Who is the student making this call? ──────────────────
       Prefers the fuller profile profile.js/settings.js already
       cache in localStorage (real name + real avatar); falls back
       to the basic Supabase auth user object so a notification is
       never silently skipped just because the profile bridge is
       empty (e.g. right after registering, before student-profile
       .html has ever been saved). ───────────────────────────── */
    function resolveStudentIdentity() {
        let bridge = {};
        try {
            const raw = localStorage.getItem('tf_student_profile');
            bridge = raw ? JSON.parse(raw) : {};
        } catch (err) {
            bridge = {};
        }
        const user = window.TalentFlowUser || {};
        const email = user.email || '';
        return {
            id: user.uid || null,
            name: bridge.fullName || user.displayName || (email ? email.split('@')[0] : 'A student'),
            avatar: bridge.avatar || user.photoURL || '',
        };
    }

    async function createNotification(patch) {
        const supabase = getSupabase();
        if (!supabase || !patch || !patch.instructorId || !patch.message) return null;

        const row = {
            instructor_id: patch.instructorId,
            student_id: patch.studentId || null,
            student_name: patch.studentName || null,
            student_avatar: patch.studentAvatar || null,
            type: patch.type,
            categories: patch.categories || [],
            course_id: patch.courseId || null,
            course_title: patch.courseTitle || null,
            assignment_id: patch.assignmentId || null,
            assignment_title: patch.assignmentTitle || null,
            message: patch.message,
        };

        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert(row)
                .select('*')
                .maybeSingle();
            if (error) throw error;
            return data ? mapRow(data) : null;
        } catch (err) {
            // A notification failing to save should never block the
            // student's actual action (enrolling, submitting, etc.) —
            // just log it and move on.
            console.error('Could not create notification:', err);
            return null;
        }
    }

    function notifyEnrollment({ instructorId, studentId, studentName, studentAvatar, courseId, courseTitle }) {
        return createNotification({
            instructorId, studentId, studentName, studentAvatar, courseId, courseTitle,
            type: 'enrollment',
            categories: ['course', 'student'],
            message: `${studentName || 'A student'} enrolled in ${courseTitle || 'your course'}`,
        });
    }

    function notifyMaterialAccess({ instructorId, studentId, studentName, studentAvatar, courseId, courseTitle }) {
        return createNotification({
            instructorId, studentId, studentName, studentAvatar, courseId, courseTitle,
            type: 'material_view',
            categories: ['course'],
            message: `${studentName || 'A student'} opened the materials for ${courseTitle || 'your course'}`,
        });
    }

    function notifySubmission({ instructorId, studentId, studentName, studentAvatar, courseId, courseTitle, assignmentId, assignmentTitle }) {
        return createNotification({
            instructorId, studentId, studentName, studentAvatar, courseId, courseTitle, assignmentId, assignmentTitle,
            type: 'submission',
            categories: ['assignment'],
            message: `${studentName || 'A student'} submitted "${assignmentTitle || 'an assignment'}"${courseTitle ? ` in ${courseTitle}` : ''}`,
        });
    }

    async function getRecent(instructorId, limit = 30) {
        const supabase = getSupabase();
        if (!supabase || !instructorId) return [];
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('instructor_id', instructorId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) { console.error('Loading notifications failed:', error); return []; }
        return (data || []).map(mapRow);
    }

    async function getForCourse(instructorId, courseId, limit = 20) {
        const supabase = getSupabase();
        if (!supabase || !instructorId || !courseId) return [];
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('instructor_id', instructorId)
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) { console.error('Loading course activity failed:', error); return []; }
        return (data || []).map(mapRow);
    }

    async function getUnreadSummary(instructorId) {
        const empty = { total: 0, course: 0, assignment: 0, student: 0 };
        const supabase = getSupabase();
        if (!supabase || !instructorId) return empty;

        const { data, error } = await supabase
            .from('notifications')
            .select('categories')
            .eq('instructor_id', instructorId)
            .eq('read', false);
        if (error) { console.error('Loading unread notification summary failed:', error); return empty; }

        const summary = { ...empty };
        (data || []).forEach((row) => {
            summary.total++;
            (row.categories || []).forEach((c) => {
                if (summary[c] !== undefined) summary[c]++;
            });
        });
        return summary;
    }

    async function markAllRead(instructorId) {
        const supabase = getSupabase();
        if (!supabase || !instructorId) return;
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('instructor_id', instructorId)
            .eq('read', false);
        if (error) console.error('Marking all notifications read failed:', error);
    }

    async function markCategoryRead(instructorId, category) {
        const supabase = getSupabase();
        if (!supabase || !instructorId || !category) return;
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('instructor_id', instructorId)
            .eq('read', false)
            .contains('categories', [category]);
        if (error) console.error(`Marking "${category}" notifications read failed:`, error);
    }

    function subscribeToInstructor(instructorId, onInsert) {
        const supabase = getSupabase();
        if (!supabase || !instructorId || typeof onInsert !== 'function') return () => {};

        const channel = supabase
            .channel(`notifications-${instructorId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `instructor_id=eq.${instructorId}`,
            }, (payload) => onInsert(mapRow(payload.new)))
            .subscribe();

        return () => supabase.removeChannel(channel);
    }

    window.TalentFlowNotifications = {
        resolveStudentIdentity,
        notifyEnrollment,
        notifyMaterialAccess,
        notifySubmission,
        getRecent,
        getForCourse,
        getUnreadSummary,
        markAllRead,
        markCategoryRead,
        subscribeToInstructor,
    };
})();
