/* ============================================================
   TALENT FLOW  |  auth.js
   ------------------------------------------------------------
   Real accounts via Firebase Authentication + Firestore, with
   Firebase Storage for avatar photos.
   Exposes window.TalentFlowAuth, which every other script calls
   into. This file owns everything Firebase-related.
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js';

/* ── Paste your Talent Flow project's config here ────────────
   Firebase console → ⚙️ Project settings → General → "Your apps"
   This must be a DIFFERENT project from Mise AI's — separate app,
   separate users. This is the only setup this file needs. ──── */
const firebaseConfig = {
    apiKey: "AIzaSyCW_ZS2R8UxhGoA5bqK4fZ59tagu29HDJk",
    authDomain: "another-b384c.firebaseapp.com",
    projectId: "another-b384c",
    storageBucket: "another-b384c.firebasestorage.app",
    messagingSenderId: "913158897020",
    appId: "1:913158897020:web:ea87eeb222f7a8d8dff8f9",
    measurementId: "G-DY0JVEJG1R"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

/* ── ERROR MESSAGES ──────────────────────────────────────── */
function friendlyError(err) {
  const code = (err && err.code) || '';
  console.error('Auth error:', code, err && err.message);
  const messages = {
    'auth/invalid-email':          'Enter a valid email address',
    'auth/user-not-found':         'Incorrect email or password',
    'auth/wrong-password':         'Incorrect email or password',
    'auth/invalid-credential':     'Incorrect email or password',
    'auth/email-already-in-use':   "That email's already registered — try logging in instead",
    'auth/weak-password':          'Please use at least 8 characters',
    'auth/too-many-requests':      'Too many attempts — please wait a moment and try again',
    'auth/network-request-failed': 'Network error — check your connection and try again',
    'auth/unauthorized-domain':    "This domain isn't authorized in Firebase yet",
    'auth/operation-not-allowed':  "This sign-in method isn't enabled yet in the Firebase console",
    'storage/unauthorized':        "Photo upload isn't permitted — check Firebase Storage rules",
    'storage/unknown':             'Could not upload the photo — please try again',
  };
  return messages[code] || 'Something went wrong — please try again';
}

/* ── PROFILE STORAGE (Firestore) ─────────────────────────────
   Firebase Auth itself only knows name/email/photo. Everything
   else the app needs (role, bio, avatar URL, settings…) lives in
   a small Firestore doc per user instead: users/{uid}.

   Alongside that private doc, a small publicProfiles/{uid} doc is
   kept in sync with just the fields safe to show to OTHER people
   (name, avatar, role) — e.g. so a student can see an instructor's
   name/photo on a course card without being able to read that
   instructor's email or anything else private. ─────────────── */

// Never let a Firestore call hang forever — if something's silently
// blocking the connection (a strict ad-blocker/extension is the most
// common cause), fail after 4s instead of waiting indefinitely.
function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore request timed out')), ms)),
  ]);
}

// Small in-memory cache of the signed-in user's OWN profile, so
// synchronous readers (like settings.js) always have something to
// read once loadProfile() has resolved at least once this session.
let cachedProfile = null;

const PUBLIC_FIELDS = ['fullName', 'avatar', 'role'];

function publicSlice(data) {
  const out = {};
  PUBLIC_FIELDS.forEach((key) => {
    if (data[key] !== undefined) out[key] = data[key];
  });
  return out;
}

async function saveProfile(uid, data) {
  await withTimeout(setDoc(doc(db, 'users', uid), data, { merge: true }));
  cachedProfile = { ...(cachedProfile || {}), ...data };

  const publicPatch = publicSlice(data);
  if (Object.keys(publicPatch).length) {
    // Best-effort — a student's course-catalog view being a beat behind
    // isn't worth blocking (or failing) the profile save over.
    withTimeout(setDoc(doc(db, 'publicProfiles', uid), publicPatch, { merge: true })).catch((err) => {
      console.error('Public profile sync failed (continuing anyway):', err);
    });
  }
  return data;
}

async function loadProfile(uid) {
  const snap = await withTimeout(getDoc(doc(db, 'users', uid)));
  const data = snap.exists() ? snap.data() : null;
  cachedProfile = data;
  return data;
}

/* ── AVATAR PHOTOS (Firebase Storage) ─────────────────────────
   Firestore documents are meant to stay small, so the photo
   itself is uploaded to Storage and only its download URL (a
   short string) is stored on the profile doc. That URL works for
   anyone who loads it — including a different person on a
   different device — which is what lets an instructor's photo
   show up on a course card in a student's browser. ──────────── */

async function uploadAvatar(uid, fileOrDataUrl) {
  const path = `avatars/${uid}/${Date.now()}`;
  const storageRef = ref(storage, path);
  if (typeof fileOrDataUrl === 'string') {
    await uploadString(storageRef, fileOrDataUrl, 'data_url');
  } else {
    await uploadBytes(storageRef, fileOrDataUrl, { contentType: fileOrDataUrl.type || 'image/jpeg' });
  }
  return getDownloadURL(storageRef);
}

/* ── ENROLLMENTS (Firestore) ─────────────────────────────────
   enrollments/{studentUid_courseId} — one doc per student+course
   pair, ID built from both uids so a student can't double-enroll
   and "am I enrolled?" is a single doc lookup, not a query. ──── */

async function enrollInCourseDoc(studentUid, course) {
  const enrollmentId = `${studentUid}_${course.id}`;
  await withTimeout(setDoc(doc(db, 'enrollments', enrollmentId), {
    studentUid,
    courseId: course.id,
    courseTitle: course.title,
    thumb: course.thumb || '',
    lessons: course.lessons || 0,
    instructorName: course.instructorName || '',
    progress: 0,
    completedLessons: 0,
    enrolledAt: serverTimestamp(),
  }));
}

async function isEnrolledDoc(studentUid, courseId) {
  const snap = await withTimeout(getDoc(doc(db, 'enrollments', `${studentUid}_${courseId}`)));
  return snap.exists();
}

async function listMyEnrollmentsDocs(studentUid) {
  const q = query(collection(db, 'enrollments'), where('studentUid', '==', studentUid));
  const snap = await withTimeout(getDocs(q));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ── SHARED AUTH STATE ────────────────────────────────────────
   One listener for the whole app. Pages that need to know who's
   signed in (profile pages) call TalentFlowAuth.requireAuth()
   instead of each wiring up their own onAuthStateChanged. ──── */
let authReady = false;
let currentUser = null;
const readyCallbacks = [];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authReady = true;
  window.TalentFlowUser = user;
  if (!user) cachedProfile = null;
  readyCallbacks.splice(0).forEach((cb) => cb(user));
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
  // Opens Firebase's own Google popup — no separate client ID needed.
  signInWithGoogle() {
    return signInWithPopup(auth, googleProvider).then(async ({ user }) => {
      let role = '';
      try {
        const existing = await loadProfile(user.uid);
        role = existing ? existing.role : '';
        if (!existing) {
          saveProfile(user.uid, {
            name: user.displayName || '',
            fullName: user.displayName || '',
            email: user.email || '',
            provider: 'google',
            role: '',
          }).catch((err) => console.error('Firestore profile save failed (continuing anyway):', err));
        }
      } catch (err) {
        // Signed in fine, but couldn't reach Firestore in time — don't
        // strand someone who's already authenticated over this.
        console.error('Firestore profile read failed (continuing anyway):', err);
      }
      window.TalentFlowAuth.redirectToRoleProfile(role, user);
    });
  },

  // Email/password sign-up. Role isn't collected here anymore — it's
  // chosen on choose-role.html right after this. Returns a Promise.
  async register(name, email, password) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    saveProfile(user.uid, { name, fullName: name, email, role: '', provider: 'email' }).catch((err) => {
      console.error('Firestore profile save failed (continuing anyway):', err);
    });
    sendEmailVerification(user).catch((err) => {
      console.error('Could not send verification email (continuing anyway):', err);
    });
    return { user, role: '' };
  },

  // Email/password login. Returns a Promise resolving to { user, role }.
  async login(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    let role = '';
    try {
      const profile = await loadProfile(user.uid);
      role = profile ? profile.role : '';
    } catch (err) {
      console.error('Firestore profile read failed (continuing anyway):', err);
    }
    return { user, role };
  },

  // Real reset-link email (replaces the old instant-reveal demo).
  sendResetLink(email) {
    return sendPasswordResetEmail(auth, email);
  },

  // Where to send someone after login/signup, based on role. An
  // unverified email/password account is sent to verify-email.html
  // first — Google accounts arrive already verified by Google, so
  // they skip straight through. Blank role (brand-new signup) goes
  // to choose-role.html to pick one.
  redirectToRoleProfile(role, user) {
    const u = user || window.TalentFlowUser;
    if (u && !u.emailVerified) { window.location.href = 'verify-email.html'; return; }
    if (role === 'Instructor') window.location.href = 'instructor-profile.html';
    else if (role === 'Student') window.location.href = 'student-profile.html';
    else window.location.href = 'choose-role.html';
  },

  // verify-email.html calls this to send (or resend) the link.
  sendVerificationEmail() {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return sendEmailVerification(user);
  },

  // verify-email.html calls this after the person says they've
  // clicked the link — re-checks with Firebase rather than trusting
  // a local flag, since the click happened in their email client.
  async checkEmailVerified() {
    const user = window.TalentFlowUser;
    if (!user) return false;
    await withTimeout(reload(user));
    return user.emailVerified;
  },

  // choose-role.html calls this once someone picks a card. Sends them
  // straight to the matching profile-setup page immediately, while the
  // save happens quietly in the background — navigation never waits on it.
  setRole(role) {
    const user = window.TalentFlowUser;
    if (!user) { window.location.href = 'login.html'; return; }
    saveProfile(user.uid, { role }).catch((err) => {
      console.error('Firestore role save failed (continuing anyway):', err);
    });
    this.redirectToRoleProfile(role);
  },

  logOut() {
    return signOut(auth).then(() => { window.location.href = 'login.html'; });
  },
  signOutUser() {
    return this.logOut();
  },

  // Protected pages call this on load. Resolves with the signed-in
  // user, or sends them to login.html if there isn't one.
  requireAuth() {
    return new Promise((resolve) => {
      onUserKnown((user) => {
        if (!user) { window.location.href = 'login.html'; return; }
        resolve(user);
      });
    });
  },

  // Profile
  saveProfile,
  loadProfile,
  // Same as saveProfile, but for the currently signed-in user — used by
  // pages (like settings.js) that don't already have the uid handy.
  saveUserProfile(data) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return saveProfile(user.uid, data);
  },
  // Synchronous read of whatever loadProfile()/saveProfile() last saw —
  // there for callers that render before they can await anything.
  getStoredProfile() {
    return cachedProfile;
  },

  // App settings (language, timezone, notification prefs, 2FA) live as a
  // nested field on the same user doc rather than a separate collection.
  getSettings() {
    return (cachedProfile && cachedProfile.settings) || {};
  },
  saveSettings(patch) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    const merged = { ...((cachedProfile && cachedProfile.settings) || {}), ...patch };
    return saveProfile(user.uid, { settings: merged });
  },

  // Avatar photo upload → Firebase Storage, returns a public URL that
  // works for anyone, on any device.
  uploadAvatar,

  initialsAvatar,
  friendlyError,

  // Firestore instance — data-store.js reuses this instead of creating
  // a second Firebase app. (This was missing before, which meant
  // data-store.js could never actually reach Firestore.)
  db,

  // Enrollment
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
