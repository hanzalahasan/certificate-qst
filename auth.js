/* =====================================================
   QST — Authentication Module
   Login screen, signup, auth state, session control
   ===================================================== */

const Auth = (() => {
  let mode = 'signin'; // 'signin' | 'signup'
  let bootResolve = null;
  const bootPromise = new Promise(r => { bootResolve = r; });

  // ── Boot — Decide local vs cloud mode ─────────────
  async function boot() {
    const m = Backend.init();

    if (m === 'local') {
      hideLogin();
      bootResolve({ mode: 'local', user: null });
      return;
    }

    // Cloud mode → wait for auth state
    Backend.onAuthChange((user) => {
      if (user) {
        hideLogin();
        if (bootResolve) {
          bootResolve({ mode: 'cloud', user });
          bootResolve = null;
        } else {
          // Re-render after relogin
          const v = App?.state?.view || 'dashboard';
          App?.router?.navigate(v);
        }
      } else {
        showLogin();
      }
    });
  }

  function waitForReady() { return bootPromise; }

  // ── Login Screen UI ───────────────────────────────
  function showLogin() {
    const overlay = document.getElementById('login-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    if (Backend.getMode() === 'local') {
      document.getElementById('login-form').style.display     = 'none';
      document.getElementById('setup-required').style.display = 'block';
    } else {
      document.getElementById('login-form').style.display     = 'block';
      document.getElementById('setup-required').style.display = 'none';
    }
  }

  function hideLogin() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function showError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
  }

  function clearError() {
    const el = document.getElementById('login-error');
    if (el) el.style.display = 'none';
  }

  // ── Sign In ───────────────────────────────────────
  async function signIn() {
    clearError();
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    if (!email || !password) { showError('Email and password required'); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await Backend.signUp(email, password, email.split('@')[0]);
      } else {
        await Backend.signIn(email, password);
      }
    } catch (e) {
      showError(humanizeError(e));
    } finally {
      setLoading(false);
    }
  }

  function setLoading(on) {
    const btn = document.querySelector('#login-form button[type="submit"]');
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on
      ? '<span class="spinner"></span> Please wait…'
      : (mode === 'signup'
          ? '<i class="fa-solid fa-user-plus"></i> Create Account'
          : '<i class="fa-solid fa-right-to-bracket"></i> Sign In');
  }

  function toggleMode(targetMode) {
    mode = targetMode || (mode === 'signin' ? 'signup' : 'signin');
    const link = document.getElementById('link-signup');
    if (link) link.textContent = mode === 'signup' ? 'Back to Sign In' : 'Create Account';
    setLoading(false);
  }

  // ── Sign Out ──────────────────────────────────────
  async function signOut() {
    if (!Backend.isCloud()) return;
    if (confirm('Sign out?')) {
      await Backend.signOut();
      // App.state will reset on next boot
      location.reload();
    }
  }

  // ── Reset Password ────────────────────────────────
  async function resetPassword() {
    const email = document.getElementById('login-email')?.value?.trim();
    if (!email) {
      App?.notify?.warning('Enter your email first, then click "Forgot password?"');
      showError('Enter your email above first');
      return;
    }
    try {
      await Backend.resetPassword(email);
      showError('Password reset email sent to ' + email);
    } catch (e) {
      showError(humanizeError(e));
    }
  }

  // ── Use Local Mode (skip cloud) ───────────────────
  function useLocalMode() {
    Backend.forceLocalMode();
    hideLogin();
    if (bootResolve) {
      bootResolve({ mode: 'local', user: null });
      bootResolve = null;
    }
    if (window.App && App.init) App.init();
  }

  // ── Error humanization ────────────────────────────
  function humanizeError(e) {
    const msg = e?.code || e?.message || 'Unknown error';
    const map = {
      'auth/invalid-email':                'Invalid email address',
      'auth/user-disabled':                'Account disabled',
      'auth/user-not-found':               'No account with this email',
      'auth/wrong-password':               'Incorrect password',
      'auth/email-already-in-use':         'Email already registered — sign in instead',
      'auth/weak-password':                'Password too weak (min. 6 characters)',
      'auth/network-request-failed':       'Network error — check connection',
      'auth/invalid-credential':           'Invalid email or password',
      'auth/too-many-requests':            'Too many attempts — try again later',
    };
    return map[msg] || (e?.message || msg);
  }

  return {
    boot, waitForReady, signIn, signOut, resetPassword, toggleMode, useLocalMode,
    showLogin, hideLogin,
  };
})();

window.Auth = Auth;
