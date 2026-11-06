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
  const profile = await client.from('profiles').select('role').eq('id', user.id).maybeSingle();
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
  let registration = (await client.from('registrations').select('*').eq('user_id', user.id).maybeSingle()).data;
  const form = document.getElementById('registrationForm');
  const submitVerification = document.getElementById('submitVerification');
  const saveRegistration = document.getElementById('saveRegistration');
  if (registration) {
    Object.entries(registration).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
    const birthInfo = splitBirthInfo(registration.ttl || '');
    form.elements.tempat_lahir.value = registration.tempat_lahir || birthInfo.place;
    form.elements.tanggal_lahir.value = registration.tanggal_lahir || birthInfo.date;
  }

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
    document.getElementById('statusStepper').innerHTML = steps.map((step, index) => {
      const state = index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : '';
      return `<span class="status-step ${state}">${step[1]}</span>`;
    }).join('');
    const revisionNote = document.getElementById('revisionNote');
    revisionNote.hidden = registration.status !== 'perlu_perbaikan' || !registration.catatan;
    revisionNote.textContent = registration.status === 'perlu_perbaikan' && registration.catatan
      ? `Catatan perbaikan dari admin: ${registration.catatan}`
      : '';
  }

  function renderDocuments() {
    if (!registration) return;
    const types = [
      ['foto_bersama', 'Foto Calon Santri bersama Orang Tua/Wali *', true, 'image/*', 2, false, 'Foto calon santri bersama orang tua/wali.'],
      ['pas_foto', 'Foto warna 3x4 latar merah *', true, 'image/*', 2, false, ''],
      ['kartu_keluarga', 'Scan Kartu Keluarga *', true, 'application/pdf,image/*', 2, false, ''],
      ['ktp_ayah', 'Scan KTP Ayah *', true, 'application/pdf,image/*', 2, true, 'Maksimal 5 file.'],
      ['ktp_ibu', 'Scan KTP Ibu *', true, 'application/pdf,image/*', 2, false, ''],
      ['akta_kelahiran', 'Scan Akte Lahir *', true, 'application/pdf,image/*', 2, false, '']
    ];
    const container = document.getElementById('documents');
    container.innerHTML = '';
    types.forEach(([type, label, required, accept, maxSizeMb, multiple, helpText]) => {
      const row = document.createElement('label');
      row.className = 'document-row';
      row.innerHTML = `<strong>${label}${required ? '' : ' (opsional)'}</strong><input type="file" accept="${accept}" data-type="${type}" ${multiple ? 'multiple' : ''}><small>${helpText ? `${helpText} ` : ''}Format: ${formatAcceptedTypes(accept)}. Maksimal ${maxSizeMb} MB per file${multiple ? '; maksimal 5 file.' : '.'}</small><span class="document-status" role="status" aria-live="polite"></span>`;
      const input = row.querySelector('input');
      input.addEventListener('change', event => uploadDocument(input, type, maxSizeMb, multiple, accept, row.querySelector('.document-status')));
      container.appendChild(row);
    });
  }
  function formatAcceptedTypes(accept) {
    return accept.split(',').map(type => type === 'image/*' ? 'JPG, PNG, atau gambar' : 'PDF').join(' atau ');
  }
  async function uploadDocument(input, type, maxSizeMb, multiple, accept, documentStatus) {
    const files = Array.from(input.files || []);
    if (!files.length || !registration) return;
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
    if (files.some(file => file.size > maxSizeMb * 1024 * 1024)) {
      input.value = '';
      setDocumentStatus(`Gagal: ukuran file melebihi ${maxSizeMb} MB.`, 'error');
      return;
    }
    if (multiple && files.length > 5) {
      input.value = '';
      setDocumentStatus('Gagal: KTP Ayah maksimal 5 file.', 'error');
      return;
    }
    setDocumentStatus('Sedang mengunggah...', 'pending');
    const existing = multiple
      ? await client.from('registration_documents').select('file_path').eq('registration_id', registration.id).eq('document_type', type)
      : { data: [], error: null };
    if (existing.error) {
      setDocumentStatus(`Gagal: ${existing.error.message}`, 'error');
      return;
    }
    const paths = files.map(file => getDocumentPath(type, file));
    if (multiple && new Set([...(existing.data || []).map(document => document.file_path), ...paths]).size > 5) {
      input.value = '';
      setDocumentStatus('Gagal: jumlah file KTP Ayah maksimal 5.', 'error');
      return;
    }
    for (const [index, file] of files.entries()) {
      const path = paths[index];
      const upload = await client.storage.from('registration-documents').upload(path, file, { upsert: true });
      if (upload.error) {
        setDocumentStatus(`Gagal mengunggah: ${upload.error.message}`, 'error');
        return;
      }
      const saved = await client.from('registration_documents').upsert(
        { registration_id: registration.id, user_id: user.id, document_type: type, file_path: path, original_name: file.name },
        { onConflict: 'registration_id,document_type,file_path' }
      );
      if (saved.error) {
        setDocumentStatus(`Gagal menyimpan data file: ${saved.error.message}`, 'error');
        return;
      }
    }
    setDocumentStatus(`${files.length} file berhasil diunggah.`, 'success');
  }
  function getDocumentPath(type, file) {
    return `${user.id}/${registration.id}/${type}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  }
  if (registration) {
    renderStatus();
    renderDocuments();
    const locked = !['draft', 'perlu_perbaikan'].includes(registration.status);
    saveRegistration.disabled = locked;
    submitVerification.disabled = locked;
  }
});
