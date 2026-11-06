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
  const editableStatuses = ['draft', 'perlu_perbaikan'];
  function applyRegistrationAccess() {
    const editable = Boolean(registration && editableStatuses.includes(registration.status));
    form.querySelectorAll('input, select, textarea, button').forEach(control => { control.disabled = !editable; });
    saveRegistration.hidden = !editable;
    submitVerification.hidden = !editable;
    registrationLockNotice.hidden = editable || !registration;
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
    const statusSummary = document.getElementById('registrationStatusSummary');
    statusSummary.textContent = `Status pendaftaran: ${statusLabels[registration.status] || registration.status}`;
    statusSummary.className = `status-summary status-summary--${registration.status}`;
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
