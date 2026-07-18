/* ============================================================
   TALENT FLOW  |  nav-avatar.js
   ------------------------------------------------------------
   Keeps the signed-in person's name/photo/role in sync everywhere
   the nav chrome shows them: the topbar avatar, the "mini profile"
   in the mobile sidebar footer, and the profile popup on the
   instructor dashboard.

   Two bridges exist — tf_instructor_profile and tf_student_profile
   — written by profile.js (and, for instructors, settings.js) the
   moment a profile form is saved. Reading the bridge first means
   the nav paints instantly from whatever's cached on this device;
   this file then reconciles with Supabase (the cross-device
   source of truth) and refreshes the bridge, so a photo or name
   changed on ANOTHER device shows up here too — not just on the
   device that made the change.

   Which bridge a page uses is decided by
   document.body.dataset.profilePage ('student' or anything else
   defaults to instructor) — set on every profile-aware page,
   including instructor-profile.html, student-profile.html, and
   student-courses.html.
   ============================================================ */
(function () {
  'use strict';

  const INSTRUCTOR_BRIDGE_KEY = 'tf_instructor_profile';
  const STUDENT_BRIDGE_KEY = 'tf_student_profile';

  function readBridge(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeBridge(key, patch) {
    try {
      const merged = { ...(readBridge(key) || {}), ...patch };
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (err) {
      console.error('Could not update the shared profile bridge:', err);
    }
  }

  // auth.js is an ES module fetching an external dependency, so there's
  // no hard guarantee window.TalentFlowAuth exists the instant this
  // script runs. Poll briefly for it instead of checking once and
  // leaving the nav permanently stuck on whatever was cached (or
  // nothing, which is what an empty <img src=""> renders as — a
  // broken image with clipped alt text).
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

  // Self-contained fallback so the avatar is never blank/broken even
  // if TalentFlowAuth (and its initialsAvatar helper) never loads.
  function localInitialsAvatar(label) {
    const initial = (label || '?').trim().charAt(0).toUpperCase() || '?';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">`
      + `<rect width="80" height="80" rx="40" fill="#2563eb"/>`
      + `<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" `
      + `font-family="Inter, sans-serif" font-size="34" fill="#ffffff" font-weight="700">${initial}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function apply(bridgeKey, user) {
    const bridge = readBridge(bridgeKey);
    const name = bridge?.fullName || user?.displayName || user?.email || '';
    const role = bridge?.role || '';
    let avatar = bridge?.avatar || user?.photoURL || '';
    if (!avatar) {
      avatar = (name && window.TalentFlowAuth?.initialsAvatar)
        ? window.TalentFlowAuth.initialsAvatar(name)
        : localInitialsAvatar(name || (bridgeKey === STUDENT_BRIDGE_KEY ? 'S' : 'T'));
    }

    const topbarImg = document.getElementById('nav-avatar-img');
    if (topbarImg && avatar) topbarImg.src = avatar;

    const footerAvatar = document.querySelector('.sb-footer-avatar');
    if (footerAvatar && avatar) footerAvatar.src = avatar;

    const footerName = document.querySelector('.sb-footer-name');
    if (footerName && name) footerName.textContent = name;

    const footerRole = document.querySelector('.sb-footer-role');
    if (footerRole && role) footerRole.textContent = role;

    // instructor-dashboard.html uses a different desktop nav pattern — a
    // small always-visible avatar plus a click-to-open profile popup with
    // its own (larger) avatar, name, and role. Same data, different
    // markup, so this just targets a few more selectors; pages without
    // these elements simply skip them.
    const wrapAvatar = document.querySelector('.avatar-wrap img');
    if (wrapAvatar && avatar) wrapAvatar.src = avatar;

    const popupAvatar = document.querySelector('.pp-header img');
    if (popupAvatar && avatar) popupAvatar.src = avatar;

    const popupName = document.querySelector('.pp-name');
    if (popupName && name) popupName.textContent = name;

    const popupRole = document.querySelector('.pp-role');
    if (popupRole && role) popupRole.textContent = role;
  }

  function initForRole(bridgeKey) {
    apply(bridgeKey); // instant paint from whatever's cached on this device

    waitForTalentFlowAuth().then((auth) => {
      if (!auth) {
        console.error("Talent Flow's sign-in service did not load — showing cached profile info only.");
        return;
      }
      auth.requireAuth().then(async (user) => {
        try {
          const profile = await auth.loadProfile(user.uid);
          if (profile) {
            writeBridge(bridgeKey, {
              fullName: profile.fullName || user.displayName || '',
              role: profile.role || '',
              avatar: profile.avatar || '',
              email: profile.email || user.email || '',
            });
          }
        } catch (err) {
          console.error('Could not refresh profile from Supabase:', err);
        }
        apply(bridgeKey, user);
      });
    });

    // Live-update if the profile changes in another tab...
    window.addEventListener('storage', (e) => {
      if (e.key === bridgeKey) apply(bridgeKey);
    });
    // ...or right here, the moment this page's own save handler fires.
    window.addEventListener('tf-profile-updated', (e) => {
      if (!e.detail || e.detail.key === bridgeKey) apply(bridgeKey);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const isStudent = document.body?.dataset?.profilePage === 'student';
    initForRole(isStudent ? STUDENT_BRIDGE_KEY : INSTRUCTOR_BRIDGE_KEY);
  });
})();
