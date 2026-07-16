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
   this file then reconciles with Firestore (the cross-device
   source of truth) and refreshes the bridge, so a photo or name
   changed on ANOTHER device shows up here too — not just on the
   device that made the change.

   Which bridge a page uses is decided by
   document.body.dataset.profilePage ('student' or anything else
   defaults to instructor) — set on every profile-aware page,
   including instructor-profile.html, student-profile.html, and
   student-courses.html.

   Previously, student pages skipped the bridge entirely and only
   ever showed a Google account photo or generated initials — so a
   student's own uploaded avatar never actually appeared here, and
   could even flicker back to the wrong image after profile.js set
   it correctly. Both roles now go through the same logic below.
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

  function apply(bridgeKey, user) {
    const bridge = readBridge(bridgeKey);
    const name = bridge?.fullName || user?.displayName || user?.email || '';
    const role = bridge?.role || '';
    let avatar = bridge?.avatar || user?.photoURL || '';
    if (!avatar && name && window.TalentFlowAuth?.initialsAvatar) {
      avatar = window.TalentFlowAuth.initialsAvatar(name);
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

    if (window.TalentFlowAuth) {
      window.TalentFlowAuth.requireAuth().then(async (user) => {
        try {
          const profile = await window.TalentFlowAuth.loadProfile(user.uid);
          if (profile) {
            writeBridge(bridgeKey, {
              fullName: profile.fullName || user.displayName || '',
              role: profile.role || '',
              avatar: profile.avatar || '',
              email: profile.email || user.email || '',
            });
          }
        } catch (err) {
          console.error('Could not refresh profile from Firestore:', err);
        }
        apply(bridgeKey, user);
      });
    }

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
