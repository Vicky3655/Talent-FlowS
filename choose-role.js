/* ============================================================
   TALENT FLOW  |  choose-role.js
   ------------------------------------------------------------
   Handles the logic for selecting Instructor vs Student.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.TalentFlowAuth;
  if (!auth) return;

  // 1. Protect the page: Redirect to login if not signed in
  const user = await auth.requireAuth(); 

  // 2. Double check verification (mostly for email/pass users)
  if (!user.emailVerified) { 
      // If they are a Google user, they are likely verified, but auth.js handles this check
      const isGoogle = (user.photoURL && user.photoURL.includes('googleusercontent'));
      if (!isGoogle) {
        window.location.href = 'verify-email.html'; 
        return; 
      }
  }

  const radios     = document.querySelectorAll('input[name="role"]');
  const status      = document.getElementById('roleStatus');
  const logoutLink  = document.getElementById('logoutLink');

  // 3. Handle card selection
  radios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      // Disable interaction while saving
      radios.forEach((r) => { r.disabled = true; });
      if (status) {
          status.hidden = false;
          status.textContent = "Saving your preference...";
      }

      try {
        // This saves the role to Postgres and triggers the redirect to the profile page
        await auth.setRole(radio.value); 
      } catch (err) {
        // Re-enable on error
        radios.forEach((r) => { r.disabled = false; });
        if (status) status.hidden = true;
        alert(auth.friendlyError(err));
      }
    });
  });

  // 4. Logout link
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logOut();
    });
  }
});
