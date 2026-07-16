/* ============================================================
   TALENT FLOW  |  profile.js
   ------------------------------------------------------------
   Shared by instructor-profile.html and student-profile.html.
   Which fields it reads/writes is driven entirely by the
   data-profile-page="instructor|student" attribute on <body>,
   so one file can serve both pages' different field sets.

   Avatars are uploaded to Firebase Storage on save, and only the
   resulting download URL is written to Firestore — that URL
   works for anyone who loads it, on any device, which is what
   lets it show up somewhere like a course card in a student's
   browser (see data-store.js's getPublishedCourses()).

   Both pages also mirror their data into a small localStorage
   bridge (tf_instructor_profile / tf_student_profile) — on every
   save AND on every page load — so other same-device pages
   (settings, the topbar, the mobile sidebar) update instantly
   without waiting on a Firestore round trip. Firestore stays the
   cross-device source of truth; the bridge is just a fast local
   cache of it.
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
// Small, dependency-free localStorage read/write pair. Writes are
// merged (not overwritten), so a field this page doesn't touch —
// e.g. "username", which only settings.js edits — never gets
// wiped out by a save made here.
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
    // "storage" events only fire in OTHER tabs — this lets anything
    // listening on THIS same page/tab react right away too.
    window.dispatchEvent(new CustomEvent('tf-profile-updated', { detail: { key } }));
  } catch (err) {
    console.error('Could not update the shared profile bridge:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const pageType = document.body.dataset.profilePage; // 'instructor' | 'student'
  const cfg = CONFIG[pageType];
  const auth = window.TalentFlowAuth;
  if (!cfg || !auth) return;

  const user = await auth.requireAuth(); // redirects to login.html if signed out
  let profile = {};
  try {
    profile = (await auth.loadProfile(user.uid)) || {};
  } catch (err) {
    console.error('Firestore profile read failed — showing the blank form instead:', err);
  }

  const viewSection   = document.getElementById('profileView');
  const formSection   = document.getElementById('profileFormSection');
  const form          = document.getElementById('profileForm');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarInput   = document.getElementById('avatarInput');
  const logoutBtn     = document.getElementById('logoutBtn');
  const editBtn       = document.getElementById('editProfileBtn');
  const topbarAvatar  = document.getElementById('nav-avatar-img');
  const submitBtn     = form ? form.querySelector('button[type="submit"]') : null;

  // Photo upload/storage IS wired up now (Firebase Storage) — this
  // fallback only kicks in for someone who hasn't picked a photo at all:
  // their Google account photo, or a generated initial.
  const fallbackAvatarUrl = user.photoURL || auth.initialsAvatar(profile.fullName || user.displayName || user.email);

  // The actual File the person picked in this session, if any. It's
  // uploaded to Storage on SAVE, not on selection — so a half-finished
  // pick can never race the rest of the save with a stale preview.
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
    pendingAvatarFile = null;
    fillForm(profile);
    if (viewSection) viewSection.hidden = true;
    if (formSection) formSection.hidden = false;
  }

  function showView(p) {
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

  // Reflect whatever we already know onto this page's own topbar right
  // away, and refresh the local bridge from Firestore so every other
  // same-device page (settings, courses, the mobile sidebar) picks up
  // any change — even one made on a completely different device.
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

  // Local preview only — the real upload happens on save.
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

    // Firestore keeps the full profile now, avatar URL included — it's a
    // short string, not the image itself, so there's no size concern.
    // Saved in the background so a slow connection never strands someone
    // on their own filled-out form.
    auth.saveProfile(user.uid, data).catch((err) => {
      console.error('Firestore profile save failed (continuing anyway):', err);
    });

    if (cfg.storageKey) {
      writeProfileBridge(cfg.storageKey, {
        ...data,
        email: profile.email || user.email || '',
        role: cfg.roleLabel || '',
      });
    }

    if (topbarAvatar && profile.avatar) topbarAvatar.src = profile.avatar;

    if (isFirstCompletion) {
      // Just finished onboarding — move straight on instead of making
      // them look at their own profile and click again.
      window.location.href = cfg.coursesUrl;
    } else {
      // Editing an already-complete profile — show what changed and
      // let them continue on their own terms.
      showView(profile);
    }
  });

  logoutBtn?.addEventListener('click', () => auth.logOut());
});
