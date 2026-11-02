document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('authForm');
  const nameField = document.getElementById('nameField');
  const fullName = document.getElementById('fullName');
  const emailLabel = document.getElementById('emailLabel');
  const title = document.getElementById('authTitle');
  const description = document.getElementById('authDescription');
  const submit = document.getElementById('authSubmit');
  const forgotPassword = document.getElementById('forgotPassword');
  const googleAuth = document.getElementById('googleAuth');
  const authSwitch = document.getElementById('authSwitch');
  const status = document.getElementById('authStatus');
  const notice = document.getElementById('authNotice');
  const noticeTitle = document.getElementById('authNoticeTitle');
  const noticeMessage = document.getElementById('authNoticeMessage');
  const closeNotice = document.getElementById('closeAuthNotice');
  let noticeAction = null;
  let mode = new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login';

  function showAuthNotice(titleText, message, isSuccess, actionLabel = 'Tutup', onClose = null) {
    status.textContent = message;
    status.className = `portal-status ${isSuccess ? 'is-success' : 'is-error'}`;
    noticeTitle.textContent = titleText;
    noticeMessage.textContent = message;
    closeNotice.textContent = actionLabel;
    notice.classList.toggle('is-error', !isSuccess);
    noticeAction = onClose;
    if (typeof notice.showModal === 'function') notice.showModal();
    else {
      window.alert(`${titleText}\n\n${message}`);
      if (noticeAction) noticeAction();
      noticeAction = null;
    }
  }

  closeNotice.addEventListener('click', () => {
    notice.close();
    const action = noticeAction;
    noticeAction = null;
    if (action) action();
  });

  function setMode(nextMode) {
    mode = nextMode;
    const signup = mode === 'signup';
    nameField.hidden = !signup;
    fullName.required = signup;
    title.textContent = signup ? 'Buat Akun Pendaftar' : 'Masuk ke Portal PSB';
    description.textContent = signup ? 'Gunakan email aktif untuk membuat akun pendaftaran.' : 'Pantau proses pendaftaran santri Anda melalui portal resmi.';
    emailLabel.firstChild.textContent = signup ? 'Email aktif' : 'Email';
    submit.textContent = signup ? 'Daftar Sekarang' : 'Masuk';
    forgotPassword.hidden = signup;
    googleAuth.textContent = signup ? 'Daftar dengan Google' : 'Lanjut dengan Google';
    authSwitch.innerHTML = signup
      ? 'Sudah punya akun? <button type="button" data-switch="login">Login di sini</button>'
      : 'Belum punya akun? <button type="button" data-switch="signup">Daftar sekarang</button>';
    authSwitch.querySelector('button').addEventListener('click', event => setMode(event.target.dataset.switch));
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.mode === mode));
  }

  document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
  forgotPassword.addEventListener('click', async () => {
    if (!window.supabaseClient) {
      showAuthNotice('Reset password belum tersedia', 'Konfigurasi Supabase belum diisi di supabase-config.js.', false);
      return;
    }
    const email = document.getElementById('email').value.trim();
    if (!email || !document.getElementById('email').checkValidity()) {
      showAuthNotice('Email diperlukan', 'Masukkan alamat email akun Anda dengan benar terlebih dahulu.', false);
      document.getElementById('email').focus();
      return;
    }
    forgotPassword.disabled = true;
    try {
      const redirectTo = new URL('reset-password.html', window.location.href).href;
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        showAuthNotice('Email reset gagal dikirim', error.message, false);
        return;
      }
      showAuthNotice(
        'Permintaan reset password berhasil',
        `Jika akun untuk ${email} terdaftar, email berisi tautan untuk membuat password baru akan dikirim. Periksa Kotak Masuk dan folder Spam.`,
        true
      );
    } catch (error) {
      showAuthNotice('Email reset gagal dikirim', error.message || String(error), false);
    } finally {
      forgotPassword.disabled = false;
    }
  });
  googleAuth.addEventListener('click', async () => {
    if (!window.supabaseClient) {
      showAuthNotice('Login Google belum tersedia', 'Konfigurasi Supabase belum diisi di supabase-config.js.', false);
      return;
    }
    googleAuth.disabled = true;
    const redirectUrl = new URL('portal.html', window.location.href).href;
    try {
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl }
      });
      if (error) {
        googleAuth.disabled = false;
        showAuthNotice('Login Google gagal', error.message, false);
      }
    } catch (error) {
      googleAuth.disabled = false;
      showAuthNotice('Login Google gagal', error.message || String(error), false);
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!window.supabaseClient) {
      showAuthNotice('Akun belum dapat diproses', 'Konfigurasi Supabase belum diisi di supabase-config.js.', false);
      return;
    }
    submit.disabled = true;
    status.textContent = '';
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let result;
    try {
      result = mode === 'signup'
        ? await window.supabaseClient.auth.signUp({ email, password, options: { data: { full_name: fullName.value.trim() } } })
        : await window.supabaseClient.auth.signInWithPassword({ email, password });
    } catch (error) {
      submit.disabled = false;
      showAuthNotice(mode === 'signup' ? 'Pendaftaran akun gagal' : 'Login gagal', error.message || String(error), false);
      return;
    }
    submit.disabled = false;
    if (result.error) {
      showAuthNotice(mode === 'signup' ? 'Pendaftaran akun gagal' : 'Login gagal', result.error.message, false);
      return;
    }
    if (mode === 'signup') {
      if (result.data.user?.identities?.length === 0) {
        showAuthNotice(
          'Email sudah terdaftar',
          `Email ${email} sudah memiliki akun. Silakan masuk dengan akun tersebut, bukan membuat akun baru.`,
          false
        );
        return;
      }
      if (result.data.session) {
        showAuthNotice(
          'Akun berhasil dibuat',
          `Akun untuk ${email} berhasil dibuat dan sudah dapat digunakan. Silakan lanjut untuk mengisi formulir pendaftaran.`,
          true,
          'Lanjut ke formulir pendaftaran',
          () => { window.location.href = 'portal.html'; }
        );
      } else {
        showAuthNotice(
          'Akun berhasil dibuat',
          `Email verifikasi telah diminta untuk ${email}. Periksa Kotak Masuk atau folder Spam, lalu klik tautan verifikasi sebelum login.`,
          true,
          'Mengerti'
        );
      }
      return;
    }
    const user = result.data.user || result.data.session?.user;
    if (mode === 'login' && user) {
      let profile;
      try {
        profile = await window.supabaseClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
      } catch (error) {
        showAuthNotice('Login berhasil, tetapi profil gagal diperiksa', error.message || String(error), false);
        return;
      }
      if (profile.error) {
        showAuthNotice('Login berhasil, tetapi profil gagal diperiksa', `Role akun tidak dapat diperiksa: ${profile.error.message}`, false);
        return;
      }
      if (!profile.data) {
        showAuthNotice('Login berhasil, tetapi profil tidak ditemukan', 'Profil akun tidak ditemukan di tabel profiles.', false);
        return;
      }
      window.location.href = profile.data.role === 'admin' ? 'admin.html' : 'portal.html';
      return;
    }
    window.location.href = 'portal.html';
  });
  setMode(mode);
});
