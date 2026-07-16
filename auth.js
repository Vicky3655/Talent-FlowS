/* ============================================================
   TALENT FLOW  |  auth.js  (Supabase)
   ------------------------------------------------------------
   Real accounts via Supabase Auth + Postgres, with Supabase
   Storage for avatar photos. Exposes window.TalentFlowAuth,
   which every other script calls into — same method names as
   the old Firebase version, so nothing else in the app needs
   to change.
   ============================================================ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ── Paste your Supabase project's URL and anon key here ─────
   Supabase dashboard → Project Settings → API. The anon key is
   safe to expose client-side — it only grants what the Row
   Level Security policies (see the SQL schema) allow. ──────── */
const SUPABASE_URL = 'https://ontaucdcmrkyvpflxtti.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_x-zRHHlxLCq1gh28aTv-0w_kht1wDxa';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── ERROR MESSAGES ──────────────────────────────────────── */
function friendlyError(err) {
  const raw = (err && (err.message || err.error_description)) || String(err || '');
  console.error('Auth/Storage error:', raw);
  const msg = raw.toLowerCase();

  if (msg.includes('invalid login credentials')) return 'Incorrect email or password';
  if (msg.includes('already registered') || msg.includes('already been registered')) return "That email's already registered — try logging in instead";
  if (msg.includes('password should be at least') || msg.includes('weak password')) return 'Please use at least 8 characters';
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Too many attempts — please wait a moment and try again';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Network error — check your connection and try again';
  if (msg.includes('email not confirmed')) return 'Please confirm your email before logging in';
  if (msg.includes('row-level security') || msg.includes('permission denied')) return "That action isn't permitted — check your account permissions";
  if (msg.includes('bucket') || msg.includes('storage')) return "Photo upload isn't permitted — check your Supabase Storage setup";
  if (msg.includes('invalid email')) return 'Enter a valid email address';

  return 'Something went wrong — please try again';
}

/* ── TIMEOUT HELPER ───────────────────────────────────────────
   Never let a Supabase call hang forever — same safeguard the
   Firestore version had against silent failures. ───────────── */
function withTimeout(promise, ms = 4000, message = 'Request timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

/* ── PROFILE STORAGE (Postgres `profiles` table) ─────────────
   Auth itself only knows email. Everything else (role, bio,
   avatar, settings…) lives in profiles/{uid} — auto-created the
   moment someone signs up (see the SQL trigger), so saveProfile()
   can always just upsert. A `public_profiles` VIEW (not a
   manually-synced collection) exposes name/avatar/role to
   everyone else. ─────────────────────────────────────────────── */

let cachedProfile = null;

const PROFILE_COLUMNS = {
  fullName: 'full_name', email: 'email', bio: 'bio', role: 'role',
  avatar: 'avatar', provider: 'provider', username: 'username',
  profileCompleted: 'profile_completed', title: 'title', expertise: 'expertise',
  experience: 'experience', education: 'education', linkedin: 'linkedin',
  website: 'website', educationLevel: 'education_level', fieldOfStudy: 'field_of_study',
  interests: 'interests', goals: 'goals', github: 'github', settings: 'settings',
};

function toDbPatch(data) {
  const patch = {};
  Object.entries(data).forEach(([key, value]) => {
    patch[PROFILE_COLUMNS[key] || key] = value;
  });
  return patch;
}

function fromDbRow(row) {
  if (!row) return null;
  const out = {};
  Object.entries(PROFILE_COLUMNS).forEach(([camel, col]) => {
    if (row[col] !== undefined) out[camel] = row[col];
  });
  return out;
}

async function saveProfile(uid, data) {
  const patch = toDbPatch(data);
  const { error } = await withTimeout(
    supabase.from('profiles').upsert({ id: uid, ...patch }, { onConflict: 'id' })
  );
  if (error) throw error;
  cachedProfile = { ...(cachedProfile || {}), ...data };
  return data;
}

async function loadProfile(uid) {
  const { data, error } = await withTimeout(
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
  );
  if (error) throw error;
  cachedProfile = fromDbRow(data);
  return cachedProfile;
}

/* ── STUDENT LOOKUP (RPC) ─────────────────────────────────────
   Used by the instructor "Invite Student" flow to recognise an
   already-registered student by email. */
async function findStudentByEmailDoc(email) {
  const { data, error } = await withTimeout(
    supabase.rpc('find_student_by_email', { lookup_email: email })
  );
  if (error) { console.error('Student lookup failed:', error); return null; }
  if (!data || !data.length) return null;
  const row = data[0];
  return { uid: row.uid, fullName: row.full_name, avatar: row.avatar, email: row.email };
}

/* ── AVATAR PHOTOS (Supabase Storage) ─────────────────────────
   Only the resulting public URL gets stored on the profile row —
   that URL works for anyone, on any device, which is what lets
   an instructor's photo show up on a course card in a student's
   browser. ──────────────────────────────────────────────────── */
async function uploadAvatar(uid, fileOrDataUrl) {
  const timeoutMsg = 'Photo upload timed out. In the Supabase dashboard, check Storage → make sure the "avatars" bucket exists.';

  let fileBody = fileOrDataUrl;
  let contentType = 'image/jpeg';
  let ext = 'jpg';

  if (typeof fileOrDataUrl === 'string') {
    const res = await fetch(fileOrDataUrl);
    fileBody = await res.blob();
    contentType = fileBody.type || contentType;
  } else {
    contentType = fileOrDataUrl.type || contentType;
    const nameExt = (fileOrDataUrl.name || '').split('.').pop();
    if (nameExt) ext = nameExt;
  }

  const path = `${uid}/${Date.now()}.${ext}`;

  const { error: uploadError } = await withTimeout(
    supabase.storage.from('avatars').upload(path, fileBody, { contentType, upsert: true }),
    20000,
    timeoutMsg
  );
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/* ── ENROLLMENTS (Postgres `enrollments` table) ──────────────── */

async function enrollInCourseDoc(studentUid, course) {
  const { error } = await withTimeout(
    supabase.from('enrollments').upsert({
      student_id: studentUid,
      course_id: course.id,
      course_title: course.title,
      thumb: course.thumb || '',
      lessons: course.lessons || 0,
      instructor_name: course.instructorName || '',
      progress: 0,
      completed_lessons: 0,
    }, { onConflict: 'student_id,course_id' })
  );
  if (error) throw error;
}

async function isEnrolledDoc(studentUid, courseId) {
  const { data, error } = await withTimeout(
    supabase.from('enrollments').select('id').eq('student_id', studentUid).eq('course_id', courseId).maybeSingle()
  );
  if (error) throw error;
  return !!data;
}

async function listMyEnrollmentsDocs(studentUid) {
  const { data, error } = await withTimeout(
    supabase.from('enrollments').select('*').eq('student_id', studentUid)
  );
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    courseTitle: r.course_title,
    thumb: r.thumb,
    lessons: r.lessons,
    instructorName: r.instructor_name,
    progress: r.progress,
    completedLessons: r.completed_lessons,
    enrolledAt: r.enrolled_at,
  }));
}

/* ── SHARED AUTH STATE ────────────────────────────────────────
   One listener for the whole app — pages call
   TalentFlowAuth.requireAuth() instead of each wiring up their
   own listener. ─────────────────────────────────────────────── */
let authReady = false;
let currentUser = null;
const readyCallbacks = [];

function normalizeUser(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    uid: user.id,
    email: user.email || '',
    displayName: meta.full_name || meta.name || '',
    photoURL: meta.avatar_url || meta.picture || '',
    emailVerified: !!user.email_confirmed_at,
  };
}

supabase.auth.onAuthStateChange(async (event, session) => {
  currentUser = normalizeUser(session ? session.user : null);
  window.TalentFlowUser = currentUser;
  authReady = true;
  if (!currentUser) cachedProfile = null;
  readyCallbacks.splice(0).forEach((cb) => cb(currentUser));

  if (event === 'PASSWORD_RECOVERY') {
    window.dispatchEvent(new CustomEvent('tf-password-recovery'));
  }

  // Completing a Google redirect lands back here with tokens in the
  // URL hash — finish the same "check profile, go to the right page"
  // step the old popup flow used to do inline.
  if (event === 'SIGNED_IN' && currentUser && window.location.hash.includes('access_token')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    try {
      const existing = await loadProfile(currentUser.uid);
      if (!existing) {
        await saveProfile(currentUser.uid, {
          fullName: currentUser.displayName || '',
          email: currentUser.email || '',
          provider: 'google',
          role: '',
        });
      }
      window.TalentFlowAuth.redirectToRoleProfile(existing ? existing.role : '', currentUser);
    } catch (err) {
      console.error('Post-sign-in redirect check failed:', err);
    }
  }
});

function onUserKnown(callback) {
  if (authReady) callback(currentUser);
  else readyCallbacks.push(callback);
}

/* Simple initials avatar (used until someone uploads a real photo). */
function initialsAvatar(label) {
  const initial = (label || '?').trim().charAt(0).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">`
    + `<rect width="80" height="80" rx="40" fill="#2563eb"/>`
    + `<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" `
    + `font-family="Inter, sans-serif" font-size="34" fill="#ffffff" font-weight="700">${initial}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ── PUBLIC INTERFACE ─────────────────────────────────────── */
window.TalentFlowAuth = {
  async signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
  },

  async register(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } },
    });
    if (error) throw error;
    const user = normalizeUser(data.user);
    await saveProfile(user.uid, { fullName: name, email, role: '', provider: 'email' }).catch((err) => {
      console.error('Profile save failed (continuing anyway):', err);
    });
    return { user, role: '' };
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = normalizeUser(data.user);
    let role = '';
    try {
      const profile = await loadProfile(user.uid);
      role = profile ? profile.role : '';
    } catch (err) {
      console.error('Profile read failed (continuing anyway):', err);
    }
    return { user, role };
  },

  async sendResetLink(email) {
    const redirectTo = window.location.href.replace(/[^/]*$/, 'password.html');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  async confirmPasswordReset(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  redirectToRoleProfile(role, user) {
    const u = user || window.TalentFlowUser;
    if (u && !u.emailVerified) { window.location.href = 'verify-email.html'; return; }
    if (role === 'Instructor') window.location.href = 'instructor-profile.html';
    else if (role === 'Student') window.location.href = 'student-profile.html';
    else window.location.href = 'choose-role.html';
  },

  async sendVerificationEmail() {
    const email = window.TalentFlowUser && window.TalentFlowUser.email;
    if (!email) throw new Error('Not signed in');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },

  async checkEmailVerified() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data || !data.user) return false;
    currentUser = normalizeUser(data.user);
    window.TalentFlowUser = currentUser;
    return currentUser.emailVerified;
  },

  setRole(role) {
    const user = window.TalentFlowUser;
    if (!user) { window.location.href = 'login.html'; return; }
    saveProfile(user.uid, { role }).catch((err) => {
      console.error('Role save failed (continuing anyway):', err);
    });
    this.redirectToRoleProfile(role);
  },

  logOut() {
    return supabase.auth.signOut().then(() => { window.location.href = 'login.html'; });
  },
  signOutUser() { return this.logOut(); },

  requireAuth() {
    return new Promise((resolve) => {
      onUserKnown((user) => {
        if (!user) { window.location.href = 'login.html'; return; }
        resolve(user);
      });
    });
  },

  saveProfile,
  loadProfile,
  findStudentByEmail: findStudentByEmailDoc,
  saveUserProfile(data) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return saveProfile(user.uid, data);
  },
  getStoredProfile() { return cachedProfile; },

  getSettings() { return (cachedProfile && cachedProfile.settings) || {}; },
  saveSettings(patch) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    const merged = { ...((cachedProfile && cachedProfile.settings) || {}), ...patch };
    return saveProfile(user.uid, { settings: merged });
  },

  uploadAvatar,
  initialsAvatar,
  friendlyError,

  // Supabase client instance — data-store.js reuses this instead of
  // creating a second client.
  supabase,

  enrollInCourse(course) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return enrollInCourseDoc(user.uid, course);
  },
  isEnrolled(courseId) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.resolve(false);
    return isEnrolledDoc(user.uid, courseId);
  },
  listMyEnrollments() {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return listMyEnrollmentsDocs(user.uid);
  },
};
