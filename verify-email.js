/* ============================================================
   TALENT FLOW  |  verify-email.js
   ------------------------------------------------------------
   Shown to email/password accounts until they click the link
   Supabase emailed them. Google sign-ins skip this page entirely
   (Supabase already marks those accounts verified).

   Important: someone who just registered has NO session yet —
   Supabase doesn't log an email/password account in until the
   confirmation link is clicked — so this page has to work with
   whenAuthReady() (which resolves with null rather than
   redirecting) instead of requireAuth(). The email address to
   show/resend to comes from window.TalentFlowUser if a session
   does exist, otherwise from the ?email= the person arrived with
   (see auth.js's redirectToRoleProfile()).
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.TalentFlowAuth;
  if (!auth) return;

  const queryEmail = new URLSearchParams(window.location.search).get('email') || '';
  const user = await auth.whenAuthReady(); // null is expected right after registering, not an error

  // Already verified (e.g. they clicked the link in another tab, or a
  // session already existed) — don't make them sit here, send them on.
  if (user && user.emailVerified) {
    await continueOnward(user);
    return;
  }

  const emailEl    = document.getElementById('verifyEmailAddress');
  const checkBtn   = document.getElementById('checkVerifiedBtn');
  const resendBtn  = document.getElementById('resendBtn');
  const hint       = document.getElementById('verifyHint');
  const logoutLink = document.getElementById('logoutLink');

  // A real session's email is always trusted over the query string;
  // the query string only fills in for the common no-session case.
  const knownEmail = (user && user.email) || queryEmail;
  if (emailEl) emailEl.textContent = knownEmail || 'your email';

  function setHint(text, kind) {
    hint.textContent = text;
    hint.className = 'verify-hint' + (kind ? ` ${kind}` : '');
  }

  async function continueOnward(u) {
    let role = '';
    try {
      const profile = await auth.loadProfile(u.uid);
      role = profile ? profile.role : '';
    } catch (err) {
      console.error('Profile read failed (continuing anyway):', err);
    }
    auth.redirectToRoleProfile(role, u);
  }

  checkBtn?.addEventListener('click', async () => {
    // No session at all (the normal case right after registering) —
    // there's nothing here to re-check against. Logging in is what
    // actually confirms it: it succeeds once the link's been clicked,
    // and fails with a clear "please confirm your email" message if not.
    if (!user) {
      const q = knownEmail ? ('?email=' + encodeURIComponent(knownEmail)) : '';
      window.location.href = 'login.html' + q;
      return;
    }

    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking…';
    setHint('', '');

    try {
      const verified = await auth.checkEmailVerified();
      if (verified) {
        setHint('✓ Verified! Taking you in…', 'success');
        setTimeout(() => continueOnward(window.TalentFlowUser || user), 600);
      } else {
        setHint("Not verified yet — click the link in the email first.", 'error');
        checkBtn.disabled = false;
        checkBtn.textContent = "I've verified — Continue";
      }
    } catch (err) {
      setHint(auth.friendlyError ? auth.friendlyError(err) : 'Could not check right now — try again.', 'error');
      checkBtn.disabled = false;
      checkBtn.textContent = "I've verified — Continue";
    }
  });

  let cooldownTimer = null;
  function startCooldown(seconds) {
    let remaining = seconds;
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend email (${remaining}s)`;
    cooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend email';
      } else {
        resendBtn.textContent = `Resend email (${remaining}s)`;
      }
    }, 1000);
  }

  resendBtn?.addEventListener('click', async () => {
    if (!knownEmail) {
      setHint('Register again first — there\u2019s no email address to resend to.', 'error');
      return;
    }
    resendBtn.disabled = true;
    try {
      await auth.sendVerificationEmail(knownEmail);
      setHint('Sent — check your inbox (and spam folder).', 'success');
      startCooldown(45);
    } catch (err) {
      setHint(auth.friendlyError ? auth.friendlyError(err) : 'Could not resend — try again shortly.', 'error');
      resendBtn.disabled = false;
    }
  });

  logoutLink?.addEventListener('click', () => {
    if (user) auth.logOut();
    else window.location.href = 'login.html';
  });
});
