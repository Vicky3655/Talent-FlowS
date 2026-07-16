/* ============================================================
   TALENT FLOW  |  verify-email.js
   ------------------------------------------------------------
   Shown to email/password accounts until they click the link
   Firebase emailed them. Google sign-ins skip this page entirely
   (Firebase already marks those accounts verified).
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.TalentFlowAuth;
  if (!auth) return;

  const user = await auth.requireAuth(); // redirects to login.html if signed out

  // Already verified (e.g. they clicked the link in another tab) —
  // don't make them sit here, send them straight on.
  if (user.emailVerified) {
    await continueOnward();
    return;
  }

  const emailEl   = document.getElementById('verifyEmailAddress');
  const checkBtn  = document.getElementById('checkVerifiedBtn');
  const resendBtn = document.getElementById('resendBtn');
  const hint      = document.getElementById('verifyHint');
  const logoutLink = document.getElementById('logoutLink');

  if (emailEl) emailEl.textContent = user.email || 'your email';

  function setHint(text, kind) {
    hint.textContent = text;
    hint.className = 'verify-hint' + (kind ? ` ${kind}` : '');
  }

  async function continueOnward() {
    let role = '';
    try {
      const profile = await auth.loadProfile(user.uid);
      role = profile ? profile.role : '';
    } catch (err) {
      console.error('Firestore profile read failed (continuing anyway):', err);
    }
    auth.redirectToRoleProfile(role, user);
  }

  checkBtn?.addEventListener('click', async () => {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking…';
    setHint('', '');

    try {
      const verified = await auth.checkEmailVerified();
      if (verified) {
        setHint('✓ Verified! Taking you in…', 'success');
        setTimeout(continueOnward, 600);
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
    resendBtn.disabled = true;
    try {
      await auth.sendVerificationEmail();
      setHint('Sent — check your inbox (and spam folder).', 'success');
      startCooldown(45);
    } catch (err) {
      setHint(auth.friendlyError ? auth.friendlyError(err) : 'Could not resend — try again shortly.', 'error');
      resendBtn.disabled = false;
    }
  });

  logoutLink?.addEventListener('click', () => auth.logOut());
});
