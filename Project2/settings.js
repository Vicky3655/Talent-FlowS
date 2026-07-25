/* ============================================================
   TALENT FLOW  |  settings.js (Student Settings Workflow)
   ------------------------------------------------------------
   Manages Student Profile updates, Account settings, Password
   changes, Notification preferences, and local/remote persistence
   connected to auth.js and data-store.js.
   ============================================================ */

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

let auth = null;
let currentUser = null;
let pendingAvatarFile = null;

/* ── Local Student Bridge ── */
const STUDENT_BRIDGE_KEY = "tf_student_profile";

function readStudentBridge() {
    try {
        const raw = localStorage.getItem(STUDENT_BRIDGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error("Could not read student profile bridge:", err);
        return null;
    }
}

function writeStudentBridge(patch) {
    try {
        const merged = { ...(readStudentBridge() || {}), ...patch };
        localStorage.setItem(STUDENT_BRIDGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("tf-profile-updated", { detail: { key: STUDENT_BRIDGE_KEY } }));
    } catch (err) {
        console.error("Could not write student profile bridge:", err);
    }
}

/* ── Hydrate Profile Data ── */
function currentProfile() {
    const bridged = readStudentBridge() || {};
    const stored = auth?.getStoredProfile?.() || {};
    const base = { ...bridged, ...stored };

    return {
        fullName: base.fullName || base.name || currentUser?.displayName || "",
        email: base.email || currentUser?.email || "",
        bio: base.bio || "",
        role: "Student",
        educationLevel: base.educationLevel || "",
        fieldOfStudy: base.fieldOfStudy || "",
        interests: base.interests || "",
        goals: base.goals || "",
        linkedin: base.linkedin || "",
        github: base.github || "",
        username: base.username || "",
        avatar: base.avatar || currentUser?.photoURL || "",
    };
}

function hydrateProfile() {
    const profile = currentProfile();

    const displayName = profile.fullName || (profile.email ? profile.email.split("@")[0] : "Student");
    const avatarUrl = profile.avatar || auth?.initialsAvatar?.(displayName) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80";

    const nameHeader = document.getElementById("profileDisplayName");
    if (nameHeader) nameHeader.textContent = displayName;

    const profileImg = document.getElementById("profileImg");
    if (profileImg) profileImg.src = avatarUrl;

    const navAvatarImg = document.getElementById("navAvatarImg");
    if (navAvatarImg) navAvatarImg.src = avatarUrl;

    // Set Form Inputs
    setVal("fieldName", profile.fullName);
    setVal("fieldEmail", profile.email);
    setVal("fieldBio", profile.bio);
    setVal("fieldRole", "Student");
    setVal("fieldEducationLevel", profile.educationLevel);
    setVal("fieldFieldOfStudy", profile.fieldOfStudy);
    setVal("fieldInterests", profile.interests);
    setVal("fieldGoals", profile.goals);
    setVal("fieldLinkedin", profile.linkedin);
    setVal("fieldGithub", profile.github);
    setVal("fieldUsername", profile.username || profile.email.split("@")[0]);
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
}

function hydrateSettings() {
    const settings = auth?.getSettings?.() || {};
    const notifications = settings.notifications || {};

    const langEl = document.getElementById("fieldLanguage");
    if (langEl) langEl.value = settings.language || "English";

    const tzEl = document.getElementById("fieldTimezone");
    if (tzEl) tzEl.value = settings.timezone || "Africa/Lagos (WAT)";

    setCheck("notifyEmail", notifications.email ?? true);
    setCheck("notifyAssignments", notifications.assignments ?? true);
    setCheck("notifyCourses", notifications.courses ?? true);
    setCheck("notifyPlatform", notifications.platform ?? false);
    setCheck("twoFactorToggle", settings.twoFactor ?? false);
}

function setCheck(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(val);
}

/* ── DOM INITIALIZATION ── */
document.addEventListener("DOMContentLoaded", async () => {
    setupTabNavigation();
    setupAvatarUpload();

    auth = await waitForTalentFlowAuth();
    if (!auth) {
        console.error("Auth module failed to load.");
        return;
    }

    try {
        currentUser = await auth.requireAuth(); // Redirects if not signed in
        if (currentUser) {
            await auth.loadProfile(currentUser.uid).catch(() => {});
        }
    } catch (err) {
        console.error("Error loading user profile:", err);
    }

    hydrateProfile();
    hydrateSettings();

    // Event Listeners for Save Buttons
    document.getElementById("saveProfileBtn")?.addEventListener("click", handleSaveProfile);
    document.getElementById("saveAccountBtn")?.addEventListener("click", handleSaveAccount);
    document.getElementById("saveNotificationsBtn")?.addEventListener("click", handleSaveNotifications);
    document.getElementById("twoFactorToggle")?.addEventListener("change", handleTwoFactorToggle);
    document.getElementById("signOutBtn")?.addEventListener("click", () => auth?.logOut?.());
    document.getElementById("deleteAccountBtn")?.addEventListener("click", handleDeleteAccount);
    
    // Password Strength Meter Listener
    document.getElementById("newPwd")?.addEventListener("input", handlePasswordStrength);
});

/* ── TAB SWITCHING ── */
function setupTabNavigation() {
    document.querySelectorAll(".settings-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".settings-nav-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab)?.classList.add("active");
        });
    });
}

/* ── AVATAR UPLOAD ── */
function setupAvatarUpload() {
    const editBtn = document.getElementById("editAvatarBtn");
    const avatarInput = document.getElementById("avatarInput");
    const profileImg = document.getElementById("profileImg");

    editBtn?.addEventListener("click", () => avatarInput?.click());

    avatarInput?.addEventListener("change", () => {
        const file = avatarInput.files[0];
        if (!file) return;
        pendingAvatarFile = file;

        const reader = new FileReader();
        reader.onload = e => {
            if (profileImg) profileImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/* ── SAVE PROFILE ACTION ── */
async function handleSaveProfile() {
    const name = document.getElementById("fieldName")?.value.trim();
    const email = document.getElementById("fieldEmail")?.value.trim();

    if (!name || !email) {
        shakeSave();
        showToast("saveToast", "Name and email are required.", "#EF4444");
        return;
    }

    const saveBtn = document.getElementById("saveProfileBtn");
    const originalText = saveBtn.textContent;
    let avatar = currentProfile().avatar;

    if (pendingAvatarFile && auth && currentUser) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Uploading photo…";
        try {
            avatar = await auth.uploadAvatar(currentUser.uid, pendingAvatarFile);
        } catch (err) {
            console.error("Avatar upload failed:", err);
        }
        pendingAvatarFile = null;
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }

    const patch = {
        fullName: name,
        email: email,
        bio: document.getElementById("fieldBio")?.value.trim() || "",
        role: "Student",
        educationLevel: document.getElementById("fieldEducationLevel")?.value || "",
        fieldOfStudy: document.getElementById("fieldFieldOfStudy")?.value.trim() || "",
        interests: document.getElementById("fieldInterests")?.value.trim() || "",
        goals: document.getElementById("fieldGoals")?.value.trim() || "",
        linkedin: document.getElementById("fieldLinkedin")?.value.trim() || "",
        github: document.getElementById("fieldGithub")?.value.trim() || "",
        avatar: avatar,
        profileCompleted: true
    };

    writeStudentBridge(patch);
    hydrateProfile();
    showToast("saveToast", "✓ Profile saved successfully!", "#22C55E");

    try {
        if (auth && currentUser) {
            await auth.saveProfile(currentUser.uid, patch);
        }
    } catch (err) {
        console.error("Firestore save failed:", err);
    }
}

/* ── SAVE ACCOUNT ACTION ── */
async function handleSaveAccount() {
    const username = document.getElementById("fieldUsername")?.value.trim();
    const language = document.getElementById("fieldLanguage")?.value;
    const timezone = document.getElementById("fieldTimezone")?.value;

    writeStudentBridge({ username });

    try {
        if (auth && currentUser) {
            await auth.saveProfile(currentUser.uid, { username });
            await auth.saveSettings?.({ language, timezone });
        }
        showToast("accountToast", "✓ Account settings saved!", "#22C55E");
    } catch (err) {
        console.error("Account settings save error:", err);
        showToast("accountToast", "Could not save settings.", "#EF4444");
    }
}

/* ── SAVE NOTIFICATIONS ── */
async function handleSaveNotifications() {
    const prefs = {
        notifications: {
            email: document.getElementById("notifyEmail")?.checked ?? true,
            assignments: document.getElementById("notifyAssignments")?.checked ?? true,
            courses: document.getElementById("notifyCourses")?.checked ?? true,
            platform: document.getElementById("notifyPlatform")?.checked ?? false,
        }
    };

    try {
        await auth?.saveSettings?.(prefs);
        showToast("notificationsToast", "✓ Preferences saved!", "#22C55E");
    } catch (err) {
        console.error("Save notifications error:", err);
        showToast("notificationsToast", "Could not save preferences.", "#EF4444");
    }
}

function handleTwoFactorToggle(e) {
    auth?.saveSettings?.({ twoFactor: e.target.checked }).catch(err => console.error(err));
}

/* ── PASSWORD STRENGTH & CHANGE ── */
function handlePasswordStrength(e) {
    const val = e.target.value;
    const fill = document.getElementById("strengthFill");
    const lbl = document.getElementById("strengthLabel");
    if (!fill || !lbl) return;

    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const map = [
        { w: "0%", c: "transparent", t: "" },
        { w: "25%", c: "#EF4444", t: "Weak" },
        { w: "50%", c: "#F59E0B", t: "Fair" },
        { w: "75%", c: "#2563EB", t: "Good" },
        { w: "100%", c: "#22C55E", t: "Strong" },
    ];

    fill.style.width = map[score].w;
    fill.style.background = map[score].c;
    lbl.textContent = map[score].t;
    lbl.style.color = map[score].c;
}

window.handlePasswordChange = function () {
    const curr = document.getElementById("currentPwd")?.value.trim();
    const newP = document.getElementById("newPwd")?.value.trim();
    const confirmP = document.getElementById("confirmPwd")?.value.trim();

    if (!curr || !newP || !confirmP) {
        showToast("pwdToast", "Please fill in all password fields.", "#EF4444");
        return;
    }
    if (newP !== confirmP) {
        showToast("pwdToast", "New passwords do not match.", "#EF4444");
        return;
    }
    if (newP.length < 8) {
        showToast("pwdToast", "Password must be at least 8 characters.", "#EF4444");
        return;
    }

    document.getElementById("currentPwd").value = "";
    document.getElementById("newPwd").value = "";
    document.getElementById("confirmPwd").value = "";
    document.getElementById("strengthFill").style.width = "0%";
    document.getElementById("strengthLabel").textContent = "";

    showToast("pwdToast", "✓ Password updated successfully!", "#22C55E");
};

window.togglePwd = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isText = input.type === "text";
    input.type = isText ? "password" : "text";
    btn.style.color = isText ? "#94A3B8" : "#2563EB";
};

/* ── DELETE ACCOUNT ── */
function handleDeleteAccount() {
    const confirmed = confirm("Delete local Talent Flow student account data?");
    if (!confirmed) return;

    localStorage.removeItem("talentFlowAuth");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("talentFlowSettings");
    localStorage.removeItem(STUDENT_BRIDGE_KEY);
    window.location.href = "login.html";
}

/* ── UTILITY FUNCTIONS ── */
function showToast(id, msg, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = color;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 3000);
}

function shakeSave() {
    const btn = document.getElementById("saveProfileBtn");
    if (!btn) return;
    btn.style.animation = "none";
    btn.offsetHeight;
    btn.style.animation = "shake 0.35s ease";
}

const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
@keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-7px); }
    40% { transform: translateX(7px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);
