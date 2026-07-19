/* ============================================================
   TALENT FLOW  |  data-store.js  (Supabase)
   ------------------------------------------------------------
   Reuses the Supabase client auth.js already created, via
   window.TalentFlowAuth.supabase — so auth.js must load first,
   same as before.

   Exposes window.TalentFlowData with the exact same method
   names/shapes as the old Firestore version, so courses.js,
   instructor-assignments.js, and student-courses.js need no
   changes at all.
   ============================================================ */

const supabase = window.TalentFlowAuth.supabase;

/* ── COURSES ─────────────────────────────────────────────── */

function mapCourseRow(c) {
  return {
    id: c.id,
    instructorId: c.instructor_id,
    title: c.title,
    desc: c.description,
    thumb: c.thumb,
    alt: c.alt,
    lessons: c.lessons,
    status: c.status,
    notify: c.notify,
    materials: c.materials || [],
  };
}

async function getCourses(instructorId) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCourseRow);
}

async function saveCourse(instructorId, courseData, courseId = null) {
  const payload = {
    title: courseData.title,
    description: courseData.desc,
    thumb: courseData.thumb,
    alt: courseData.alt,
    lessons: courseData.lessons,
    status: courseData.status,
    notify: courseData.notify,
    materials: courseData.materials || [],
  };

  if (courseId) {
    const { error } = await supabase.from('courses').update(payload).eq('id', courseId);
    if (error) throw error;
    return courseId;
  }

  const { data, error } = await supabase
    .from('courses')
    .insert({ ...payload, instructor_id: instructorId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function updateCourseMaterials(courseId, materials) {
  const { error } = await supabase.from('courses').update({ materials }).eq('id', courseId);
  if (error) throw error;
}

/* ── STUDENT-FACING CATALOG ──────────────────────────────────
   Published courses, joined with each instructor's public
   name/photo from the public_profiles view — the Postgres
   equivalent of the old publicProfiles mirror, except it's a
   live view instead of a manually-synced copy. */

async function getPublishedCourses() {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const instructorIds = [...new Set((courses || []).map(c => c.instructor_id).filter(Boolean))];
  const profilesById = {};

  if (instructorIds.length) {
    const { data: profiles, error: pErr } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar')
      .in('id', instructorIds);
    if (pErr) console.error('Could not load instructor profiles for course catalog:', pErr);
    (profiles || []).forEach((p) => { profilesById[p.id] = p; });
  }

  return (courses || []).map((c) => {
    const p = profilesById[c.instructor_id] || {};
    return {
      ...mapCourseRow(c),
      instructorName: p.full_name || 'Talent Flow Instructor',
      instructorAvatar: p.avatar || '',
    };
  });
}

/* ── INSTRUCTOR ASSIGNMENTS ──────────────────────────────────── */

function mapAssignmentRow(a) {
  return {
    id: a.id,
    instructorId: a.instructor_id,
    title: a.title,
    course: a.course,
    instructions: a.instructions,
    dueDate: a.due_date,
    maxScore: a.max_score,
    assignTo: a.assign_to,
    status: a.status,
    submissions: a.submissions || [],
  };
}

async function getAssignments(instructorId) {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssignmentRow);
}

async function saveAssignment(instructorId, assignmentData, assignmentId = null) {
  const payload = {
    title: assignmentData.title,
    course: assignmentData.course,
    instructions: assignmentData.instructions,
    due_date: assignmentData.dueDate,
    max_score: assignmentData.maxScore,
    assign_to: assignmentData.assignTo,
    status: assignmentData.status,
  };
  if (assignmentData.submissions !== undefined) payload.submissions = assignmentData.submissions;

  if (assignmentId) {
    const { error } = await supabase.from('assignments').update(payload).eq('id', assignmentId);
    if (error) throw error;
    return assignmentId;
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert({ ...payload, instructor_id: instructorId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function deleteAssignmentDoc(assignmentId) {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw error;
}

async function updateSubmissions(assignmentId, submissions) {
  const { error } = await supabase.from('assignments').update({ submissions }).eq('id', assignmentId);
  if (error) throw error;
}

/* ── STUDENTS, AGGREGATED FROM ENROLLMENTS ───────────────────
   There's no dedicated "students" table — a student is just
   anyone with a row in `enrollments` pointing at one of this
   instructor's courses. This walks that path: instructor's
   course ids → enrollments on those courses → distinct
   students → their public profile + their grades across this
   instructor's own assignments. */

async function getStudentsForInstructor(instructorId) {
  const { data: courses, error: cErr } = await supabase
    .from('courses')
    .select('id, title')
    .eq('instructor_id', instructorId);
  if (cErr) throw cErr;

  const courseIds = (courses || []).map((c) => c.id);
  const courseTitleById = {};
  (courses || []).forEach((c) => { courseTitleById[c.id] = c.title; });
  if (!courseIds.length) return [];

  const { data: enrollments, error: eErr } = await supabase
    .from('enrollments')
    .select('student_id, course_id, progress, enrolled_at')
    .in('course_id', courseIds);
  if (eErr) throw eErr;

  const byStudent = {};
  (enrollments || []).forEach((e) => {
    if (!byStudent[e.student_id]) {
      byStudent[e.student_id] = { courseIds: [], progressSum: 0, progressCount: 0, enrolledAt: e.enrolled_at };
    }
    const rec = byStudent[e.student_id];
    rec.courseIds.push(e.course_id);
    if (typeof e.progress === 'number') { rec.progressSum += e.progress; rec.progressCount += 1; }
    if (e.enrolled_at && (!rec.enrolledAt || e.enrolled_at < rec.enrolledAt)) rec.enrolledAt = e.enrolled_at;
  });

  const studentIds = Object.keys(byStudent);
  if (!studentIds.length) return [];

  const { data: profiles, error: pErr } = await supabase
    .from('public_profiles')
    .select('id, full_name, avatar')
    .in('id', studentIds);
  if (pErr) console.error('Could not load student profiles:', pErr);
  const profileById = {};
  (profiles || []).forEach((p) => { profileById[p.id] = p; });

  // Average grade per student, computed from this instructor's own
  // assignments — the only place scores actually live.
  const assignments = await getAssignments(instructorId);
  const gradeStats = {};
  assignments.forEach((a) => {
    const max = a.maxScore || 100;
    (a.submissions || []).forEach((s) => {
      if (s.score === null || s.score === undefined) return;
      if (!gradeStats[s.studentId]) gradeStats[s.studentId] = { sum: 0, count: 0 };
      gradeStats[s.studentId].sum += (s.score / max) * 100;
      gradeStats[s.studentId].count += 1;
    });
  });

  return studentIds.map((id) => {
    const rec = byStudent[id];
    const p = profileById[id] || {};
    const g = gradeStats[id];
    return {
      id,
      name: p.full_name || 'Talent Flow Student',
      avatar: p.avatar || '',
      courseIds: rec.courseIds,
      courseTitles: rec.courseIds.map((cid) => courseTitleById[cid]).filter(Boolean),
      grade: g && g.count ? Math.round(g.sum / g.count) : null,
      enrolledAt: rec.enrolledAt || null,
      // Nothing in the schema tracks attendance/last-active yet, so
      // these are honest neutral defaults rather than invented numbers.
      status: 'active',
      lastActive: null,
    };
  });
}

/* ── STUDENT-FACING ASSIGNMENTS ──────────────────────────────
   Assignments are matched to a student by course title (the
   same text-matching the rest of the app already relies on —
   `assignments.course` and `enrollments.course_title` are both
   plain text, not a foreign key). */

async function getAssignmentsForStudent(studentId) {
  const { data: enrollments, error: eErr } = await supabase
    .from('enrollments')
    .select('course_title')
    .eq('student_id', studentId);
  if (eErr) throw eErr;

  const courseTitles = [...new Set((enrollments || []).map((e) => e.course_title).filter(Boolean))];
  if (!courseTitles.length) return [];

  const { data: assignments, error: aErr } = await supabase
    .from('assignments')
    .select('*')
    .in('course', courseTitles)
    .neq('status', 'draft')
    .order('due_date', { ascending: true });
  if (aErr) throw aErr;

  return (assignments || []).map((a) => {
    const mapped = mapAssignmentRow(a);
    const submission = mapped.submissions.find((s) => s.studentId === studentId) || null;
    return { ...mapped, submission };
  });
}

async function submitStudentAssignment(assignmentId, studentId, submission) {
  // This goes through the submit_assignment() Postgres function rather
  // than a plain table update. Submissions live as one JSONB array on
  // the assignment row, and RLS can restrict which ROWS a policy
  // covers but not which KEYS inside that array got touched — a
  // client-side read-modify-write with a row-level "students can
  // update their own assignment's submissions" policy would let a
  // student overwrite the whole array, including handing themselves a
  // score. The RPC runs with elevated rights but only ever touches the
  // calling student's own entry and always resets score/feedback to
  // blank, so submitting can never double as self-grading. `studentId`
  // is kept in the signature for compatibility with existing callers,
  // but the server derives the real student from the caller's own
  // session, not from anything the client sends.
  const { data, error } = await supabase.rpc('submit_assignment', {
    p_assignment_id: assignmentId,
    p_text: submission.text || '',
    p_link: submission.link || '',
  });
  if (error) throw error;
  return data;
}

/* ── PUBLIC INTERFACE ─────────────────────────────────────── */
window.TalentFlowData = {
  getCourses,
  saveCourse,
  updateCourseMaterials,
  getPublishedCourses,
  getAssignments,
  saveAssignment,
  deleteAssignmentDoc,
  updateSubmissions,
  getStudentsForInstructor,
  getAssignmentsForStudent,
  submitStudentAssignment,
};
