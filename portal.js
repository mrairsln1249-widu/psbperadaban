document.addEventListener('DOMContentLoaded', async () => {
  const client = window.supabaseClient;
  const status = document.getElementById('registrationStatus');
  if (!client) { status.textContent = 'Konfigurasi Supabase belum diisi.'; status.className = 'portal-status is-error'; return; }
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) { window.location.href = 'auth.html'; return; }
  const user = sessionData.session.user;
  document.getElementById('portalEmail').textContent = user.email;
  document.getElementById('logout').addEventListener('click', async () => { await client.auth.signOut(); window.location.href = 'auth.html'; });
  let registration = (await client.from('registrations').select('*').eq('user_id', user.id).maybeSingle()).data;
  const form = document.getElementById('registrationForm');
  const submitVerification = document.getElementById('submitVerification');
  const saveRegistration = document.getElementById('saveRegistration');
  if (registration) Object.entries(registration).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value || ''; });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const result = registration
      ? await client.from('registrations').update(values).eq('id', registration.id).select().single()
      : await client.from('registrations').insert({ ...values, user_id: user.id, status: 'draft' }).select().single();
    if (result.error) { status.textContent = result.error.message; status.className = 'portal-status is-error'; return; }
    registration = result.data;
    status.textContent = `Data tersimpan. Nomor pendaftaran: ${registration.registration_number}`;
    status.className = 'portal-status is-success';
    renderStatus();
    renderDocuments();
  });

  submitVerification.addEventListener('click', async () => {
    if (!registration) {
      status.textContent = 'Simpan data pendaftaran terlebih dahulu.';
      status.className = 'portal-status is-error';
      return;
    }
    const values = Object.fromEntries(new FormData(form));
    const requiredFields = ['nama', 'ttl', 'jenjang', 'asal_sekolah', 'gelombang', 'nama_wali', 'wa_wali', 'alamat'];
    if (requiredFields.some(field => !String(values[field] || '').trim())) {
      status.textContent = 'Lengkapi semua data wajib sebelum dikirim untuk verifikasi.';
      status.className = 'portal-status is-error';
      return;
    }
    const documents = await client.from('registration_documents').select('document_type').eq('registration_id', registration.id);
    if (!['pas_foto', 'kartu_keluarga', 'akta_kelahiran'].every(type => (documents.data || []).some(document => document.document_type === type))) {
      status.textContent = 'Upload pas foto, KK, dan akta kelahiran terlebih dahulu.';
      status.className = 'portal-status is-error';
      return;
    }
    const result = await client.from('registrations').update({ ...values, status: 'menunggu_verifikasi' }).eq('id', registration.id).select().single();
    if (result.error) {
      status.textContent = result.error.message;
      status.className = 'portal-status is-error';
      return;
    }
    registration = result.data;
    status.textContent = 'Pendaftaran dikirim. Menunggu verifikasi admin.';
    status.className = 'portal-status is-success';
    saveRegistration.disabled = true;
    submitVerification.disabled = true;
    renderStatus();
  });

  function renderStatus() {
    const steps = [
      ['draft', 'Draft'], ['menunggu_verifikasi', 'Verifikasi'], ['menunggu_pembayaran', 'Pembayaran'],
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
      siap_ujian: 3,
      sudah_ujian: 3,
      lulus: 4,
      tidak_lulus: 4,
      cadangan: 4,
      daftar_ulang_selesai: 4,
      ditolak: 1
    };
    const currentIndex = statusStage[registration.status] ?? 0;
    document.getElementById('statusStepper').innerHTML = steps.map((step, index) => {
      const state = index < currentIndex ? 'is-done' : index === currentIndex ? 'is-current' : '';
      return `<span class="status-step ${state}">${step[1]}</span>`;
    }).join('');
  }

  function renderDocuments() {
    if (!registration) return;
    const types = [
      ['pas_foto', 'Pas foto', true, 'image/jpeg,image/png,image/webp'],
      ['kartu_keluarga', 'Kartu Keluarga', true, 'application/pdf,image/jpeg,image/png'],
      ['akta_kelahiran', 'Akta kelahiran', true, 'application/pdf,image/jpeg,image/png'],
      ['rapor', 'Rapor terakhir', false, 'application/pdf,image/jpeg,image/png'],
      ['ijazah', 'Ijazah terakhir', false, 'application/pdf,image/jpeg,image/png']
    ];
    const container = document.getElementById('documents');
    container.innerHTML = '';
    types.forEach(([type, label, required, accept]) => {
      const row = document.createElement('label');
      row.className = 'document-row';
      row.innerHTML = `<strong>${label}${required ? ' *' : ' (opsional)'}</strong><input type="file" accept="${accept}" data-type="${type}" ${required ? 'required' : ''}><small>Maksimal 2 MB per file.</small>`;
      row.querySelector('input').addEventListener('change', event => uploadDocument(event.target, type, required));
      container.appendChild(row);
    });
  }
  async function uploadDocument(input, type, required) {
    const file = input.files[0];
    if (!file || !registration) return;
    if (file.size > 2 * 1024 * 1024) { input.value = ''; status.textContent = 'Ukuran file maksimal 2 MB.'; status.className = 'portal-status is-error'; return; }
    const path = `${user.id}/${registration.id}/${type}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const upload = await client.storage.from('registration-documents').upload(path, file, { upsert: true });
    if (upload.error) { status.textContent = upload.error.message; status.className = 'portal-status is-error'; return; }
    const saved = await client.from('registration_documents').upsert({ registration_id: registration.id, user_id: user.id, document_type: type, file_path: path, original_name: file.name }, { onConflict: 'registration_id,document_type' });
    if (saved.error) { status.textContent = saved.error.message; status.className = 'portal-status is-error'; return; }
    status.textContent = `${required ? 'Dokumen wajib' : 'Dokumen'} ${file.name} berhasil diunggah.`;
    status.className = 'portal-status is-success';
  }
  if (registration) {
    renderStatus();
    renderDocuments();
    const locked = !['draft', 'perlu_perbaikan'].includes(registration.status);
    saveRegistration.disabled = locked;
    submitVerification.disabled = locked;
  }
});
