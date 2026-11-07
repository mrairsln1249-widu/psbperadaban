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
  function printRegistrationForm(registration, email) {
    const escapeHtml = value => String(value || '-').replace(/[<>&"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[character]));
    const fields = [
      ['Nomor pendaftaran', registration.registration_number], ['Email akun', email],
      ['Nama calon santri', registration.nama], ['Tempat, tanggal lahir', `${registration.tempat_lahir || '-'}, ${registration.tanggal_lahir || '-'}`],
      ['Jenis kelamin', registration.jenis_kelamin], ['Agama', registration.agama], ['Program/jenjang', registration.jenjang],
      ['Asal sekolah', registration.asal_sekolah], ['Alamat lengkap', registration.alamat_santri || registration.alamat],
      ['RT/RW', registration.alamat_rt_rw], ['Kelurahan/Desa', registration.kelurahan], ['Kecamatan', registration.kecamatan],
      ['Kabupaten/Kota', registration.kabupaten_kota], ['WA santri', registration.wa_santri],
      ['Nama ayah', registration.nama_ayah || registration.nama_wali], ['Nama ibu', registration.nama_ibu],
      ['WA orang tua', registration.wa_orangtua || registration.wa_wali], ['Pilihan program', registration.pilihan_program],
      ['Motivasi santri', registration.motivasi_santri], ['Motivasi orang tua/wali', registration.motivasi_orangtua]
    ];
    const rows = fields.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    const printSheet = document.createElement('section');
    printSheet.className = 'admin-print-sheet';
    printSheet.innerHTML = `<header><img src="logopp.png"><div><strong>PESANTREN PERADABAN</strong><br><span>Formulir Pendaftaran Calon Santri Baru</span></div></header><h1>Formulir Pendaftaran</h1><div class="admin-print-grid">${rows}</div><div class="admin-print-statement">Dengan ini saya menyatakan bahwa data yang saya isi adalah benar dan dapat dipertanggungjawabkan.</div><div class="admin-print-sign"><div>(________________)<br>Orang Tua / Wali</div><div>(________________)<br>Calon Santri</div></div>`;
    document.body.appendChild(printSheet);
    document.body.classList.add('admin-printing');
    const cleanup = () => {
      printSheet.remove();
      document.body.classList.remove('admin-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
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
  function generateCbtPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(12);
    crypto.getRandomValues(values);
    return Array.from(values, value => alphabet[value % alphabet.length]).join('');
  }
  const result = await client.from('registrations').select('*').order('created_at', { ascending: false });
  if (result.error) { status.textContent = result.error.message; return; }
  const userIds = result.data.map(registration => registration.user_id).filter(Boolean);
  const profilesResult = userIds.length
    ? await client.from('profiles').select('id, email').in('id', userIds)
    : { data: [], error: null };
  if (profilesResult.error) { status.textContent = `Email pendaftar gagal dimuat: ${profilesResult.error.message}`; status.className = 'portal-status is-error'; return; }
  const emailByUserId = new Map((profilesResult.data || []).map(profile => [profile.id, profile.email]));
  const tbody = document.getElementById('registrations');
  const renderedRows = [];
  result.data.forEach(registration => {
    const row = document.createElement('tr');
    const numberCell = document.createElement('td');
    const nameCell = document.createElement('td');
    const emailCell = document.createElement('td');
    const jenjangCell = document.createElement('td');
    const waliCell = document.createElement('td');
    const detailsCell = document.createElement('td');
    const documentsCell = document.createElement('td');
    documentsCell.className = 'documents-cell';
    detailsCell.className = 'detail-cell';
    const statusCell = document.createElement('td');
    const actionCell = document.createElement('td');
    numberCell.textContent = registration.registration_number;
    nameCell.textContent = registration.nama;
    const phone = document.createElement('small');
    phone.textContent = `WA: ${registration.wa_santri || registration.wa_wali || '-'}`;
    nameCell.appendChild(document.createElement('br'));
    nameCell.appendChild(phone);
    emailCell.textContent = emailByUserId.get(registration.user_id) || '-';
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
    const examDate = document.createElement('input');
    examDate.type = 'date';
    examDate.className = 'admin-exam-field';
    examDate.value = registration.tanggal_ujian || '';
    examDate.setAttribute('aria-label', `Tanggal ujian untuk ${registration.nama || 'pendaftar'}`);
    const examUrl = document.createElement('input');
    examUrl.type = 'url';
    examUrl.className = 'admin-exam-field';
    examUrl.placeholder = 'https://cbt.pesantrenperadaban.my.id/login/index.php';
    examUrl.value = registration.url_ujian || 'https://cbt.pesantrenperadaban.my.id/login/index.php';
    examUrl.setAttribute('aria-label', `Alamat CBT untuk ${registration.nama || 'pendaftar'}`);
    const examHelp = document.createElement('small');
    examHelp.className = 'admin-exam-help';
    examHelp.textContent = 'Isi jadwal dan URL CBT jika status Siap Ujian.';
    const cbtPassword = document.createElement('input');
    cbtPassword.type = 'text';
    cbtPassword.className = 'admin-exam-field';
    cbtPassword.placeholder = 'Password CBT sementara';
    cbtPassword.value = registration.cbt_password || '';
    cbtPassword.readOnly = true;
    cbtPassword.setAttribute('aria-label', `Password CBT untuk ${registration.nama || 'pendaftar'}`);
    const cbtHelp = document.createElement('small');
    cbtHelp.className = 'admin-exam-help';
    cbtHelp.textContent = 'Password acak dibuat sekali dan harus diganti saat login pertama Moodle.';
    const saveAction = document.createElement('button');
    saveAction.type = 'button';
    saveAction.className = 'btn btn--ghost admin-action-save';
    saveAction.textContent = 'Simpan status';
    const printFormAction = document.createElement('button');
    printFormAction.type = 'button';
    printFormAction.className = 'btn btn--ghost admin-action-save';
    printFormAction.textContent = 'Cetak formulir';
    printFormAction.addEventListener('click', () => printRegistrationForm(registration, emailByUserId.get(registration.user_id)));
    actionCell.appendChild(select);
    actionCell.appendChild(note);
    actionCell.appendChild(examHelp);
    actionCell.appendChild(examDate);
    actionCell.appendChild(examUrl);
    actionCell.appendChild(cbtPassword);
    actionCell.appendChild(cbtHelp);
    actionCell.appendChild(saveAction);
    actionCell.appendChild(printFormAction);
    select.addEventListener('change', () => {
      if (select.value === 'siap_ujian' && !cbtPassword.value) cbtPassword.value = generateCbtPassword();
    });
    documentsCell.textContent = 'Memuat...';
    [numberCell, nameCell, emailCell, jenjangCell, waliCell, detailsCell, documentsCell, statusCell, actionCell].forEach(cell => row.appendChild(cell));
    saveAction.addEventListener('click', async () => {
      if (select.value === 'perlu_perbaikan' && !note.value.trim()) {
        status.textContent = 'Tambahkan catatan perbaikan sebelum menyimpan status tersebut.';
        status.className = 'portal-status is-error';
        note.focus();
        return;
      }
      saveAction.disabled = true;
      if (select.value === 'siap_ujian' && (!examDate.value || !examUrl.value.trim())) {
        status.textContent = 'Isi tanggal ujian dan alamat CBT sebelum menetapkan status Siap Ujian.';
        status.className = 'portal-status is-error';
        saveAction.disabled = false;
        return;
      }
      if (select.value === 'siap_ujian' && !emailByUserId.get(registration.user_id)) {
        status.textContent = 'Email akun pendaftar belum tersedia. Jalankan migration email profile terlebih dahulu.';
        status.className = 'portal-status is-error';
        saveAction.disabled = false;
        return;
      }
      if (select.value === 'siap_ujian' && !cbtPassword.value) cbtPassword.value = generateCbtPassword();
      const cbtUsername = emailByUserId.get(registration.user_id) || null;
      const update = await client.from('registrations').update({
        status: select.value,
        catatan: note.value.trim() || null,
        tanggal_ujian: examDate.value || null,
        url_ujian: examUrl.value.trim() || null,
        cbt_username: select.value === 'siap_ujian' ? cbtUsername : registration.cbt_username || null,
        cbt_password: select.value === 'siap_ujian' ? cbtPassword.value : registration.cbt_password || null,
        updated_at: new Date().toISOString()
      }).eq('id', registration.id);
      status.textContent = update.error ? update.error.message : 'Status pendaftar berhasil diperbarui.';
      status.className = update.error ? 'portal-status is-error' : 'portal-status is-success';
      if (!update.error) {
        badge.textContent = select.value;
        registration.status = select.value;
        registration.catatan = note.value.trim();
        registration.tanggal_ujian = examDate.value || null;
        registration.url_ujian = examUrl.value.trim() || null;
        registration.cbt_username = select.value === 'siap_ujian' ? cbtUsername : registration.cbt_username;
        registration.cbt_password = select.value === 'siap_ujian' ? cbtPassword.value : registration.cbt_password;
      }
      saveAction.disabled = false;
    });
    tbody.appendChild(row);
    renderedRows.push({ registration, row });
    loadRegistrationDocuments(registration.id, documentsCell);
  });

  const exportStatus = document.getElementById('exportStatus');
  const exportProgram = document.getElementById('exportProgram');
  function getFilteredRegistrations() {
    return result.data.filter(registration =>
      (!exportStatus.value || registration.status === exportStatus.value)
      && (!exportProgram.value || registration.jenjang === exportProgram.value)
    );
  }
  function refreshRegistrationRows() {
    const filteredIds = new Set(getFilteredRegistrations().map(registration => registration.id));
    renderedRows.forEach(({ registration, row }) => { row.hidden = !filteredIds.has(registration.id); });
  }
  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  }
  function downloadCsv() {
    const rows = getFilteredRegistrations();
    if (!rows.length) {
      status.textContent = 'Tidak ada pendaftar yang sesuai filter untuk diunduh.';
      status.className = 'portal-status is-pending';
      return;
    }
    const headers = ['Nomor Pendaftaran', 'Nama', 'Email Akun', 'Program', 'WhatsApp Santri', 'WhatsApp Orang Tua', 'Status', 'Tanggal Ujian', 'URL CBT', 'Username CBT'];
    const csvRows = rows.map(registration => [
      registration.registration_number,
      registration.nama,
      emailByUserId.get(registration.user_id) || '',
      registration.jenjang,
      registration.wa_santri || registration.wa_wali || '',
      registration.wa_orangtua || registration.wa_wali || '',
      registration.status,
      registration.tanggal_ujian || '',
      registration.url_ujian || '',
      registration.cbt_username || emailByUserId.get(registration.user_id) || ''
    ].map(csvCell).join(','));
    const blob = new Blob([`\uFEFF${[headers.map(csvCell).join(','), ...csvRows].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const program = exportProgram.value ? `-${exportProgram.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';
    const selectedStatus = exportStatus.value ? `-${exportStatus.value}` : '';
    link.href = url;
    link.download = `data-pendaftar${selectedStatus}${program}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = `${rows.length} data pendaftar berhasil disiapkan untuk diunduh.`;
    status.className = 'portal-status is-success';
  }
  exportStatus.addEventListener('change', refreshRegistrationRows);
  exportProgram.addEventListener('change', refreshRegistrationRows);
  document.getElementById('exportRegistrations').addEventListener('click', downloadCsv);

  async function loadRegistrationDocuments(registrationId, cell) {
    const result = await client
      .from('registration_documents')
      .select('document_type, file_path, original_name, created_at')
      .eq('registration_id', registrationId)
      .order('created_at', { ascending: true });
    cell.replaceChildren();
    if (result.error) {
      cell.textContent = 'Gagal memuat dokumen.';
      cell.classList.add('is-error');
      return;
    }
    if (!result.data.length) {
      cell.textContent = 'Belum ada dokumen.';
      return;
    }
    const list = document.createElement('ul');
    list.className = 'admin-document-list';
    result.data.forEach(documentRecord => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${documentTypeLabel(documentRecord.document_type)}: ${documentRecord.original_name}`;
      const link = document.createElement('a');
      link.className = 'btn btn--ghost admin-document-link';
      link.textContent = 'Lihat';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Lihat ${documentRecord.original_name}`);
      link.textContent = 'Buka';
      link.addEventListener('click', async event => {
        event.preventDefault();
        link.textContent = 'Membuka...';
        const signed = await client.storage.from('registration-documents').createSignedUrl(documentRecord.file_path, 3600);
        if (signed.error) {
          link.textContent = 'Gagal';
          status.textContent = `Dokumen gagal dibuka: ${signed.error.message}`;
          status.className = 'portal-status is-error';
          return;
        }
        window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer');
        link.textContent = 'Buka';
      });
      item.appendChild(label);
      item.appendChild(link);
      list.appendChild(item);
    });
    cell.appendChild(list);
  }

  function documentTypeLabel(type) {
    return {
      foto_bersama: 'Foto bersama',
      pas_foto: 'Pas foto',
      kartu_keluarga: 'Kartu Keluarga',
      ktp_ayah: 'KTP Ayah',
      ktp_ibu: 'KTP Ibu',
      akta_kelahiran: 'Akta kelahiran'
    }[type] || type;
  }
});
