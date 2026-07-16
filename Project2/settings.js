/* ═══════════════════════════════════════════
   TALENT FLOW — Settings (Standardized)
   settings.js
   Handles page tab switching, loads account profiles, password strength indicator, 
   image preview, and persists updates to Firestore database.
═══════════════════════════════════════════ */

let currentUser    = null;
let currentProfile = {};

// Maps roles to form fields
const ROLE_FIELDS = {
    Instructor: [
        { id: 'fieldTitle',      key: 'title' },
        { id: 'fieldExpertise',  key: 'expertise' },
        { id: 'fieldExperience', key: 'experience' },
        { id: 'fieldEducation',  key: 'education' },
        { id: 'fieldWebsite',    key: 'website' },
    ],
    Student: [
        { id: 'fieldEducationLevel', key: 'educationLevel' },
        { id: 'fieldFieldOfStudy',   key: 'fieldOfStudy' },
        { id: 'fieldInterests',      key: 'interests' },
        { id: 'fieldGoals',          key: 'goals' },
        { id: 'fieldGithub',         key: 'github' },
    ],
};

function showRoleFields(role) {
    document.querySelectorAll('.role-field').forEach((el) => { el.hidden = true; });
    if (role === 'Instructor') {
        document.querySelectorAll('.role-field-instructor').forEach((el) => { el.hidden = false; });
    } else if (role === 'Student') {
        document.querySelectorAll('.role-field-student').forEach((el) => { el.hidden = false; });
    }
}

// Populate UI from Firestore
async function loadProfileIntoSettings() {
    const auth = window.TalentFlowAuth;
    if (!auth) return;

    currentUser = await auth.requireAuth(); 
    try {
        currentProfile = (await auth.loadProfile(currentUser.uid)) || {};
    } catch (err) {
        console.error('Firestore profile read failed (using basic auth info):', err);
        currentProfile = {};
    }

    const p = currentProfile;
    const displayName = p.fullName || currentUser.displayName
        || (currentUser.email ? currentUser.email.split('@')[0] : 'Talent Flow User');
    const avatarUrl = currentUser.photoURL || auth.initialsAvatar(displayName);

    // Profile inputs
    const nameEl  = document.getElementById('fieldName');
    const emailEl = document.getElementById('fieldEmail');
    const bioEl   = document.getElementById('fieldBio');
    const roleEl  = document.getElementById('fieldRole');
    const linkedinEl = document.getElementById('fieldLinkedin');

    if (nameEl)     nameEl.value     = displayName;
    if (emailEl)    emailEl.value    = p.email || currentUser.email || '';
    if (bioEl)      bioEl.value      = p.bio || '';
    if (roleEl)     roleEl.value     = p.role || '—';
    if (linkedinEl) linkedinEl.value = p.linkedin || '';

    // Show dynamic role-specific inputs
    showRoleFields(p.role);
    (ROLE_FIELDS[p.role] || []).forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el && p[key] !== undefined) el.value = p[key];
    });

    // Populate display labels
    const displayNameEl = document.getElementById('profileDisplayName');
    if (displayNameEl) displayNameEl.textContent = displayName;

    const profileImgEl = document.getElementById('profileImg');
    if (profileImgEl) profileImgEl.src = avatarUrl;
}

// Tab navigation handler
document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

// Avatar selection and upload preview
const editAvatarBtn = document.getElementById('editAvatarBtn');
const avatarInput   = document.getElementById('avatarInput');
const profileImg    = document.getElementById('profileImg');

if (editAvatarBtn && avatarInput) {
    editAvatarBtn.addEventListener('click', () => avatarInput.click());
    
    avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const dataURL = e.target.result;
            if (profileImg) profileImg.src = dataURL;
        };
        reader.readAsDataURL(file);
    });
}

// Persist adjustments to database
document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
    const name  = document.getElementById('fieldName').value.trim();
    const email = document.getElementById('fieldEmail').value.trim();
    const bio   = document.getElementById('fieldBio').value.trim();

    if (!name || !email) {
        shakeSave();
        return;
    }

    document.getElementById('profileDisplayName').textContent = name;

    const data = { fullName: name, email, bio };

    const linkedinEl = document.getElementById('fieldLinkedin');
    if (linkedinEl) data.linkedin = linkedinEl.value.trim();

    (ROLE_FIELDS[currentProfile.role] || []).forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) data[key] = el.value.trim();
    });

    const auth = window.TalentFlowAuth;
    if (auth && currentUser) {
        auth.saveProfile(currentUser.uid, data).catch((err) => {
            console.error('Firestore save operation failed:', err);
        });
        Object.assign(currentProfile, data);
    }

    showToast('saveToast', '✓ Changes saved!', '#22C55E');
});

// Logout action
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    window.TalentFlowAuth?.logOut();
});

// Password validation meter
document.getElementById('newPwd')?.addEventListener('input', function () {
    const val  = this.value;
    const fill = document.getElementById('strengthFill');
    const lbl  = document.getElementById('strengthLabel');

    let score = 0;
    if (val.length >= 8)           score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^A-Za-z0-9]/.test(val))  score++;

    const map = [
        { w: '0%',   c: 'transparent', t: '' },
        { w: '25%',  c: '#EF4444',     t: 'Weak' },
        { w: '50%',  c: '#F59E0B',     t: 'Fair' },
        { w: '75%',  c: '#3B82F6',     t: 'Good' },
        { w: '100%', c: '#22C55E',     t: 'Strong' },
    ];

    if (fill && lbl) {
        fill.style.width      = map[score].w;
        fill.style.background = map[score].c;
        lbl.textContent       = map[score].t;
        lbl.style.color       = map[score].c;
    }
});

// Save password handler
window.handlePasswordChange = function () {
    const curr    = document.getElementById('currentPwd').value.trim();
    const newP    = document.getElementById('newPwd').value.trim();
    const confirm = document.getElementById('confirmPwd').value.trim();

    if (!curr || !newP || !confirm) {
        showToast('pwdToast', '✗ Please fill all fields.', '#EF4444');
        return;
    }
    if (newP !== confirm) {
        showToast('pwdToast', '✗ Passwords do not match.', '#EF4444');
        return;
    }
    if (newP.length < 8) {
        showToast('pwdToast', '✗ Password must be at least 8 characters.', '#EF4444');
        return;
    }

    document.getElementById('currentPwd').value          = '';
    document.getElementById('newPwd').value              = '';
    document.getElementById('confirmPwd').value          = '';
    document.getElementById('strengthFill').style.width  = '0%';
    document.getElementById('strengthLabel').textContent = '';

    showToast('pwdToast', '✓ Password updated successfully!', '#22C55E');
};

// Mask/unmask input text
window.togglePwd = function (inputId, btn) {
    const input  = document.getElementById(inputId);
    const isText = input.type === 'text';
    input.type      = isText ? 'password' : 'text';
    btn.style.color = isText ? '#94A3B8' : '#2563EB';
};

// Utilities
function showToast(id, msg, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color  = color;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

function shakeSave() {
    const btn = document.getElementById('saveProfileBtn');
    if (!btn) return;
    btn.style.animation = 'none';
    btn.offsetHeight; 
    btn.style.animation = 'shake 0.35s ease';
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-7px); }
    40%      { transform: translateX(7px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);

// Initialize profile execution
loadProfileIntoSettings();
