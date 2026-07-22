/* ============================================================
   TALENT FLOW  |  auth-callback.js
   ------------------------------------------------------------
   Landing point after someone clicks the confirmation link in
   their sign-up email (see the emailRedirectTo passed in
   auth.js's register()/sendVerificationEmail()). Supabase already
   verifies the token before it ever gets here, and either lands
   on this page with session tokens in the URL hash, or with
   #error=... if the link was invalid or had expired.

   auth.js's own onAuthStateChange listener — loaded via the
   module script tag on this page — is what actually detects a
   valid token, establishes the session, saves/loads the profile,
   and moves the person on to the right next page. This file only
   covers what that listener doesn't: showing a clear message for
   a bad link, and making sure nobody is ever left stranded on a
   spinner indefinitely if something unexpected happens.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    const statusEl  = document.getElementById('callbackStatus');
    const errorEl   = document.getElementById('callbackError');
    const actionsEl = document.getElementById('callbackActions');
    const hash      = window.location.hash;

    function showError(message) {
        if (statusEl) statusEl.hidden = true;
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.hidden = false;
        }
        if (actionsEl) actionsEl.hidden = false;
    }

    // An invalid or expired confirmation link comes back as
    // #error=...&error_description=... instead of an access token.
    if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.slice(1));
        const desc = params.get('error_description');
        showError(desc
            ? decodeURIComponent(desc.replace(/\+/g, ' '))
            : 'That link is invalid or has expired — please request a new one.');
        return;
    }

    // No token and no error means someone opened this page directly
    // rather than arriving from an email link — nothing to do here.
    if (!hash.includes('access_token') && !window.location.search.includes('code=')) {
        window.location.href = 'login.html';
        return;
    }

    // Otherwise auth.js's listener should pick up the token and move
    // things along within a moment. If it somehow doesn't (network
    // hiccup, a redirect URL that isn't allow-listed in the Supabase
    // dashboard, etc.), don't leave the person on an endless spinner.
    setTimeout(() => {
        showError('This is taking longer than expected. Please try logging in.');
    }, 8000);
});
