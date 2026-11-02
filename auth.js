document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('authForm');
  const nameField = document.getElementById('nameField');
  const fullName = document.getElementById('fullName');
  const emailLabel = document.getElementById('emailLabel');
  const title = document.getElementById('authTitle');
  const description = document.getElementById('authDescription');
  const submit = document.getElementById('authSubmit');
  const googleAuth = document.getElementById('googleAuth');
  const authSwitch = document.getElementById('authSwitch');
  const status = document.getElementById('authStatus');
  let mode = new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login';

  function setMode(nextMode) {
    mode = nextMode;
    const signup = mode === 'signup';
    nameField.hidden = !signup;
    fullName.required = signup;
    title.textContent = signup ? 'Buat Akun Pendaftar' : 'Masuk ke Portal PSB';
    description.textContent = signup ? 'Gunakan email aktif untuk membuat akun pendaftaran.' : 'Pantau proses pendaftaran santri Anda melalui portal resmi.';
    emailLabel.firstChild.textContent = signup ? 'Email aktif' : 'Email';
    submit.textContent = signup ? 'Daftar Sekarang' : 'Masuk';
    googleAuth.textContent = signup ? 'Daftar dengan Google' : 'Lanjut dengan Google';
    authSwitch.innerHTML = signup
      ? 'Sudah punya akun? <button type="button" data-switch="login">Login di sini</button>'
      : 'Belum punya akun? <button type="button" data-switch="signup">Daftar sekarang</button>';
    authSwitch.querySelector('button').addEventListener('click', event => setMode(event.target.dataset.switch));
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.mode === mode));
  }

  document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  googleAuth.addEventListener('click', async () => {
    if (!window.supabaseClient) {
      status.textContent = 'Konfigurasi Supabase belum diisi di supabase-config.js.';
      status.className = 'portal-status is-error';
      return;
    }
    googleAuth.disabled = true;
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/portal.html` }
    });
    if (error) {
      googleAuth.disabled = false;
      status.textContent = error.message;
      status.className = 'portal-status is-error';
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!window.supabaseClient) {
      status.textContent = 'Konfigurasi Supabase belum diisi di supabase-config.js.';
      status.className = 'portal-status is-error';
      return;
    }
    submit.disabled = true;
    status.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const result = mode === 'signup'
      ? await window.supabaseClient.auth.signUp({ email, password, options: { data: { full_name: fullName.value.trim() } } })
      : await window.supabaseClient.auth.signInWithPassword({ email, password });
    submit.disabled = false;
    if (result.error) {
      status.textContent = result.error.message;
      status.className = 'portal-status is-error';
      return;
    }
    if (mode === 'signup' && !result.data.session) {
      status.textContent = 'Akun dibuat. Silakan cek email untuk konfirmasi sebelum masuk.';
      status.className = 'portal-status is-success';
      return;
    }
    window.location.href = 'portal.html';
  });
  setMode(mode);
});
