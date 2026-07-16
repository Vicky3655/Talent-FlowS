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
};
