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
  const followUpStatus = document.getElementById('followUpStatus');
  const followUpResult = await client.rpc('admin_account_followup_report');
  if (followUpResult.error) {
    followUpStatus.textContent = `Laporan akun belum lengkap belum tersedia: ${followUpResult.error.message}. Jalankan migration terbaru di Supabase.`;
    followUpStatus.className = 'portal-status is-error';
  } else {
    const incompleteAccounts = document.getElementById('incompleteAccounts');
    if (!followUpResult.data.length) {
      followUpStatus.textContent = 'Tidak ada akun yang perlu di-follow-up.';
      followUpStatus.className = 'portal-status is-success';
    } else {
      followUpStatus.textContent = `${followUpResult.data.length} akun belum melengkapi formulir.`;
      followUpStatus.className = 'portal-status is-pending';
      followUpResult.data.forEach(account => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const emailCell = document.createElement('td');
        const createdCell = document.createElement('td');
        const actionCell = document.createElement('td');
        const contactLink = document.createElement('a');
        const whatsappLink = document.createElement('a');
        nameCell.textContent = account.full_name || 'Pendaftar';
        emailCell.textContent = account.email || '-';
        createdCell.textContent = new Date(account.created_at).toLocaleDateString('id-ID');
        contactLink.className = 'btn btn--ghost';
        contactLink.href = account.email ? `mailto:${account.email}` : '#';
        contactLink.textContent = 'Hubungi via Email';
        if (!account.email) contactLink.setAttribute('aria-disabled', 'true');
        whatsappLink.className = 'btn btn--primary';
        whatsappLink.textContent = 'WhatsApp';
        whatsappLink.target = '_blank';
        whatsappLink.rel = 'noopener noreferrer';
        const whatsapp = normalizeWhatsApp(account.whatsapp);
        whatsappLink.href = whatsapp ? `https://wa.me/${whatsapp.replace(/^\+/, '')}?text=${encodeURIComponent('Assalamu\'alaikum, kami dari panitia PSB Pesantren Peradaban. Apakah Bapak/Ibu sudah siap melanjutkan pendaftaran?')}` : '#';
        if (!whatsapp) whatsappLink.setAttribute('aria-disabled', 'true');
        actionCell.appendChild(contactLink);
        actionCell.appendChild(whatsappLink);
        [nameCell, emailCell, createdCell, actionCell].forEach(cell => row.appendChild(cell));
        incompleteAccounts.appendChild(row);
      });
    }
  }
  function normalizeWhatsApp(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
    if (digits.startsWith('62')) return digits;
    return '';
  }
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
    const note = document.createElement('textarea');
    note.className = 'admin-note';
    note.placeholder = 'Catatan untuk pendaftar jika perlu perbaikan...';
    note.value = registration.catatan || '';
    note.setAttribute('aria-label', `Catatan untuk ${registration.nama || 'pendaftar'}`);
    const saveAction = document.createElement('button');
    saveAction.type = 'button';
    saveAction.className = 'btn btn--ghost admin-action-save';
    saveAction.textContent = 'Simpan status';
    actionCell.appendChild(select);
    actionCell.appendChild(note);
    actionCell.appendChild(saveAction);
    [numberCell, nameCell, jenjangCell, waliCell, detailsCell, statusCell, actionCell].forEach(cell => row.appendChild(cell));
    saveAction.addEventListener('click', async () => {
      if (select.value === 'perlu_perbaikan' && !note.value.trim()) {
        status.textContent = 'Tambahkan catatan perbaikan sebelum menyimpan status tersebut.';
        status.className = 'portal-status is-error';
        note.focus();
        return;
      }
      saveAction.disabled = true;
      const update = await client.from('registrations').update({ status: select.value, catatan: note.value.trim() || null, updated_at: new Date().toISOString() }).eq('id', registration.id);
      status.textContent = update.error ? update.error.message : 'Status pendaftar berhasil diperbarui.';
      status.className = update.error ? 'portal-status is-error' : 'portal-status is-success';
      if (!update.error) {
        badge.textContent = select.value;
        registration.status = select.value;
        registration.catatan = note.value.trim();
      }
      saveAction.disabled = false;
    });
    tbody.appendChild(row);
  });
});
