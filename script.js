document.addEventListener("DOMContentLoaded", () => {
    const auth = window.TalentFlowAuth;

    const googleBtn = document.getElementById("googleSignInBtn");
    if (googleBtn) {
        googleBtn.addEventListener("click", () => {
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }
            auth.signInWithGoogle().catch((err) => {
                if (err && (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request")) return;
                alert(auth.friendlyError ? auth.friendlyError(err) : "Something went wrong — please try again.");
            });
        });
    }

    setupPasswordToggles();
    setupPasswordStrength();

    // 1. Splash Screen Transition (page.html)
    if (document.getElementById("loader")) {
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    }

    // 2. Handling the "Create Account" button (register.html)
    const createAccountBtn = document.getElementById("createAccountBtn");
    if (createAccountBtn) {
        createAccountBtn.addEventListener("click", async (e) => {
            e.preventDefault(); // Prevents form refresh

            const name = document.getElementById("Name").value.trim();
            const email = document.getElementById("Email").value.trim();
            const password = document.getElementById("password").value;

            if (!name || !email || !password) {
                alert("Please fill in all fields.");
                return;
            }
            if (!isPasswordStrong(password)) {
                alert("Password needs at least 8 characters, including a letter, a number, and a symbol.");
                document.getElementById("password").focus();
                return;
            }
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }

            createAccountBtn.disabled = true;
            try {
                const { user, role } = await auth.register(name, email, password);
                auth.redirectToRoleProfile(role, user);
            } catch (err) {
                createAccountBtn.disabled = false;
                alert(auth.friendlyError ? auth.friendlyError(err) : "Something went wrong — please try again.");
            }
        });
    }

    // 3. Handling the "Login" button (login.html)
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const email = document.getElementById("Email").value.trim();
            const password = document.getElementById("password").value;

            if (!email || !password) {
                alert("Please enter your email and password");
                return;
            }
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }

            loginBtn.disabled = true;
            try {
                const { user, role } = await auth.login(email, password);
                auth.redirectToRoleProfile(role, user);
            } catch (err) {
                loginBtn.disabled = false;

                // Existing account, just never confirmed — send them to
                // finish that instead of leaving them stuck on an alert
                // with no way forward.
                const raw = ((err && (err.message || err.error_description)) || "").toLowerCase();
                if (raw.includes("email not confirmed")) {
                    auth.rememberPendingEmail(email);
                    window.location.href = "verify-email.html";
                    return;
                }

                alert(auth.friendlyError ? auth.friendlyError(err) : "Incorrect email or password.");
            }
        });
    }

    // 3b. Handling "Send Reset Link" (password.html)
    const sendResetBtn = document.getElementById("sendResetBtn");
    if (sendResetBtn) {
        const resultBox = document.getElementById("resetResult");
        const errorBox = document.getElementById("resetError");

        sendResetBtn.addEventListener("click", async () => {
            const email = document.getElementById("Email").value.trim();
            if (!email) {
                alert("Please enter your email first.");
                return;
            }
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }

            sendResetBtn.disabled = true;
            try {
                await auth.sendResetLink(email);
                errorBox?.setAttribute("hidden", "");
                const emailSpan = document.getElementById("resetSentEmail");
                if (emailSpan) emailSpan.textContent = email;
                resultBox?.removeAttribute("hidden");
            } catch (err) {
                resultBox?.setAttribute("hidden", "");
                if (errorBox) {
                    errorBox.textContent = auth.friendlyError ? auth.friendlyError(err) : "Something went wrong — please try again.";
                    errorBox.removeAttribute("hidden");
                }
            } finally {
                sendResetBtn.disabled = false;
            }
        });
    }

    // 3c. Password recovery (password.html) — Supabase redirects here
    // with a recovery token in the URL after someone clicks the link
    // in their reset email. auth.js detects it and fires
    // "tf-password-recovery"; this swaps the "send a link" form for
    // a "set a new password" one.
    const resetNewPass = document.getElementById("resetNewPass");
    if (resetNewPass) {
        const showNewPasswordForm = () => {
            document.querySelector(".welcome-text h1")?.setAttribute("hidden", "");
            document.querySelector(".welcome-text .subtitle")?.setAttribute("hidden", "");
            document.querySelector(".welcome-text form")?.setAttribute("hidden", "");
            sendResetBtn?.setAttribute("hidden", "");
            document.getElementById("resetResult")?.setAttribute("hidden", "");
            document.getElementById("resetError")?.setAttribute("hidden", "");
            resetNewPass.removeAttribute("hidden");
        };

        if (window.location.hash.includes("type=recovery")) showNewPasswordForm();
        window.addEventListener("tf-password-recovery", showNewPasswordForm);

        document.getElementById("confirmNewPasswordBtn")?.addEventListener("click", async () => {
            const input = document.getElementById("newPasswordInput");
            const warning = document.getElementById("newPasswordWarning");
            const password = input.value;

            if (!isPasswordStrong(password)) {
                warning.textContent = "Password needs at least 8 characters, including a letter, a number, and a symbol.";
                warning.hidden = false;
                return;
            }
            warning.hidden = true;

            const btn = document.getElementById("confirmNewPasswordBtn");
            btn.disabled = true;
            btn.textContent = "Saving…";
            try {
                await auth.confirmPasswordReset(password);
                alert("Password updated — please log in with your new password.");
                window.location.href = "login.html";
            } catch (err) {
                btn.disabled = false;
                btn.textContent = "Set New Password";
                alert(auth.friendlyError ? auth.friendlyError(err) : "Something went wrong — please try again.");
            }
        });
    }

    // 4. Path Selection Logic (courses.html)
    const pathButtons = document.querySelectorAll(".select-btn");
    pathButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Here you can link to specific course pages in the future
            alert("Path Selected: " + button.innerText);
            // window.location.href = "course-details.html"; 
        });
    });
});

// 6. Password strength warning (register.html) — must contain
//    letters, numbers, AND symbols together, checked live as they type.
function setupPasswordStrength() {
    const input   = document.getElementById('password');
    const warning = document.getElementById('passwordStrengthWarning');
    if (!input || !warning) return;

    function check() {
        const val = input.value;
        if (!val) { warning.hidden = true; return; }

        const hasLetter = /[A-Za-z]/.test(val);
        const hasNumber = /[0-9]/.test(val);
        const hasSymbol = /[^A-Za-z0-9]/.test(val);
        const longEnough = val.length >= 8;

        if (hasLetter && hasNumber && hasSymbol && longEnough) {
            warning.hidden = true;
            return;
        }

        const missing = [];
        if (!longEnough) missing.push('at least 8 characters');
        if (!hasLetter)  missing.push('a letter');
        if (!hasNumber)  missing.push('a number');
        if (!hasSymbol)  missing.push('a symbol (like ! ? # -)');

        warning.textContent = 'Password needs ' + missing.join(', ');
        warning.hidden = false;
    }

    input.addEventListener('input', check);
}

// Reusable everywhere a submit handler wants to double check strength
// before letting a password through, not just show the warning.
function isPasswordStrong(password) {
    return password.length >= 8
        && /[A-Za-z]/.test(password)
        && /[0-9]/.test(password)
        && /[^A-Za-z0-9]/.test(password);
}
// 5. Password show/hide toggle (login.html + register.html)
function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;

            const willShow = input.type === "password";
            input.type = willShow ? "text" : "password";
            btn.classList.toggle("is-visible", willShow);
            btn.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
        });
    });
}
