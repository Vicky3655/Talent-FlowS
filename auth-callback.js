/* ============================================================
   TALENT FLOW  |  auth-callback.js
   ------------------------------------------------------------
   Landing page for links that hand back a Supabase session: the
   email-confirmation link (emailRedirectTo in auth.js's
   register()) and, as a fallback, Google OAuth. auth.js's own
   onAuthStateChange listener does the actual work — detecting
   the token in the URL, creating the profile row if this is a
   brand new account, and calling redirectToRoleProfile(). This
   page just needs to exist, load auth.js, and wait.

   A short timeout redirects to login.html if nothing happens, so
   nobody gets stuck staring at a spinner forever (e.g. an expired
   or already-used confirmation link).
   ============================================================ */
(function () {
    const text = document.getElementById('cbText');

    const fallback = setTimeout(() => {
        if (text) text.textContent = 'Taking longer than expected — redirecting…';
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    }, 8000);

    function clearFallback() { clearTimeout(fallback); }

    document.addEventListener('DOMContentLoaded', () => {
        const auth = window.TalentFlowAuth;
        if (!auth) return; // auth.js failed to load — let the timeout above handle it

        auth.whenAuthReady().then((user) => {
            // auth.js's onAuthStateChange listener already redirects onward
            // the moment it sees a token in the URL hash. If we land here
            // with a confirmed, signed-in user and are STILL on this page a
            // moment later, that listener hasn't fired for some reason —
            // nudge it along rather than leaving the person stranded.
            if (user && user.emailVerified) {
                clearFallback();
                setTimeout(async () => {
                    if (window.location.pathname.endsWith('auth-callback.html')) {
                        let role = '';
                        try {
                            const profile = await auth.loadProfile(user.uid);
                            role = profile ? profile.role : '';
                        } catch (err) {
                            console.error('Profile read failed on callback page (continuing anyway):', err);
                        }
                        auth.redirectToRoleProfile(role, user);
                    }
                }, 1200);
            }
        });
    });
})();
