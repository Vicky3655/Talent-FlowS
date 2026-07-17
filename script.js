document.addEventListener('DOMContentLoaded', () => {
    const auth = window.TalentFlowAuth;
    
    // --- DOM Elements ---
    const passInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password');
    const strengthWarning = document.getElementById('passwordStrengthWarning');
    const createBtn = document.getElementById('createAccountBtn');
    const loginBtn = document.getElementById('loginBtn');

    // --- 1. Password Visibility Toggle ---
    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = passInput.type === 'text';
            passInput.type = isVisible ? 'password' : 'text';
            toggleBtn.classList.toggle('is-visible', !isVisible);
        });
    }

    // --- 2. Password Strength Indicator ---
    if (passInput && strengthWarning) {
        passInput.addEventListener('input', () => {
            const val = passInput.value;
            if (val.length > 0 && val.length < 8) {
                strengthWarning.textContent = "Weak: Use at least 8 characters.";
                strengthWarning.hidden = false;
                strengthWarning.style.color = "#DC2626";
            } else if (val.length >= 8) {
                strengthWarning.textContent = "Strong password!";
                strengthWarning.hidden = false;
                strengthWarning.style.color = "#16A34A";
                setTimeout(() => { strengthWarning.hidden = true; }, 2000);
            } else {
                strengthWarning.hidden = true;
            }
        });
    }

    // --- 3. Registration Logic ---
    createBtn?.addEventListener('click', async () => {
        const name = document.getElementById('Name').value;
        const email = document.getElementById('Email').value;
        const pass = passInput.value;

        if (!name || !email || pass.length < 8) {
            strengthWarning.textContent = "Complete all fields correctly.";
            strengthWarning.hidden = false;
            return;
        }

        try {
            createBtn.disabled = true;
            createBtn.textContent = "Creating...";
            await auth.register(name, email, pass);
            window.location.href = 'verify-email.html';
        } catch (e) {
            strengthWarning.textContent = auth.friendlyError(e);
            strengthWarning.hidden = false;
            createBtn.disabled = false;
            createBtn.textContent = "Create Account";
        }
    });

    // --- 4. Login Logic ---
    loginBtn?.addEventListener('click', async () => {
        const email = document.getElementById('Email').value;
        const pass = passInput.value;
        try {
            loginBtn.disabled = true;
            const { user, role } = await auth.login(email, pass);
            auth.redirectToRoleProfile(role, user);
        } catch (e) {
            alert(auth.friendlyError(e));
            loginBtn.disabled = false;
        }
    });

    // --- 5. Google Login ---
    document.getElementById('googleSignInBtn')?.addEventListener('click', () => auth.signInWithGoogle());
});
