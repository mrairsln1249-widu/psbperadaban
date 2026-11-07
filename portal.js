document.addEventListener('DOMContentLoaded', async () => {
  const client = window.supabaseClient;
  const status = document.getElementById('registrationStatus');
  const notice = document.getElementById('registrationNotice');
  const noticeTitle = document.getElementById('registrationNoticeTitle');
  const noticeMessage = document.getElementById('registrationNoticeMessage');
  document.getElementById('closeRegistrationNotice').addEventListener('click', () => notice.close());
  function showRegistrationNotice(message, kind) {
    status.textContent = message;
    status.hidden = false;
    status.className = `portal-status ${kind === 'success' ? 'is-success' : kind === 'pending' ? 'is-pending' : 'is-error'}`;
    noticeTitle.textContent = kind === 'success' ? 'Berhasil' : kind === 'pending' ? 'Sedang diproses' : 'Belum berhasil';
    noticeMessage.textContent = message;
    notice.classList.toggle('is-error', kind === 'error');
    try {
      if (!notice.open && typeof notice.showModal === 'function') notice.showModal();
      else if (typeof notice.showModal !== 'function') window.alert(message);
    } catch (error) {
      window.alert(message);
    }
  }
  if (!client) {
    showRegistrationNotice('Konfigurasi Supabase belum diisi. Data pendaftaran tidak dapat disimpan.', 'error');
    return;
  }
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) { window.location.href = 'auth.html'; return; }
  const user = sessionData.session.user;
  document.getElementById('portalEmail').textContent = user.email;
  document.getElementById('logout').addEventListener('click', async () => { await client.auth.signOut(); window.location.href = 'auth.html'; });
  const profile = await client.from('profiles').select('role, whatsapp').eq('id', user.id).maybeSingle();
  if (profile.error) {
    status.textContent = `Role akun tidak dapat diperiksa: ${profile.error.message}`;
    status.className = 'portal-status is-error';
  } else if (!profile.data) {
    status.textContent = 'Profil akun tidak ditemukan di tabel profiles.';
    status.className = 'portal-status is-error';
  } else if (profile.data.role === 'admin') {
    window.location.href = 'admin.html';
    return;
  }
  const portalContact = document.getElementById('portalContact');
  const portalWhatsapp = document.getElementById('portalWhatsapp');
  const savePortalContact = document.getElementById('savePortalContact');
  const portalContactStatus = document.getElementById('portalContactStatus');
  portalWhatsapp.value = profile.data.whatsapp || '';
  portalContact.hidden = Boolean(profile.data.whatsapp);
  savePortalContact.addEventListener('click', async () => {
    const value = portalWhatsapp.value.trim();
    if (!/^(?:\+62|62|0)8[1-9][0-9]{7,12}$/.test(value.replace(/[\s-]/g, ''))) {
      portalContactStatus.textContent = 'Masukkan nomor WhatsApp aktif, misalnya 081234567890.';
      portalContactStatus.className = 'portal-contact-status is-error';
      portalWhatsapp.focus();
      return;
    }
    savePortalContact.disabled = true;
    const contactUpdate = await client.from('profiles').update({ whatsapp: value }).eq('id', user.id);
    savePortalContact.disabled = false;
    if (contactUpdate.error) {
      portalContactStatus.textContent = `Nomor belum tersimpan: ${contactUpdate.error.message}`;
      portalContactStatus.className = 'portal-contact-status is-error';
      return;
    }
    portalContactStatus.textContent = 'Nomor WhatsApp berhasil disimpan.';
    portalContactStatus.className = 'portal-contact-status is-success';
    portalContact.hidden = true;
  });
  let registration = (await client.from('registrations').select('*').eq('user_id', user.id).maybeSingle()).data;
  const form = document.getElementById('registrationForm');
  const submitVerification = document.getElementById('submitVerification');
  const saveRegistration = document.getElementById('saveRegistration');
  const registrationLockNotice = document.getElementById('registrationLockNotice');
  const documentHelpText = document.getElementById('documentHelpText');
  const documentsPanel = document.getElementById('documentsPanel');
  const portalTitle = document.getElementById('portalTitle');
  const pilihanProgram = document.getElementById('pilihanProgram');
  const pilihanProgramLabel = document.getElementById('pilihanProgramLabel');
  const editableStatuses = ['draft', 'perlu_perbaikan'];
  const completedStageStatuses = new Set([
    'menunggu_pembayaran', 'pembayaran_diperiksa', 'pembayaran_lunas',
    'siap_ujian', 'sudah_ujian', 'lulus', 'tidak_lulus', 'cadangan',
    'daftar_ulang_selesai'
  ]);
  const portalTitles = {
    draft: 'Lengkapi Pendaftaran',
    perlu_perbaikan: 'Perbaiki Data Pendaftaran',
    menunggu_verifikasi: 'Verifikasi Pendaftaran',
    terverifikasi: 'Pendaftaran Terverifikasi',
    menunggu_pembayaran: 'Persiapan Tahap Ujian',
    pembayaran_diperiksa: 'Persiapan Tahap Ujian',
    pembayaran_lunas: 'Persiapan Tahap Ujian',
    siap_ujian: 'Informasi Ujian',
    sudah_ujian: 'Menunggu Pengumuman',
    lulus: 'Hasil Seleksi',
    tidak_lulus: 'Hasil Seleksi',
    cadangan: 'Hasil Seleksi',
    daftar_ulang_selesai: 'Hasil Seleksi',
    ditolak: 'Hasil Pendaftaran'
  };
  function updatePortalTitle() {
    portalTitle.textContent = registration ? (portalTitles[registration.status] || 'Portal Pendaftar') : 'Lengkapi Pendaftaran';
  }
  function updateProgramPrompt() {
    if (!pilihanProgram) return;
    const prompts = {
      SMP: 'Keterangan kelas atau program khusus (opsional)',
      'SMA (Boarding)': 'Keterangan minat atau program asrama (opsional)',
      'Kesetaraan Paket C': 'Keterangan kebutuhan program kesetaraan (opsional)'
    };
    pilihanProgramLabel.firstChild.textContent = prompts[form.elements.jenjang.value] || 'Pilihan program/keterangan khusus (opsional)';
  }
  form.elements.jenjang.addEventListener('change', updateProgramPrompt);
  function applyRegistrationAccess() {
    updatePortalTitle();
    const editable = Boolean(registration && editableStatuses.includes(registration.status));
    const hideApplicationDetails = Boolean(registration && completedStageStatuses.has(registration.status));
    form.querySelectorAll('input, select, textarea, button').forEach(control => { control.disabled = !editable; });
    form.hidden = hideApplicationDetails;
    documentsPanel.hidden = hideApplicationDetails;
    saveRegistration.hidden = !editable;
    submitVerification.hidden = !editable;
    registrationLockNotice.hidden = editable || !registration || hideApplicationDetails;
    registrationLockNotice.textContent = registration && registration.status === 'terverifikasi'
      ? 'Pendaftaran sudah terverifikasi. Data dan dokumen dapat dilihat sebagai arsip, tetapi tidak dapat diubah.'
      : 'Pendaftaran sedang diproses. Data dan dokumen dikunci sampai admin memberikan instruksi perbaikan.';
    documentHelpText.textContent = editable
      ? 'Pastikan setiap dokumen terbaca dan sesuai ketentuan sebelum dikirim untuk verifikasi.'
      : 'Dokumen tersimpan sebagai arsip. Upload ulang tidak tersedia selama pendaftaran sedang diproses.';
  }
  if (registration) {
    Object.entries(registration).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
    const birthInfo = splitBirthInfo(registration.ttl || '');
    form.elements.tempat_lahir.value = registration.tempat_lahir || birthInfo.place;
    form.elements.tanggal_lahir.value = registration.tanggal_lahir || birthInfo.date;
  }
  updateProgramPrompt();

  function getRegistrationValues() {
    const values = Object.fromEntries(new FormData(form));
    values.ttl = `${values.tempat_lahir.trim()}, ${values.tanggal_lahir}`;
    values.nama_wali = `${values.nama_ayah.trim()} / ${values.nama_ibu.trim()}`;
    values.wa_wali = values.wa_orangtua;
    values.alamat = values.alamat_santri || '';
    values.gelombang = null;
    values.pernyataan_setuju = values.pernyataan_setuju === 'true';
    return values;
  }
  function populatePrintableRegistration() {
    const grid = document.getElementById('printableRegistrationGrid');
    const fields = [
      ['Nomor pendaftaran', registration.registration_number],
      ['Nama calon santri', registration.nama],
      ['Tempat, tanggal lahir', `${registration.tempat_lahir || '-'}, ${registration.tanggal_lahir || '-'}`],
      ['Jenis kelamin', registration.jenis_kelamin],
      ['Agama', registration.agama],
      ['Program/jenjang', registration.jenjang],
      ['Asal sekolah', registration.asal_sekolah],
      ['Alamat lengkap', registration.alamat_santri || registration.alamat],
      ['RT/RW', registration.alamat_rt_rw],
      ['Kelurahan/Desa', registration.kelurahan],
      ['Kecamatan', registration.kecamatan],
      ['Kabupaten/Kota', registration.kabupaten_kota],
      ['Nomor HP/WA santri', registration.wa_santri],
      ['Nama ayah', registration.nama_ayah || registration.nama_wali],
      ['Nama ibu', registration.nama_ibu],
      ['Nomor HP/WA orang tua', registration.wa_orangtua || registration.wa_wali],
      ['Instagram', registration.instagram],
      ['YouTube', registration.youtube],
      ['TikTok', registration.tiktok],
      ['Motivasi santri', registration.motivasi_santri],
      ['Motivasi orang tua/wali', registration.motivasi_orangtua]
    ];
    grid.innerHTML = '';
    fields.forEach(([label, value]) => {
      const item = document.createElement('div');
      item.className = 'printable-registration__item';
      item.innerHTML = `<span>${label}</span><strong>${String(value || '-').replace(/[<>&"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[character]))}</strong>`;
      grid.appendChild(item);
    });
  }
  function printRegistrationForm() {
    populatePrintableRegistration();
    document.body.classList.add('print-registration');
    window.print();
    window.setTimeout(() => document.body.classList.remove('print-registration'), 500);
  }

  function splitBirthInfo(value) {
    const separator = value.lastIndexOf(',');
    if (separator < 0) return { place: value, date: '' };
    return {
      place: value.slice(0, separator).trim(),
      date: toDateInputValue(value.slice(separator + 1).trim())
    };
  }

  function toDateInputValue(value) {
    const dateParts = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dateParts) return makeDateInputValue(dateParts[3], dateParts[2], dateParts[1]);

    const namedMonthParts = value.toLocaleLowerCase('id').match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
    if (namedMonthParts) {
      const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
      const month = months.indexOf(namedMonthParts[2]) + 1;
      if (month) return makeDateInputValue(namedMonthParts[3], month, namedMonthParts[1]);
    }

    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDate) return makeDateInputValue(isoDate[1], isoDate[2], isoDate[3]);
    return '';
  }

  function makeDateInputValue(year, month, day) {
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      showRegistrationNotice('Draft gagal disimpan. Lengkapi semua data wajib terlebih dahulu.', 'error');
      return;
    }
    saveRegistration.disabled = true;
    showRegistrationNotice('Draft sedang disimpan. Mohon tunggu...', 'pending');
    let result;
    try {
      const values = getRegistrationValues();
      result = registration
        ? await client.from('registrations').update(values).eq('id', registration.id).select().single()
        : await client.from('registrations').insert({ ...values, user_id: user.id, status: 'draft' }).select().single();
    } catch (error) {
      saveRegistration.disabled = false;
      showRegistrationNotice(`Draft gagal disimpan: ${error.message || error}`, 'error');
      return;
    }
    if (result.error) {
      saveRegistration.disabled = false;
      showRegistrationNotice(`Draft gagal disimpan: ${result.error.message}`, 'error');
      return;
    }
    registration = result.data;
    saveRegistration.disabled = false;
    showRegistrationNotice(`Draft berhasil disimpan. Nomor pendaftaran: ${registration.registration_number}`, 'success');
    renderStatus();
    renderDocuments();
  });

  submitVerification.addEventListener('click', async () => {
    if (!registration) {
      showRegistrationNotice('Verifikasi belum dapat dikirim. Simpan draft pendaftaran terlebih dahulu.', 'error');
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      showRegistrationNotice('Verifikasi belum dapat dikirim. Lengkapi semua data wajib terlebih dahulu.', 'error');
      return;
    }
    const values = getRegistrationValues();
    const requiredFields = [
      'nama', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'asal_sekolah', 'jenjang',
      'agama', 'alamat_rt_rw', 'kelurahan', 'kecamatan', 'kabupaten_kota',
      'wa_santri', 'nama_ayah', 'nama_ibu', 'wa_orangtua', 'alamat_orangtua',
      'sumber_informasi', 'motivasi_santri', 'motivasi_orangtua',
      'nilai_rapor_semester_1', 'nilai_rapor_semester_2', 'nilai_rapor_semester_3',
      'nilai_rapor_semester_4', 'nilai_rapor_semester_5', 'pernyataan_setuju'
    ];
    if (requiredFields.some(field => values[field] == null || String(values[field]).trim() === '')) {
      showRegistrationNotice('Verifikasi belum dapat dikirim. Lengkapi semua data wajib terlebih dahulu.', 'error');
      return;
    }
    let documents;
    try {
      documents = await client.from('registration_documents').select('document_type').eq('registration_id', registration.id);
    } catch (error) {
      showRegistrationNotice(`Dokumen pendaftaran gagal diperiksa: ${error.message || error}`, 'error');
      return;
    }
    if (documents.error) {
      showRegistrationNotice(`Dokumen pendaftaran gagal diperiksa: ${documents.error.message}`, 'error');
      return;
    }
    if (!['foto_bersama', 'pas_foto', 'kartu_keluarga', 'ktp_ayah', 'ktp_ibu', 'akta_kelahiran'].every(type => (documents.data || []).some(document => document.document_type === type))) {
      showRegistrationNotice('Verifikasi belum dapat dikirim. Upload foto bersama, pas foto, KK, KTP ayah dan ibu, serta akta kelahiran terlebih dahulu.', 'error');
      return;
    }
    submitVerification.disabled = true;
    saveRegistration.disabled = true;
    showRegistrationNotice('Pendaftaran sedang dikirim untuk verifikasi. Mohon tunggu...', 'pending');
    let result;
    try {
      result = await client.from('registrations').update({ ...values, status: 'menunggu_verifikasi' }).eq('id', registration.id).select().single();
    } catch (error) {
      submitVerification.disabled = false;
      saveRegistration.disabled = false;
      showRegistrationNotice(`Pendaftaran gagal dikirim untuk verifikasi: ${error.message || error}`, 'error');
      return;
    }
    if (result.error) {
      submitVerification.disabled = false;
      saveRegistration.disabled = false;
      showRegistrationNotice(`Pendaftaran gagal dikirim untuk verifikasi: ${result.error.message}`, 'error');
      return;
    }
    registration = result.data;
    showRegistrationNotice('Pendaftaran berhasil dikirim dan sedang menunggu verifikasi admin.', 'success');
    saveRegistration.disabled = true;
    submitVerification.disabled = true;
    renderStatus();
  });

  function renderStatus() {
    const steps = [
      ['draft', 'Draft'], ['menunggu_verifikasi', 'Verifikasi'],
      ['siap_ujian', 'Ujian'], ['lulus', 'Pengumuman']
    ];
    const statusStage = {
      draft: 0,
      perlu_perbaikan: 0,
      menunggu_verifikasi: 1,
      terverifikasi: 1,
      menunggu_pembayaran: 2,
      pembayaran_diperiksa: 2,
      pembayaran_lunas: 2,
      siap_ujian: 2,
      sudah_ujian: 2,
      lulus: 3,
      tidak_lulus: 3,
      cadangan: 3,
      daftar_ulang_selesai: 3,
      ditolak: 1
    };
    const currentIndex = statusStage[registration.status] ?? 0;
    const statusLabels = {
      draft: 'Draft',
      perlu_perbaikan: 'Perlu Perbaikan',
      menunggu_verifikasi: 'Menunggu Verifikasi Admin',
      terverifikasi: 'Terverifikasi',
      menunggu_pembayaran: 'Menuju Ujian',
      pembayaran_diperiksa: 'Menuju Ujian',
      pembayaran_lunas: 'Menuju Ujian',
      siap_ujian: 'Siap Mengikuti Ujian',
      sudah_ujian: 'Ujian Selesai',
      lulus: 'Lulus',
      tidak_lulus: 'Tidak Lulus',
      cadangan: 'Daftar Cadangan',
      daftar_ulang_selesai: 'Daftar Ulang Selesai',
      ditolak: 'Ditolak'
    };
    const statusMessages = {
      draft: 'Silakan lengkapi data dan dokumen, lalu kirim untuk verifikasi admin.',
      perlu_perbaikan: 'Ada data atau dokumen yang perlu diperbaiki. Ikuti catatan admin sebelum mengirim ulang.',
      menunggu_verifikasi: 'Data dan dokumen sedang diperiksa oleh admin. Mohon menunggu informasi berikutnya di portal ini.',
      terverifikasi: 'Selamat! Administrasi pendaftaran Anda sudah sesuai dan telah terverifikasi. Silakan menunggu jadwal ujian yang akan diinformasikan melalui portal ini.',
      menunggu_pembayaran: 'Administrasi telah diproses. Informasi tahapan ujian akan diinformasikan melalui portal ini.',
      pembayaran_diperiksa: 'Data administrasi sedang diproses. Informasi tahapan ujian akan diinformasikan melalui portal ini.',
      pembayaran_lunas: 'Anda siap melanjutkan ke tahap ujian. Jadwal dan informasi pelaksanaan akan diinformasikan melalui portal ini.',
      siap_ujian: 'Anda siap mengikuti ujian. Silakan pantau portal ini untuk jadwal dan petunjuk pelaksanaan.',
      sudah_ujian: 'Ujian telah tercatat selesai. Silakan menunggu pengumuman hasil melalui portal ini.',
      lulus: 'Selamat! Anda dinyatakan lulus. Informasi daftar ulang akan disampaikan melalui portal ini.',
      tidak_lulus: 'Terima kasih telah mengikuti proses seleksi. Informasi ini merupakan hasil akhir pendaftaran Anda.',
      cadangan: 'Anda masuk dalam daftar cadangan. Silakan pantau portal ini untuk informasi perkembangan selanjutnya.',
      daftar_ulang_selesai: 'Selamat! Proses daftar ulang Anda telah selesai.',
      ditolak: 'Pendaftaran belum dapat dilanjutkan. Silakan periksa catatan admin atau hubungi panitia jika memerlukan informasi lebih lanjut.'
    };
    const statusSummary = document.getElementById('registrationStatusSummary');
    const registrationSectionTitle = document.getElementById('registrationSectionTitle');
    const statusMessage = document.getElementById('registrationStatusMessage');
    const resultCard = document.getElementById('resultCard');
    const examInfo = document.getElementById('examInfo');
    const announcementStatuses = new Set(['lulus', 'tidak_lulus', 'cadangan', 'daftar_ulang_selesai']);
    const resultContent = {
      lulus: {
        title: `Selamat Ananda ${registration.nama || ''}, Anda Lulus Menjadi Santri Pesantren Peradaban`,
        message: 'Selamat atas pencapaian Anda. Anda berhasil menyelesaikan proses seleksi PSB Pesantren Peradaban.',
        next: 'Silakan menunggu informasi daftar ulang yang akan disampaikan melalui portal ini.'
      },
      tidak_lulus: {
        title: 'Hasil Seleksi',
        message: 'Mohon maaf, Anda belum berhasil pada seleksi penerimaan santri baru tahun ini.',
        next: 'Terima kasih atas kepercayaan dan partisipasi Anda dalam proses seleksi PSB Pesantren Peradaban.'
      },
      cadangan: {
        title: 'Anda Masuk Daftar Cadangan',
        message: 'Hasil seleksi Anda saat ini tercatat sebagai peserta daftar cadangan.',
        next: 'Silakan pantau portal ini untuk informasi perkembangan dan instruksi selanjutnya.'
      },
      daftar_ulang_selesai: {
        title: 'Daftar Ulang Berhasil',
        message: 'Selamat, proses daftar ulang Anda di Pesantren Peradaban telah selesai.',
        next: 'Terima kasih. Informasi kegiatan berikutnya akan disampaikan melalui portal ini.'
      }
    };
    statusSummary.textContent = `Status pendaftaran: ${statusLabels[registration.status] || registration.status}`;
    statusSummary.className = `status-summary status-summary--${registration.status}`;
    statusMessage.textContent = statusMessages[registration.status] || 'Silakan pantau portal ini untuk informasi terbaru mengenai pendaftaran Anda.';
    statusMessage.className = `status-message status-message--${registration.status}`;
    const isAnnouncement = announcementStatuses.has(registration.status);
    registrationSectionTitle.hidden = isAnnouncement;
    statusSummary.hidden = isAnnouncement;
    document.getElementById('statusStepper').hidden = isAnnouncement;
    resultCard.hidden = !isAnnouncement;
    statusMessage.hidden = isAnnouncement;
    resultCard.className = `result-card result-card--${registration.status}`;
    if (isAnnouncement) {
      const result = resultContent[registration.status];
      let badge = document.getElementById('resultBadge');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'resultBadge';
        badge.className = 'result-card__badge';
        resultCard.querySelector('.result-card__eyebrow').after(badge);
      }
      badge.textContent = registration.status === 'lulus' || registration.status === 'daftar_ulang_selesai'
        ? 'DITERIMA'
        : registration.status === 'cadangan' ? 'DAFTAR CADANGAN' : 'HASIL SELEKSI';
      document.getElementById('resultTitle').textContent = result.title;
      let subtitle = document.getElementById('resultSubtitle');
      if (!subtitle) {
        subtitle = document.createElement('div');
        subtitle.id = 'resultSubtitle';
        subtitle.className = 'result-card__subtitle';
        document.getElementById('resultTitle').after(subtitle);
      }
      subtitle.textContent = registration.status === 'lulus'
        ? 'Sebagai Santri Pesantren Peradaban'
        : '';
      document.getElementById('resultMessage').textContent = result.message;
      document.getElementById('resultName').textContent = registration.nama || '-';
      document.getElementById('resultNumber').textContent = registration.registration_number || '-';
      document.getElementById('resultProgram').textContent = registration.jenjang || '-';
      document.getElementById('resultNext').textContent = result.next;
      let printButton = document.getElementById('printResult');
      if (!printButton) {
        printButton = document.createElement('button');
        printButton.id = 'printResult';
        printButton.type = 'button';
        printButton.className = 'btn btn--gold';
        printButton.textContent = 'Cetak Hasil Seleksi';
        printButton.addEventListener('click', () => window.print());
        document.getElementById('resultNext').after(printButton);
      }
      if (registration.status === 'lulus' && !document.getElementById('printRegistrationForm')) {
        const formButton = document.createElement('button');
        formButton.id = 'printRegistrationForm';
        formButton.type = 'button';
        formButton.className = 'btn btn--gold';
        formButton.textContent = 'Unduh Formulir';
        formButton.addEventListener('click', printRegistrationForm);
        printButton.after(formButton);
      }
    }
    examInfo.hidden = registration.status !== 'siap_ujian' || !registration.tanggal_ujian;
    examInfo.innerHTML = '';
    if (!examInfo.hidden) {
      const title = document.createElement('strong');
      title.textContent = 'Informasi Ujian';
      const date = document.createElement('p');
      date.textContent = `Tanggal ujian: ${new Date(`${registration.tanggal_ujian}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'full' })}`;
      examInfo.append(title, date);
      if (registration.url_ujian) {
        const link = document.createElement('a');
        link.href = registration.url_ujian;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Buka portal CBT';
        link.className = 'btn btn--primary';
        examInfo.appendChild(link);
      }
      if (registration.cbt_username && registration.cbt_password) {
        const credentials = document.createElement('div');
        credentials.className = 'cbt-credentials';
        credentials.innerHTML = '<strong>Akses CBT sementara</strong>';
        const username = document.createElement('p');
        username.textContent = `Username/email: ${registration.cbt_username}`;
        const password = document.createElement('p');
        password.textContent = `Password sementara: ${registration.cbt_password}`;
        const note = document.createElement('small');
        note.textContent = 'Gunakan kredensial ini setelah admin selesai membuat akun Moodle. Segera ganti password saat login pertama.';
        credentials.append(username, password, note);
        examInfo.appendChild(credentials);
      }
    }
    document.getElementById('statusStepper').innerHTML = steps.map((step, index) => {
      const state = index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : '';
      return `<span class="status-step ${state}">${step[1]}</span>`;
    }).join('');
    const revisionNote = document.getElementById('revisionNote');
    revisionNote.hidden = registration.status !== 'perlu_perbaikan' || !registration.catatan;
    revisionNote.textContent = registration.status === 'perlu_perbaikan' && registration.catatan
      ? `Catatan perbaikan dari admin: ${registration.catatan}`
      : '';
    applyRegistrationAccess();
  }

  function renderDocuments() {
    if (!registration) return;
    const types = [
      ['foto_bersama', 'Foto Calon Santri bersama Orang Tua/Wali *', true, 'image/*', 'Foto calon santri bersama orang tua/wali.'],
      ['pas_foto', 'Foto warna 3x4 latar merah *', true, 'image/*', ''],
      ['kartu_keluarga', 'Scan Kartu Keluarga *', true, 'application/pdf,image/*', ''],
      ['ktp_ayah', 'Scan KTP Ayah *', true, 'application/pdf,image/*', 'Maksimal 1 file.'],
      ['ktp_ibu', 'Scan KTP Ibu *', true, 'application/pdf,image/*', ''],
      ['akta_kelahiran', 'Scan Akte Lahir *', true, 'application/pdf,image/*', '']
    ];
    const container = document.getElementById('documents');
    container.innerHTML = '';
    types.forEach(([type, label, required, accept, helpText]) => {
      const row = document.createElement('label');
      row.className = 'document-row';
      row.innerHTML = `<strong>${label}${required ? '' : ' (opsional)'}</strong><input type="file" accept="${accept}" data-type="${type}"><small>${helpText ? `${helpText} ` : ''}Format: ${formatAcceptedTypes(accept)}. Batas gambar 1 MB, PDF 1,5 MB. Upload ulang akan menggantikan file lama.</small><span class="document-status" role="status" aria-live="polite"></span>`;
      const input = row.querySelector('input');
      input.disabled = !editableStatuses.includes(registration.status);
      input.addEventListener('change', event => uploadDocument(input, type, accept, row.querySelector('.document-status')));
      container.appendChild(row);
    });
  }
  function formatAcceptedTypes(accept) {
    return accept.split(',').map(type => type === 'image/*' ? 'JPG, PNG, atau gambar' : 'PDF').join(' atau ');
  }
  async function uploadDocument(input, type, accept, documentStatus) {
    const files = Array.from(input.files || []);
    if (!files.length || !registration || !editableStatuses.includes(registration.status)) return;
    const setDocumentStatus = (message, kind) => {
      documentStatus.textContent = message;
      documentStatus.className = `document-status is-${kind}`;
    };
    const acceptedTypes = accept.split(',');
    if (files.some(file => !acceptedTypes.some(accepted => accepted === 'image/*' ? file.type.startsWith('image/') : file.type === accepted))) {
      input.value = '';
      setDocumentStatus(`Gagal: format tidak sesuai. Gunakan ${formatAcceptedTypes(accept)}.`, 'error');
      return;
    }
    if (files.length > 1) {
      input.value = '';
      setDocumentStatus('Gagal: satu dokumen hanya boleh memiliki satu file.', 'error');
      return;
    }
    setDocumentStatus('Sedang mengunggah...', 'pending');
    let preparedFile;
    try {
      preparedFile = await prepareUploadFile(files[0]);
    } catch (error) {
      input.value = '';
      setDocumentStatus(`Gagal menyiapkan file: ${error.message}`, 'error');
      return;
    }
    const existing = await client.from('registration_documents').select('file_path').eq('registration_id', registration.id).eq('document_type', type);
    if (existing.error) {
      setDocumentStatus(`Gagal: ${existing.error.message}`, 'error');
      return;
    }
    const path = getDocumentPath(type, preparedFile);
    const upload = await client.storage.from('registration-documents').upload(path, preparedFile, { upsert: true, contentType: preparedFile.type });
    if (upload.error) {
      setDocumentStatus(`Gagal mengunggah: ${upload.error.message}`, 'error');
      return;
    }
    const oldPaths = (existing.data || []).map(document => document.file_path).filter(oldPath => oldPath !== path);
    if (oldPaths.length) {
      const removed = await client.storage.from('registration-documents').remove(oldPaths);
      if (removed.error) {
        setDocumentStatus(`File baru berhasil diunggah, tetapi file lama belum terhapus: ${removed.error.message}`, 'error');
        return;
      }
      const deleted = await client.from('registration_documents').delete().eq('registration_id', registration.id).eq('document_type', type);
      if (deleted.error) {
        setDocumentStatus(`File baru berhasil diunggah, tetapi data file lama belum terhapus: ${deleted.error.message}`, 'error');
        return;
      }
    }
    const saved = await client.from('registration_documents').upsert(
      { registration_id: registration.id, user_id: user.id, document_type: type, file_path: path, original_name: files[0].name },
      { onConflict: 'registration_id,document_type,file_path' }
    );
    if (saved.error) {
      setDocumentStatus(`Gagal menyimpan data file: ${saved.error.message}`, 'error');
      return;
    }
    setDocumentStatus(`Berhasil diunggah: ${formatBytes(preparedFile.size)}.`, 'success');
  }
  async function prepareUploadFile(file) {
    if (file.type === 'application/pdf') {
      if (file.size > 1.5 * 1024 * 1024) throw new Error('PDF maksimal 1,5 MB.');
      return file;
    }
    if (!file.type.startsWith('image/')) throw new Error('Gunakan file PDF atau gambar.');
    return compressImage(file, 1024 * 1024);
  }
  function compressImage(file, maxBytes) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const attempt = (quality, width, height) => {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(image, 0, 0, width, height);
          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Gambar tidak dapat diproses.'));
              return;
            }
            if (blob.size <= maxBytes || quality <= 0.55) {
              if (blob.size > maxBytes) {
                reject(new Error('Gambar tetap melebihi 1 MB setelah dikompres.'));
                return;
              }
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              return;
            }
            attempt(quality - 0.1, Math.round(width * 0.85), Math.round(height * 0.85));
          }, 'image/jpeg', quality);
        };
        attempt(0.82, canvas.width, canvas.height);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Gambar tidak dapat dibaca.'));
      };
      image.src = objectUrl;
    });
  }
  function formatBytes(bytes) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  function getDocumentPath(type, file) {
    return `${user.id}/${registration.id}/${type}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  }
  if (registration) {
    renderStatus();
    renderDocuments();
    client.channel(`registration-status-${registration.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'registrations',
        filter: `id=eq.${registration.id}`
      }, payload => {
        registration = { ...registration, ...payload.new };
        renderStatus();
        renderDocuments();
      })
      .subscribe();
  } else {
    applyRegistrationAccess();
  }
});
