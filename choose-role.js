/* TALENT FLOW | choose-role.js */
document.addEventListener('DOMContentLoaded', async () => {
    const auth = window.TalentFlowAuth;
    const user = await auth.requireAuth(); // Redirects to login if not signed in

    const radios = document.querySelectorAll('input[name="role"]');
    const status = document.getElementById('roleStatus');

    radios.forEach(radio => {
        radio.addEventListener('change', async () => {
            if (status) { status.hidden = false; status.textContent = "Setting up your profile..."; }
            radios.forEach(r => r.disabled = true);
            
            try {
                await auth.setRole(radio.value);
            } catch (e) {
                alert(auth.friendlyError(e));
                radios.forEach(r => r.disabled = false);
            }
        });
    });
});
