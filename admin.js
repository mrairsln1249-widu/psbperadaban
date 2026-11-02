document.addEventListener('DOMContentLoaded', async () => {
  const client = window.supabaseClient;
  const status = document.getElementById('adminStatus');
  if (!client) { status.textContent = 'Konfigurasi Supabase belum diisi.'; return; }
  const sessionResult = await client.auth.getSession();
  if (!sessionResult.data.session) { window.location.href = 'auth.html'; return; }
  const user = sessionResult.data.session.user;
  const profile = await client.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (profile.error) {
    status.textContent = `Gagal memeriksa role akun: ${profile.error.message}`;
    status.className = 'portal-status is-error';
    return;
  }
  if (profile.data.role !== 'admin') {
    status.textContent = `Akses ditolak. Role akun ${user.email} saat ini: ${profile.data.role}.`;
    status.className = 'portal-status is-error';
    return;
  }
  const profileName = profile.data.full_name?.trim();
  const metadataName = user.user_metadata?.full_name?.trim();
  const adminName = profileName && profileName !== 'Pendaftar'
    ? profileName
    : metadataName || user.email?.split('@')[0] || 'Admin';
  document.getElementById('adminGreeting').textContent = `Assalamu'alaikum, ${adminName}!`;
  document.getElementById('adminEmail').textContent = user.email || '';
  document.getElementById('logout').addEventListener('click', async () => { await client.auth.signOut(); window.location.href = 'auth.html'; });
  const result = await client.from('registrations').select('*').order('created_at', { ascending: false });
  if (result.error) { status.textContent = result.error.message; return; }
  const tbody = document.getElementById('registrations');
  result.data.forEach(registration => {
    const row = document.createElement('tr');
    const numberCell = document.createElement('td');
    const nameCell = document.createElement('td');
    const jenjangCell = document.createElement('td');
    const waliCell = document.createElement('td');
    const detailsCell = document.createElement('td');
    detailsCell.className = 'detail-cell';
    const statusCell = document.createElement('td');
    const actionCell = document.createElement('td');
    numberCell.textContent = registration.registration_number;
    nameCell.textContent = registration.nama;
    const phone = document.createElement('small');
    phone.textContent = `WA: ${registration.wa_santri || registration.wa_wali || '-'}`;
    nameCell.appendChild(document.createElement('br'));
    nameCell.appendChild(phone);
    jenjangCell.textContent = registration.jenjang || '-';
    waliCell.textContent = `${registration.nama_ayah || registration.nama_wali || '-'} / ${registration.nama_ibu || '-'}`;
    const parentPhone = document.createElement('small');
    parentPhone.textContent = `WA: ${registration.wa_orangtua || registration.wa_wali || '-'}`;
    waliCell.appendChild(document.createElement('br'));
    waliCell.appendChild(parentPhone);
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Lihat data';
    details.appendChild(summary);
    const detailItems = [
      ['Tempat, tanggal lahir', `${registration.tempat_lahir || ''}${registration.tanggal_lahir ? `, ${registration.tanggal_lahir}` : ''}`],
      ['Jenis kelamin', registration.jenis_kelamin],
      ['Asal sekolah', registration.asal_sekolah],
      ['Alamat santri', registration.alamat_santri || registration.alamat],
      ['Alamat orang tua', registration.alamat_orangtua],
      ['Sumber informasi', registration.sumber_informasi],
      ['Motivasi santri', registration.motivasi_santri],
      ['Motivasi orang tua', registration.motivasi_orangtua],
      ['Nilai rapor semester 1-5', [1, 2, 3, 4, 5].map(semester => registration[`nilai_rapor_semester_${semester}`] ?? '-').join(', ')],
      ['Pernyataan', registration.pernyataan_setuju == null ? '' : registration.pernyataan_setuju ? 'Setuju' : 'Tidak setuju']
    ];
    detailItems.forEach(([label, value]) => {
      const item = document.createElement('p');
      const labelElement = document.createElement('strong');
      labelElement.textContent = `${label}: `;
      item.appendChild(labelElement);
      item.appendChild(document.createTextNode(value == null || value === '' ? '-' : String(value)));
      details.appendChild(item);
    });
    detailsCell.appendChild(details);
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
    [numberCell, nameCell, jenjangCell, waliCell, detailsCell, statusCell, actionCell].forEach(cell => row.appendChild(cell));
    select.addEventListener('change', async () => {
      const update = await client.from('registrations').update({ status: select.value, updated_at: new Date().toISOString() }).eq('id', registration.id);
      status.textContent = update.error ? update.error.message : 'Status pendaftar berhasil diperbarui.';
      status.className = update.error ? 'portal-status is-error' : 'portal-status is-success';
      if (!update.error) badge.textContent = select.value;
    });
    tbody.appendChild(row);
  });
});
