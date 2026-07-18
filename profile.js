/* ============================================================
   TALENT FLOW  |  profile.js
   ------------------------------------------------------------
   Shared by instructor-profile.html and student-profile.html.
   Which fields it reads/writes is driven entirely by the
   data-profile-page="instructor|student" attribute on <body>,
   so one file can serve both pages' different field sets.

   Avatars are uploaded to Supabase Storage on save, and only the
   resulting download URL is written to the profile row — that
   URL works for anyone who loads it, on any device, which is
   what lets it show up somewhere like a course card in a
   student's browser (see data-store.js's getPublishedCourses()).

   Both pages also mirror their data into a small localStorage
   bridge (tf_instructor_profile / tf_student_profile) — on every
   save AND on every page load — so other same-device pages
   (settings, the topbar, the mobile sidebar) update instantly
   without waiting on a round trip. Supabase stays the
   cross-device source of truth; the bridge is just a fast local
   cache of it.

   ------------------------------------------------------------
   Why #profileView and #profileFormSection both start `hidden`
   in the HTML, and why that used to produce a blank page:
   auth.js is a `type="module"` script that has to fetch
   supabase-js from esm.sh before it can set
   window.TalentFlowAuth. If this script ever checked for that
   object exactly once and bailed out when it wasn't there yet
   (slow network, cold Supabase project, blocked CDN request),
   both sections stayed hidden forever — a permanently blank
   page, with no error and nothing to retry. `boot()` below
   fixes that: it actively waits for auth to show up, shows a
   real loading state while it does, and shows a real,
   retryable error message if it never does — the page is never
   silently blank.
   ============================================================ */

const CONFIG = {
  instructor: {
    tagClass: 'tag-chip',
    linkClass: '',
    coursesUrl: 'courses.html',
    storageKey: 'tf_instructor_profile',
    roleLabel: 'Instructor',
    fields: ['fullName', 'title', 'bio', 'expertise', 'experience', 'education', 'linkedin', 'website'],
    toView(p) {
      return {
        name: p.fullName || '',
        title: p.title || '',
        bio: p.bio || '',
        metaValue: p.experience ? `${p.experience} yr${String(p.experience) === '1' ? '' : 's'}` : '—',
        tags: p.expertise || '',
        educationText: p.education || '',
        links: [
          p.linkedin ? { label: 'LinkedIn', url: p.linkedin } : null,
          p.website  ? { label: 'Website',  url: p.website  } : null,
        ].filter(Boolean),
      };
    },
  },
  student: {
    tagClass: 'profile-tag',
    linkClass: 'profile-link',
    coursesUrl: 'student-courses.html',
    storageKey: 'tf_student_profile',
    roleLabel: 'Student',
    fields: ['fullName', 'email', 'educationLevel', 'fieldOfStudy', 'bio', 'interests', 'goals', 'linkedin', 'github'],
    toView(p) {
      return {
        name: p.fullName || '',
        title: p.educationLevel || '',
        bio: p.bio || '',
        metaValue: p.fieldOfStudy || '—',
        tags: p.interests || '',
        educationText: p.goals || '',
        links: [
          p.linkedin ? { label: 'LinkedIn', url: p.linkedin } : null,
          p.github   ? { label: 'GitHub',   url: p.github   } : null,
        ].filter(Boolean),
      };
    },
  },
};

function renderTags(container, text, tagClass) {
  if (!container) return;
  container.innerHTML = '';
  (text || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((tag) => {
    const span = document.createElement('span');
    span.className = tagClass;
    span.textContent = tag;
    container.appendChild(span);
  });
}

function renderLinks(container, links, linkClass) {
  if (!container) return;
  container.innerHTML = '';
  links.forEach(({ label, url }) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (linkClass) a.className = linkClass;
    a.textContent = label;
    container.appendChild(a);
  });
}

// ── Cross-page profile bridge ──────────────────────────────
function readProfileBridge(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Could not read the shared profile bridge:', err);
    return null;
  }
}

function writeProfileBridge(key, patch) {
  try {
    const merged = { ...(readProfileBridge(key) || {}), ...patch };
    localStorage.setItem(key, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('tf-profile-updated', { detail: { key } }));
  } catch (err) {
    console.error('Could not update the shared profile bridge:', err);
  }
}

// ── Robust wait for window.TalentFlowAuth ──────────────────
// auth.js is an ES module fetching an external dependency; there is
// no guarantee it has finished by the moment this classic script's
// DOMContentLoaded callback fires on every browser/network condition.
// Rather than checking once and giving up, poll briefly for it.
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

document.addEventListener('DOMContentLoaded', () => {
  const pageType = document.body.dataset.profilePage; // 'instructor' | 'student'
  const cfg = CONFIG[pageType];
  if (!cfg) return;

  const loadingEl   = document.getElementById('profileLoading');
  const errorEl     = document.getElementById('profileError');
  const errorTextEl = document.getElementById('profileErrorText');
  const retryBtn    = document.getElementById('profileRetryBtn');
  const viewSection = document.getElementById('profileView');
  const formSection = document.getElementById('profileFormSection');

  // stage: 'loading' | 'error' | 'ready'
  function setStage(stage, message) {
    if (loadingEl) loadingEl.hidden = stage !== 'loading';
    if (errorEl)   errorEl.hidden   = stage !== 'error';
    if (stage === 'error' && errorTextEl && message) errorTextEl.textContent = message;
    if (stage === 'loading' || stage === 'error') {
      if (viewSection) viewSection.hidden = true;
      if (formSection) formSection.hidden = true;
    }
  }

  async function boot() {
    setStage('loading');

    const auth = await waitForTalentFlowAuth();
    if (!auth) {
      setStage('error', "Couldn't reach Talent Flow's sign-in service. Check your connection and try again.");
      return;
    }

    let user;
    try {
      user = await auth.requireAuth(); // may redirect to login.html
    } catch (err) {
      console.error('Could not verify sign-in:', err);
      setStage('error', 'Could not verify your sign-in. Please try again.');
      return;
    }
    if (!user) return; // requireAuth is navigating away

    let profile = {};
    try {
      profile = (await auth.loadProfile(user.uid)) || {};
    } catch (err) {
      console.error('Profile read failed — showing the blank form instead:', err);
    }

    const form          = document.getElementById('profileForm');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarInput   = document.getElementById('avatarInput');
    const logoutBtn     = document.getElementById('logoutBtn');
    const editBtn       = document.getElementById('editProfileBtn');
    const topbarAvatar  = document.getElementById('nav-avatar-img');
    const submitBtn     = form ? form.querySelector('button[type="submit"]') : null;

    const fallbackAvatarUrl = user.photoURL || auth.initialsAvatar(profile.fullName || user.displayName || user.email);
    let pendingAvatarFile = null;

    function fillForm(p) {
      cfg.fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el && p[id] !== undefined) el.value = p[id];
      });
      const nameEl = document.getElementById('fullName');
      if (nameEl && !nameEl.value) nameEl.value = user.displayName || '';
      const emailEl = document.getElementById('email');
      if (emailEl && !emailEl.value) emailEl.value = user.email || '';
      if (avatarPreview) avatarPreview.src = p.avatar || fallbackAvatarUrl;
    }

    function showForm() {
      setStage('ready');
      pendingAvatarFile = null;
      fillForm(profile);
      if (viewSection) viewSection.hidden = true;
      if (formSection) formSection.hidden = false;
    }

    function showView(p) {
      setStage('ready');
      const v = cfg.toView(p);
      document.getElementById('viewAvatar').src = p.avatar || fallbackAvatarUrl;
      document.getElementById('viewName').textContent = v.name || user.displayName || 'Talent Flow User';
      document.getElementById('viewTitle').textContent = v.title;
      document.getElementById('viewBio').textContent = v.bio;
      document.getElementById('viewExperience').textContent = v.metaValue;
      document.getElementById('viewEmail').textContent = p.email || user.email || '';
      renderTags(document.getElementById('viewExpertise'), v.tags, cfg.tagClass);
      document.getElementById('viewEducation').textContent = v.educationText;
      renderLinks(document.getElementById('viewLinks'), v.links, cfg.linkClass);

      if (formSection) formSection.hidden = true;
      if (viewSection) viewSection.hidden = false;
    }

    if (topbarAvatar && profile.avatar) topbarAvatar.src = profile.avatar;
    if (cfg.storageKey && profile.profileCompleted) {
      writeProfileBridge(cfg.storageKey, {
        fullName: profile.fullName || '',
        email: profile.email || user.email || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
        role: cfg.roleLabel || '',
        profileCompleted: true,
      });
    }

    if (profile.profileCompleted) showView(profile);
    else showForm();

    editBtn?.addEventListener('click', showForm);

    avatarInput?.addEventListener('change', () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      pendingAvatarFile = file;
      const reader = new FileReader();
      reader.onload = () => { if (avatarPreview) avatarPreview.src = reader.result; };
      reader.readAsDataURL(file);
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const isFirstCompletion = !profile.profileCompleted;
      const data = { profileCompleted: true };
      cfg.fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value.trim();
      });

      const originalLabel = submitBtn ? submitBtn.textContent : '';

      if (pendingAvatarFile) {
        const fileToUpload = pendingAvatarFile;
        pendingAvatarFile = null;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading photo…'; }
        try {
          data.avatar = await auth.uploadAvatar(user.uid, fileToUpload);
        } catch (err) {
          console.error('Avatar upload failed — keeping the previous photo:', err);
          if (profile.avatar) data.avatar = profile.avatar;
        }
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      } else if (profile.avatar) {
        data.avatar = profile.avatar;
      }

      Object.assign(profile, data);

      try {
        await auth.saveProfile(user.uid, data);
      } catch (err) {
        console.error('Profile save failed:', err);
        if (submitBtn) submitBtn.textContent = originalLabel;
        alert(auth.friendlyError ? auth.friendlyError(err) : "Couldn't save your profile — please try again.");
        return;
      }

      if (cfg.storageKey) {
        writeProfileBridge(cfg.storageKey, {
          ...data,
          email: profile.email || user.email || '',
          role: cfg.roleLabel || '',
        });
      }

      if (topbarAvatar && profile.avatar) topbarAvatar.src = profile.avatar;

      if (isFirstCompletion) {
        window.location.href = cfg.coursesUrl;
      } else {
        showView(profile);
      }
    });

    logoutBtn?.addEventListener('click', () => auth.logOut());
  }

  retryBtn?.addEventListener('click', boot);
  boot();
});
