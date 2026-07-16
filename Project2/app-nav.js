/* ============================================================
   TALENT FLOW  |  app-nav.js
   ------------------------------------------------------------
   Shared by courses.html, assignment.html, and student-dashboard.html
   — the three pages using the avatar + profile-popup nav pattern.
   Replaces the old localStorage("tf_student_profile") bridge with
   the real signed-in Firebase user, so editing your profile on
   student-profile.html / instructor-profile.html / settings.html
   shows up here automatically instead of needing a separate copy.
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.TalentFlowAuth;
  if (!auth) return;

  const user = await auth.requireAuth(); // redirects to login.html if signed out
  let profile = {};
  try {
    profile = (await auth.loadProfile(user.uid)) || {};
  } catch (err) {
    console.error('Firestore profile read failed — using basic account info instead:', err);
  }

  const displayName = profile.fullName || user.displayName || (user.email ? user.email.split('@')[0] : 'Talent Flow User');
  const avatarUrl   = user.photoURL || auth.initialsAvatar(displayName);
  const roleLabel   = profile.role || '';

  document.querySelectorAll('.avatar-wrap > img, .pp-header > img').forEach((img) => {
    img.src = avatarUrl;
    img.alt = displayName;
  });
  document.querySelectorAll('.pp-name').forEach((el) => { el.textContent = displayName; });
  document.querySelectorAll('.pp-role').forEach((el) => { el.textContent = roleLabel || '—'; });
  document.querySelectorAll('.nav-role').forEach((el) => { el.textContent = roleLabel; });

  // These pages had no way to log out before — wire up a link with this
  // id inside the profile popup if one exists (see the pp-item markup
  // added alongside Profile / My Courses / Settings).
  document.getElementById('navLogoutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    auth.logOut();
  });

  // Available to each page's own script if it needs the signed-in
  // user or profile without fetching it again.
  window.TalentFlowCurrentUser = user;
  window.TalentFlowCurrentProfile = profile;
});
