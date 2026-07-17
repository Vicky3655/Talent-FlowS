/* ============================================================
   TALENT FLOW  |  auth.js  (Supabase)
   ------------------------------------------------------------
   Real accounts via Supabase Auth + Postgres.
   ============================================================ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ontaucdcmrkyvpflxtti.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_x-zRHHlxLCq1gh28aTv-0w_kht1wDxa';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── ERROR MESSAGES ──────────────────────────────────────── */
function friendlyError(err) {
  const raw = (err && (err.message || err.error_description)) || String(err || '');
  console.error('Auth/Storage error:', raw);
  const msg = raw.toLowerCase();

  if (msg.includes('invalid login credentials')) return 'Incorrect email or password';
  if (msg.includes('already registered')) return "That email's already registered — try logging in instead";
  if (msg.includes('password should be at least')) return 'Please use at least 8 characters';
  if (msg.includes('rate limit')) return 'Too many attempts — please wait a moment';
  if (msg.includes('email not confirmed')) return 'Please confirm your email before logging in';
  return 'Something went wrong — please try again';
}

function withTimeout(promise, ms = 5000, message = 'Request timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

/* ── PROFILE STORAGE ─────────────────────────────────────── */
let cachedProfile = null;

const PROFILE_COLUMNS = {
  fullName: 'full_name', email: 'email', bio: 'bio', role: 'role',
  avatar: 'avatar', provider: 'provider', username: 'username',
  profileCompleted: 'profile_completed', settings: 'settings'
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

/* ── SHARED AUTH STATE ──────────────────────────────────────── */
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
    emailVerified: !!user.email_confirmed_at || !!user.app_metadata?.provider === 'google',
  };
}

// THE CORE LOGIC CHANGE IS HERE
supabase.auth.onAuthStateChange(async (event, session) => {
  currentUser = normalizeUser(session ? session.user : null);
  window.TalentFlowUser = currentUser;
  authReady = true;
  
  if (!currentUser) cachedProfile = null;
  readyCallbacks.splice(0).forEach((cb) => cb(currentUser));

  if (event === 'SIGNED_IN' && currentUser) {
    // 1. Clear hash if landing back from Google
    if (window.location.hash.includes('access_token')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    try {
      // 2. Check if profile exists, if not, create it
      let profile = await loadProfile(currentUser.uid);
      if (!profile) {
        profile = {
          fullName: currentUser.displayName || '',
          email: currentUser.email || '',
          provider: session.provider || 'google',
          role: '',
        };
        await saveProfile(currentUser.uid, profile);
      }

      // 3. Only auto-redirect if we are on the login or landing page
      const path = window.location.pathname;
      const isEntryPage = path.endsWith('login.html') || path.endsWith('index.html') || path === '/' || path === '';
      
      if (isEntryPage) {
        window.TalentFlowAuth.redirectToRoleProfile(profile.role, currentUser);
      }
    } catch (err) {
      console.error('Post-login profile check failed:', err);
    }
  }

  if (event === 'PASSWORD_RECOVERY') {
    window.dispatchEvent(new CustomEvent('tf-password-recovery'));
  }
});

function onUserKnown(callback) {
  if (authReady) callback(currentUser);
  else readyCallbacks.push(callback);
}

/* ── PUBLIC INTERFACE ─────────────────────────────────────── */
window.TalentFlowAuth = {
  async signInWithGoogle() {
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { redirectTo } 
    });
    if (error) throw error;
  },

  async register(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } },
    });
    if (error) throw error;
    const user = normalizeUser(data.user);
    await saveProfile(user.uid, { fullName: name, email, role: '', provider: 'email' });
    return { user, role: '' };
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = normalizeUser(data.user);
    const profile = await loadProfile(user.uid);
    return { user, role: profile ? profile.role : '' };
  },

  redirectToRoleProfile(role, user) {
    const u = user || window.TalentFlowUser;
    // Google users are usually auto-verified, but check just in case
    if (u && !u.emailVerified && !window.location.href.includes('verify-email')) { 
        window.location.href = 'verify-email.html'; 
        return; 
    }
    
    if (role === 'Instructor') window.location.href = 'instructor-profile.html';
    else if (role === 'Student') window.location.href = 'student-profile.html';
    else window.location.href = 'choose-role.html';
  },

  async setRole(role) {
    const user = window.TalentFlowUser;
    if (!user) return;
    await saveProfile(user.uid, { role });
    this.redirectToRoleProfile(role);
  },

  logOut() {
    return supabase.auth.signOut().then(() => { window.location.href = 'login.html'; });
  },

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
  friendlyError,
  supabase
};
