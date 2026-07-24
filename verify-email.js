/* ============================================================
   TALENT FLOW  |  verify-email.js
   ------------------------------------------------------------
   Shown to email/password accounts until they click the link
   Supabase emailed them. Google sign-ins skip this page entirely
   (Supabase already marks those accounts verified).

   Right after registering, Supabase hasn't issued a session yet
   — that only happens once the email is confirmed — so this page
   uses whenAuthReady() (never redirects) instead of requireAuth()
   (which does), and falls back to the pending email stashed by
   auth.js's register() when there's no session to read it from.
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.TalentFlowAuth;
  if (!auth) return;

  const user = await auth.whenAuthReady(); // null is expected here — no session until confirmed

  // Already verified and signed in (e.g. confirmed in another tab of the
  // same browser) — don't make them sit here.
  if (user && user.emailVerified) {
    await continueOnward(user);
    return;
  }

  const pendingEmail = (user && user.email) || auth.getPendingVerificationEmail();

  // No live session AND nothing pending — genuinely no one to verify
  // here (e.g. someone opened this page directly with no account).
  if (!pendingEmail) { window.location.href = 'login.html'; return; }

  const emailEl    = document.getElementById('verifyEmailAddress');
  const checkBtn   = document.getElementById('checkVerifiedBtn');
  const resendBtn  = document.getElementById('resendBtn');
  const hint       = document.getElementById('verifyHint');
  const logoutLink = document.getElementById('logoutLink');

  if (emailEl) emailEl.textContent = pendingEmail;

  function setHint(text, kind) {
    hint.textContent = text;
    hint.className = 'verify-hint' + (kind ? ` ${kind}` : '');
  }

  async function continueOnward(knownUser) {
    const u = knownUser || window.TalentFlowUser;
    let role = '';
    try {
      const profile = await auth.loadProfile(u.uid);
      role = profile ? profile.role : '';
    } catch (err) {
      console.error('Firestore profile read failed (continuing anyway):', err);
    }
    auth.clearPendingVerification();
    auth.redirectToRoleProfile(role, u);
  }

  checkBtn?.addEventListener('click', async () => {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Checking…';
    setHint('', '');

    try {
      const verified = await auth.checkEmailVerified();
      if (verified) {
        setHint('✓ Verified! Taking you in…', 'success');
        setTimeout(() => continueOnward(), 600);
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
