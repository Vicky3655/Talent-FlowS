/* ============================================================
   TALENT FLOW  |  data-store.js
   ------------------------------------------------------------
   Firestore persistence for Courses, Instructor Assignments, and
   the student-facing course catalog.

   This does NOT call initializeApp() — it reuses the exact
   Firebase app/db instance auth.js already created, via
   window.TalentFlowAuth.db. That means auth.js MUST be loaded
   (as a <script type="module">) before this file on every page,
   AND this file itself must be loaded with <script type="module">
   too (it uses import statements).

   Exposes window.TalentFlowData, which courses.js,
   instructor-assignments.js, and student-courses.js call into.
   None of those files need to import Firebase directly, or even
   be a module — they just read window.TalentFlowData like any
   other global.
   ============================================================ */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const db = window.TalentFlowAuth.db;

/* ── COURSES ──────────────────────────────────────────────────
   Collection: courses/{courseId}
   Fields: instructorId, title, desc, thumb, alt, lessons, status,
           notify, materials[], createdAt, updatedAt
   Materials stay as an array field on the course doc itself —
   there's no separate collection for them, since a course only
   ever has a handful and they're always read together with it. */

async function getCourses(instructorId) {
  const q = query(collection(db, 'courses'), where('instructorId', '==', instructorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Pass an existing courseId to update that course. Omit it (or pass
// null) to create a new one — returns the new doc's id either way.
async function saveCourse(instructorId, courseData, courseId = null) {
  if (courseId) {
    await updateDoc(doc(db, 'courses', courseId), {
      ...courseData,
      updatedAt: serverTimestamp(),
    });
    return courseId;
  }
  const ref = await addDoc(collection(db, 'courses'), {
    ...courseData,
    instructorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// Materials are a full array overwrite — simplest correct option given
// how small this array stays (a handful of files per course).
async function updateCourseMaterials(courseId, materials) {
  await updateDoc(doc(db, 'courses', courseId), {
    materials,
    updatedAt: serverTimestamp(),
  });
}

/* ── STUDENT-FACING CATALOG ───────────────────────────────────
   Every published course, across every instructor, with each
   instructor's public name/photo joined in from publicProfiles/
   so a course card can show "taught by …" without needing a
   separate read per card in the UI layer. Draft courses never
   come back from this query — that's what keeps them invisible
   to students until an instructor publishes. */

async function getPublishedCourses() {
  const q = query(collection(db, 'courses'), where('status', '==', 'published'));
  const snap = await getDocs(q);
  const courses = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const instructorIds = [...new Set(courses.map(c => c.instructorId).filter(Boolean))];
  const profiles = {};
  await Promise.all(instructorIds.map(async (id) => {
    try {
      const pSnap = await getDoc(doc(db, 'publicProfiles', id));
      if (pSnap.exists()) profiles[id] = pSnap.data();
    } catch (err) {
      console.error('Could not load instructor profile for', id, err);
    }
  }));

  const enriched = courses.map(c => {
    const p = profiles[c.instructorId] || {};
    return {
      ...c,
      instructorName: p.fullName || c.instructorName || 'Talent Flow Instructor',
      instructorAvatar: p.avatar || c.instructorAvatar || '',
    };
  });

  enriched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  return enriched;
}

/* ── INSTRUCTOR ASSIGNMENTS ───────────────────────────────────
   Collection: assignments/{assignmentId}
   Fields: instructorId, title, course, instructions, dueDate,
           maxScore, assignTo, status, submissions[], createdAt, updatedAt
   Same reasoning for submissions as materials above: they live on
   the assignment doc as an array, not a subcollection. */

async function getAssignments(instructorId) {
  const q = query(collection(db, 'assignments'), where('instructorId', '==', instructorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveAssignment(instructorId, assignmentData, assignmentId = null) {
  if (assignmentId) {
    await updateDoc(doc(db, 'assignments', assignmentId), {
      ...assignmentData,
      updatedAt: serverTimestamp(),
    });
    return assignmentId;
  }
  const ref = await addDoc(collection(db, 'assignments'), {
    ...assignmentData,
    instructorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

async function deleteAssignmentDoc(assignmentId) {
  await deleteDoc(doc(db, 'assignments', assignmentId));
}

async function updateSubmissions(assignmentId, submissions) {
  await updateDoc(doc(db, 'assignments', assignmentId), {
    submissions,
    updatedAt: serverTimestamp(),
  });
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
