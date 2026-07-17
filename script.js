document.addEventListener('DOMContentLoaded', () => {
    const auth = window.TalentFlowAuth;
    const errorDisplay = document.getElementById('passwordStrengthWarning');

    document.getElementById('createAccountBtn')?.addEventListener('click', async () => {
        const name = document.getElementById('Name').value;
        const email = document.getElementById('Email').value;
        const pass = document.getElementById('password').value;
        const btn = document.getElementById('createAccountBtn');

        if (!name || !email || pass.length < 8) {
            errorDisplay.textContent = "Please fill all fields (Password min 8 chars)";
            errorDisplay.hidden = false;
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = "Creating...";
            await auth.register(name, email, pass);
            // Success! Send to verify page
            window.location.href = 'verify-email.html';
        } catch (e) {
            errorDisplay.textContent = auth.friendlyError(e);
            errorDisplay.hidden = false;
            btn.disabled = false;
            btn.textContent = "Create Account";
        }
    });

    document.getElementById('googleSignInBtn')?.addEventListener('click', () => auth.signInWithGoogle());
});
