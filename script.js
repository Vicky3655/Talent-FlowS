/* TALENT FLOW | script.js */
document.addEventListener('DOMContentLoaded', () => {
    const auth = window.TalentFlowAuth;
    const errorEl = document.getElementById('passwordStrengthWarning');
    const showErr = (msg) => { if(errorEl) { errorEl.textContent = msg; errorEl.hidden = false; } else alert(msg); };

    // Login logic
    document.getElementById('loginBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('loginBtn');
        try {
            btn.disabled = true;
            btn.textContent = "Checking...";
            const { user, role } = await auth.login(document.getElementById('Email').value, document.getElementById('password').value);
            auth.redirectToRoleProfile(role, user);
        } catch (e) { showErr(auth.friendlyError(e)); btn.disabled = false; btn.textContent = "Login"; }
    });

    // Register logic
    document.getElementById('createAccountBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('createAccountBtn');
        try {
            btn.disabled = true;
            btn.textContent = "Creating...";
            await auth.register(document.getElementById('Name').value, document.getElementById('Email').value, document.getElementById('password').value);
            window.location.href = 'verify-email.html';
        } catch (e) { showErr(auth.friendlyError(e)); btn.disabled = false; btn.textContent = "Create Account"; }
    });

    // Google logic
    document.getElementById('googleSignInBtn')?.addEventListener('click', () => auth.signInWithGoogle());
});
