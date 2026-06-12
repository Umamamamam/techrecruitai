// js/login.js

document.addEventListener('DOMContentLoaded', () => {

  // ─── Toast ───────────────────────────────────────────────────────────────────
  function showToast(message, success) {
    let existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: ${success ? 'linear-gradient(90deg,#8b0000,#c10f1a)' : '#1f2937'};
      color: #fff;
      padding: 14px 48px 14px 20px;
      border-radius: 14px;
      font-family: Poppins, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 30px rgba(0,0,0,0.18);
      z-index: 9999;
      min-width: 280px;
      text-align: center;
      animation: slideDown 0.3s ease;
    `;
    toast.innerHTML = `
      <style>@keyframes slideDown{from{opacity:0;top:0}to{opacity:1;top:24px}}</style>
      ${message}
      <span onclick="document.getElementById('toast').remove()" style="
        position:absolute; right:14px; top:50%; transform:translateY(-50%);
        cursor:pointer; font-size:18px; opacity:0.8; line-height:1;
      ">&times;</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if (document.getElementById('toast')) toast.remove(); }, 4000);
  }

  // ─── Show register success toast if coming from register page ────────────────
  const registerMsg = localStorage.getItem('register_toast');
  if (registerMsg) {
    localStorage.removeItem('register_toast');
    setTimeout(() => showToast(registerMsg, true), 300);
  }

  // ─── Login Form ──────────────────────────────────────────────────────────────
  const form = document.getElementById('loginForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      email:    document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        showToast(result.message, false);
        return;
      }

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('oauth_toast', `👋 Hey, ${result.user.full_name}! Login successful.`);

      showToast(`👋 Hey, ${result.user.full_name}! Login successful. Redirecting...`, true);

      setTimeout(() => { window.location.href = '/index.html'; }, 1500);

    } catch (err) {
      showToast('Something went wrong. Please try again.', false);
      console.error(err);
    }
  });

  // ─── OAuth Helper ─────────────────────────────────────────────────────────────
  async function startOAuth(provider) {
    try {
      const res  = await fetch(`/api/auth/oauth/${provider}`);
      const data = await res.json();

      if (!data.success || !data.url) {
        showToast(`Could not start ${provider} sign-in. Please try again.`, false);
        return;
      }

      window.location.href = data.url;

    } catch (err) {
      showToast('Something went wrong. Please try again.', false);
      console.error(err);
    }
  }

  // ─── Social Buttons ───────────────────────────────────────────────────────────
  const socialBtns = document.querySelectorAll('.social-btn');
  if (socialBtns[0]) socialBtns[0].addEventListener('click', () => startOAuth('google'));
  if (socialBtns[1]) socialBtns[1].addEventListener('click', () => startOAuth('microsoft'));

});