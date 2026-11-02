document.addEventListener('DOMContentLoaded', async () => {
  const client = window.supabaseClient;
  const status = document.getElementById('adminStatus');
  if (!client) { status.textContent = 'Konfigurasi Supabase belum diisi.'; return; }
  const sessionResult = await client.auth.getSession();
  if (!sessionResult.data.session) { window.location.href = 'auth.html'; return; }
  const user = sessionResult.data.session.user;
  document.getElementById('adminEmail').textContent = user.email;
  const profile = await client.from('profiles').select('role').eq('id', user.id).single();
  if (profile.error || profile.data.role !== 'admin') { status.textContent = 'Akses ditolak. Akun ini bukan admin.'; status.className = 'portal-status is-error'; return; }
  document.getElementById('logout').addEventListener('click', async () => { await client.auth.signOut(); window.location.href = 'auth.html'; });
  const result = await client.from('registrations').select('*').order('created_at', { ascending: false });
  if (result.error) { status.textContent = result.error.message; return; }
  const tbody = document.getElementById('registrations');
  result.data.forEach(registration => {
    const row = document.createElement('tr');
    const values = [registration.registration_number, registration.nama, registration.wa_wali, registration.jenjang, registration.nama_wali];
    const numberCell = document.createElement('td');
    const nameCell = document.createElement('td');
    const jenjangCell = document.createElement('td');
    const waliCell = document.createElement('td');
    const statusCell = document.createElement('td');
    const actionCell = document.createElement('td');
    numberCell.textContent = values[0];
    nameCell.textContent = values[1];
    const phone = document.createElement('small');
    phone.textContent = values[2];
    nameCell.appendChild(document.createElement('br'));
    nameCell.appendChild(phone);
    jenjangCell.textContent = values[3];
    waliCell.textContent = values[4];
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = registration.status;
    statusCell.appendChild(badge);
    const select = document.createElement('select');
    ['draft', 'menunggu_verifikasi', 'perlu_perbaikan', 'terverifikasi', 'menunggu_pembayaran', 'pembayaran_diperiksa', 'pembayaran_lunas', 'siap_ujian', 'sudah_ujian', 'lulus', 'tidak_lulus', 'cadangan', 'daftar_ulang_selesai', 'ditolak'].forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value === 'tidak_lulus' ? 'Tidak lulus' : value[0].toUpperCase() + value.slice(1);
      select.appendChild(option);
    });
    select.value = registration.status;
    actionCell.appendChild(select);
    [numberCell, nameCell, jenjangCell, waliCell, statusCell, actionCell].forEach(cell => row.appendChild(cell));
    select.addEventListener('change', async () => {
      const update = await client.from('registrations').update({ status: select.value, updated_at: new Date().toISOString() }).eq('id', registration.id);
      status.textContent = update.error ? update.error.message : 'Status pendaftar berhasil diperbarui.';
      status.className = update.error ? 'portal-status is-error' : 'portal-status is-success';
      if (!update.error) badge.textContent = select.value;
    });
    tbody.appendChild(row);
  });
});
