/* ============================================================
   TALENT FLOW  |  choose-role.js
   ------------------------------------------------------------
   Shown right after sign-up or sign-in for anyone who hasn't
   picked Instructor/Student yet. Picking a card immediately
   saves it and sends them to the matching profile-setup page —
   no separate confirm button to click.
   ============================================================ */

// auth.js is an ES module fetching an external dependency, so there's
// no hard guarantee window.TalentFlowAuth exists the instant this
// script's DOMContentLoaded callback fires. Poll briefly instead of
// checking once and silently doing nothing.
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

document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('roleStatus');
  const auth = await waitForTalentFlowAuth();
  if (!auth) {
    if (status) { status.hidden = false; status.textContent = "Couldn't reach Talent Flow's sign-in service. Please refresh the page."; }
    return;
  }

  const user = await auth.requireAuth(); // redirects to login.html if signed out

  // Unverified email/password accounts shouldn't reach the role picker
  // at all — send them to verify first.
  if (!user.emailVerified) { window.location.href = 'verify-email.html'; return; }

  const radios     = document.querySelectorAll('input[name="role"]');
  const logoutLink  = document.getElementById('logoutLink');

  radios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      // Lock the choice in visually and prevent a second click while saving.
      radios.forEach((r) => { r.disabled = true; });
      if (status) { status.hidden = false; status.textContent = 'Setting you up…'; }

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
