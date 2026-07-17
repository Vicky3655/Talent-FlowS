/* ============================================================
   TALENT FLOW  |  script.js
   ------------------------------------------------------------
   Handles UI interactions and Auth Form submissions for 
   login.html and register.html.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const auth = window.TalentFlowAuth;
    if (!auth) return;

    // --- DOM Elements ---
    const loginBtn = document.getElementById('loginBtn');
    const createAccountBtn = document.getElementById('createAccountBtn');
    const googleBtn = document.getElementById('googleSignInBtn');
    
    // Inputs
    const emailInput = document.getElementById('Email');
    const passwordInput = document.getElementById('password');
    const nameInput = document.getElementById('Name'); // Only on Register

    // Error display
    const strengthWarning = document.getElementById('passwordStrengthWarning');

    /**
     * Helper to show errors
     */
    function showAuthError(message) {
        // Use existing warning element if available, or alert
        if (strengthWarning) {
            strengthWarning.textContent = message;
            strengthWarning.hidden = false;
            strengthWarning.style.color = '#DC2626';
        } else {
            alert(message);
        }
    }

    // --- 1. SIGN IN LOGIC ---
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                return showAuthError("Please enter both email and password.");
            }

            loginBtn.disabled = true;
            loginBtn.textContent = "Logging in...";

            try {
                const { user, role } = await auth.login(email, password);
                // Redirect based on role (to dashboard or choose-role)
                auth.redirectToRoleProfile(role, user);
            } catch (err) {
                showAuthError(auth.friendlyError(err));
                loginBtn.disabled = false;
                loginBtn.textContent = "Login";
            }
        });
    }

    // --- 2. SIGN UP LOGIC ---
    if (createAccountBtn) {
        createAccountBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!name || !email || !password) {
                return showAuthError("All fields are required.");
            }

            if (password.length < 8) {
                return showAuthError("Password must be at least 8 characters.");
            }

            createAccountBtn.disabled = true;
            createAccountBtn.textContent = "Creating Account...";

            try {
                await auth.register(name, email, password);
                // After signup, user is sent to verify-email.html automatically
                window.location.href = 'verify-email.html';
            } catch (err) {
                showAuthError(auth.friendlyError(err));
                createAccountBtn.disabled = false;
                createAccountBtn.textContent = "Create Account";
            }
        });
    }

    // --- 3. GOOGLE SIGN IN ---
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            try {
                await auth.signInWithGoogle();
            } catch (err) {
                showAuthError(auth.friendlyError(err));
            }
        });
    }

    // --- 4. PASSWORD TOGGLE ---
    const toggleBtns = document.querySelectorAll('.toggle-password');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.classList.add('is-visible');
            } else {
                input.type = 'password';
                btn.classList.remove('is-visible');
            }
        });
    });
});
