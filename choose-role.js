/* ============================================================
   TALENT FLOW  |  choose-role.js
   ------------------------------------------------------------
   Shown right after sign-up or sign-in for anyone who hasn't
   picked Instructor/Student yet. Picking a card immediately
   saves it and sends them to the matching profile-setup page —
   no separate confirm button to click.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.TalentFlowAuth;
  if (!auth) return;

  const user = await auth.requireAuth(); // redirects to login.html if signed out

  // Unverified email/password accounts shouldn't reach the role picker
  // at all — send them to verify first.
  if (!user.emailVerified) { window.location.href = 'verify-email.html'; return; }

  const radios     = document.querySelectorAll('input[name="role"]');
  const status      = document.getElementById('roleStatus');
  const logoutLink  = document.getElementById('logoutLink');

  radios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      // Lock the choice in visually and prevent a second click while saving.
      radios.forEach((r) => { r.disabled = true; });
      if (status) status.hidden = false;

      try {
        await auth.setRole(radio.value); // saves the role and redirects itself
      } catch (err) {
        radios.forEach((r) => { r.disabled = false; });
        if (status) status.hidden = true;
        alert(auth.friendlyError ? auth.friendlyError(err) : 'Something went wrong — please try again.');
      }
    });
  });

  logoutLink?.addEventListener('click', () => auth.logOut());
});
