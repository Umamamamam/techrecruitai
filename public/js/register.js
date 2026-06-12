// js/register.js

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

  // ─── Register Form ───────────────────────────────────────────────────────────
  const form = document.getElementById('registerForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName        = document.getElementById('fullName').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showToast('Passwords do not match.', false);
      return;
    }

    const payload = { fullName, email, password, confirmPassword };

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error. Are you running through localhost:3000?');
      }

      const result = await response.json();

      if (!result.success) {
        showToast(result.message, false);
        return;
      }

      // Store toast to show on login page
      localStorage.setItem('register_toast', `🎉 Hey ${fullName}, successfully registered! Please login.`);

      showToast(`🎉 Hey ${fullName}, successfully registered! Redirecting to login...`, true);
      form.reset();

      setTimeout(() => { window.location.href = '/login.html'; }, 2000);

    } catch (err) {
      showToast(err.message || 'Something went wrong. Please try again.', false);
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