document.addEventListener('DOMContentLoaded', async () => {
  const client = window.supabaseClient;
  const form = document.getElementById('resetPasswordForm');
  const password = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const submit = document.getElementById('resetPasswordSubmit');
  const status = document.getElementById('resetPasswordStatus');

  function showStatus(message, isSuccess) {
    status.textContent = message;
    status.className = `portal-status ${isSuccess ? 'is-success' : 'is-error'}`;
  }

  if (!client) {
    form.hidden = true;
    showStatus('Konfigurasi Supabase belum diisi. Reset password tidak dapat diproses.', false);
    return;
  }

  const authError = new URLSearchParams(window.location.hash.slice(1)).get('error_description')
    || new URLSearchParams(window.location.search).get('error_description');
  if (authError) {
    form.hidden = true;
    showStatus(`Tautan reset tidak valid atau sudah kedaluwarsa: ${authError}`, false);
    return;
  }

  let session;
  try {
    const result = await client.auth.getSession();
    if (result.error) {
      form.hidden = true;
      showStatus(`Tautan reset tidak dapat diverifikasi: ${result.error.message}`, false);
      return;
    }
    session = result.data.session;
  } catch (error) {
    form.hidden = true;
    showStatus(`Tautan reset tidak dapat diverifikasi: ${error.message || error}`, false);
    return;
  }

  if (!session) {
    form.hidden = true;
    showStatus('Sesi reset tidak ditemukan atau tautan sudah kedaluwarsa. Minta tautan reset baru dari halaman login.', false);
    return;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (password.value !== confirmPassword.value) {
      showStatus('Konfirmasi password tidak sama.', false);
      confirmPassword.focus();
      return;
    }

    submit.disabled = true;
    try {
      const { error } = await client.auth.updateUser({ password: password.value });
      if (error) {
        showStatus(`Password gagal diperbarui: ${error.message}`, false);
        return;
      }
      form.hidden = true;
      showStatus('Password berhasil diperbarui. Silakan kembali ke halaman login dan masuk menggunakan password baru.', true);
    } catch (error) {
      showStatus(`Password gagal diperbarui: ${error.message || error}`, false);
    } finally {
      submit.disabled = false;
    }
  });
});
