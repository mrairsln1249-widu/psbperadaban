const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'chat-feedback.json');

app.use(express.json({ limit: '100kb' }));
app.use(express.static(ROOT_DIR));

const registrationFields = [
  'nama',
  'ttl',
  'jenjang',
  'asal_sekolah',
  'gelombang',
  'nama_wali',
  'wa_wali',
  'alamat',
];

const allowedJenjang = new Set(['MTs', 'MA']);
const allowedGelombang = new Set([
  'Gelombang 1 (Diskon 30%)',
  'Gelombang 2',
  'Gelombang 3',
]);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function appendJson(file, value) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const items = await readJson(file, []);
  items.push(value);
  await fs.writeFile(file, JSON.stringify(items, null, 2));
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validateRegistration(body) {
  const data = Object.fromEntries(
    registrationFields.map((field) => [field, cleanText(body[field], 200)])
  );
  data.catatan = cleanText(body.catatan, 500);

  const missing = registrationFields.filter((field) => !data[field]);
  if (missing.length) {
    return { error: `Field wajib belum lengkap: ${missing.join(', ')}` };
  }
  if (!allowedJenjang.has(data.jenjang)) {
    return { error: 'Jenjang yang dipilih tidak valid.' };
  }
  if (!allowedGelombang.has(data.gelombang)) {
    return { error: 'Gelombang yang dipilih tidak valid.' };
  }
  if (!/^(?:\+62|0)8[1-9][0-9]{7,11}$/.test(data.wa_wali.replace(/[\s-]/g, ''))) {
    return { error: 'Nomor WhatsApp wali tidak valid.' };
  }
  return { data };
}

const chatbotAnswers = {
  biaya:
    'Biaya pendaftaran <b>Gelombang 1: Rp 350.000</b>.<br><br>Rincian biaya pendidikan: Rp 6.500.000/tahun.<br>Biaya asrama: Rp 4.800.000/tahun.<br><br>Tersedia beasiswa hingga 100% untuk santri berprestasi dan yatim.',
  syarat:
    'Dokumen yang perlu disiapkan (diunggah online):<br>1. Fotokopi Kartu Keluarga (KK)<br>2. Akta Kelahiran<br>3. Pas Foto 3x4<br>4. Rapor terakhir<br>5. Surat izin orang tua (jika diperlukan)',
  alur:
    'Alur pendaftaran:<br>1. Registrasi Akun<br>2. Isi Formulir Online<br>3. Unggah Berkas<br>4. Bayar Biaya Pendaftaran<br>5. Ikuti Tes Seleksi<br>6. Pengumuman Kelulusan',
  program:
    "Program unggulan:<br>1. Tahfiz Al-Qur'an<br>2. Sains & Riset<br>3. Bahasa Asing<br>4. Adab & Kepemimpinan.<br><br>Fasilitas: Asrama, Lab, Perpustakaan, Lingkungan Islami.",
};

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'psb-pesantren-peradaban' });
});

app.post('/api/registrations', async (req, res, next) => {
  try {
    const result = validateRegistration(req.body);
    if (result.error) return res.status(400).json({ message: result.error });

    const registration = {
      id: `PSB-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      ...result.data,
      status: 'terdaftar',
      createdAt: new Date().toISOString(),
    };
    await appendJson(REGISTRATIONS_FILE, registration);
    return res.status(201).json({
      message: 'Pendaftaran berhasil disimpan.',
      registration: {
        id: registration.id,
        status: registration.status,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/chatbot', (req, res) => {
  const message = cleanText(req.body.message, 500).toLowerCase();
  if (!message) return res.status(400).json({ message: 'Pertanyaan tidak boleh kosong.' });

  let answer =
    'Terima kasih atas pertanyaannya. Untuk informasi yang lebih spesifik, silakan hubungi admin melalui WhatsApp.';
  if (/(biaya|harga|bayar|uang)/.test(message)) answer = chatbotAnswers.biaya;
  else if (/(syarat|berkas|dokumen)/.test(message)) answer = chatbotAnswers.syarat;
  else if (/(alur|daftar|pendaftaran|registrasi)/.test(message)) answer = chatbotAnswers.alur;
  else if (/(program|fasilitas|tahfiz|asrama)/.test(message)) answer = chatbotAnswers.program;

  res.json({ answer });
});

app.post('/api/chatbot/feedback', async (req, res, next) => {
  try {
    const messageId = cleanText(req.body.message_id, 80);
    const feedback = cleanText(req.body.feedback, 20);
    if (!messageId || !['like', 'dislike'].includes(feedback)) {
      return res.status(400).json({ message: 'Feedback tidak valid.' });
    }
    await appendJson(FEEDBACK_FILE, {
      messageId,
      feedback,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ message: 'Feedback tersimpan.' });
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PSB Pesantren Peradaban berjalan di http://localhost:${PORT}`);
});
