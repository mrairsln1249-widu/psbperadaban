# Setup Supabase

## 1. Buat project

Buat project Supabase, lalu buka **SQL Editor** dan jalankan seluruh isi `supabase-schema.sql`.

Jika project sudah pernah dibuat, jalankan juga seluruh isi [supabase-registration-form-migration.sql](./supabase-registration-form-migration.sql) untuk menambahkan kolom formulir baru, mengaktifkan beberapa file KTP Ayah, dan mengizinkan pendaftar menyimpan draft sendiri.
Migration mengatur batas bucket dokumen menjadi 2 MB per file. Pastikan batas ukuran file global di pengaturan Storage Supabase juga minimal 2 MB.

Jika project lama masih memakai daftar status yang lebih pendek, jalankan migration status berikut:

```sql
alter table public.registrations drop constraint if exists registrations_status_check;
alter table public.registrations add constraint registrations_status_check
check (status in ('draft', 'menunggu_verifikasi', 'perlu_perbaikan', 'terverifikasi', 'menunggu_pembayaran', 'pembayaran_diperiksa', 'pembayaran_lunas', 'siap_ujian', 'sudah_ujian', 'lulus', 'tidak_lulus', 'cadangan', 'daftar_ulang_selesai', 'ditolak'));
```

## 2. Isi konfigurasi frontend

Salin **Project URL** dan **anon public key** dari menu **Project Settings > API** ke `supabase-config.js`:

```js
window.SUPABASE_CONFIG = {
  url: 'https://project-id.supabase.co',
  anonKey: 'ey...'
};
```

Anon key memang boleh digunakan di browser. Jangan pernah menaruh `service_role` key di file frontend.

## 3. Konfigurasi email konfirmasi

Untuk produksi, biarkan konfirmasi email aktif. Formulir signup sudah mengirimkan `emailRedirectTo` ke halaman `portal.html`, sehingga tautan konfirmasi mengembalikan pengguna ke portal setelah alamat email berhasil diverifikasi.

Tambahkan URL berikut pada **Authentication > URL Configuration > Redirect URLs**:

```text
http://localhost:3000/portal.html
http://127.0.0.1:5500/portal.html
https://psb.pesantrenperadaban.my.id/portal.html
https://mrairsln1249-widu.github.io/psbperadaban/portal.html
```

Atur isi email di **Authentication > Email Templates > Confirm signup**. Contoh isi formal:

```text
Subjek:
Konfirmasi Email — Portal PSB Pesantren Peradaban

Isi:
Assalamu’alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu {{ .Email }},

Terima kasih telah mendaftarkan akun pada Portal Penerimaan Santri Baru (PSB) Pesantren Peradaban Tahun Pelajaran 2027/2028.

Untuk mengaktifkan akun dan melanjutkan proses pendaftaran, silakan konfirmasi alamat email Anda dengan mengeklik tombol berikut:

{{ .ConfirmationURL }}

Apabila Bapak/Ibu tidak merasa membuat akun ini, silakan abaikan email ini.

Wassalamu’alaikum Warahmatullahi Wabarakatuh,

Panitia PSB
Pesantren Peradaban
```

Gunakan **Project Settings > Auth > SMTP Settings** untuk menghubungkan SMTP resmi. Tanpa SMTP kustom, email akan dikirim melalui layanan email bawaan Supabase sehingga nama pengirim dan batas pengiriman mengikuti Supabase.

Rekomendasi pengaturan SMTP:

```text
Sender name: Panitia PSB Pesantren Peradaban
Sender email: admin@pesantrenperadaban.my.id
```

Pastikan domain pengirim memiliki record DNS SPF, DKIM, dan DMARC sesuai instruksi penyedia email. Jangan menaruh password SMTP di frontend atau repository.

## 4. Aktifkan login Google

1. Buka **Authentication > Providers > Google** di Supabase.
2. Buat OAuth Client ID pada Google Cloud Console.
3. Masukkan Client ID dan Client Secret ke provider Google Supabase.
4. Tambahkan callback URL Supabase yang ditampilkan pada halaman provider ke Google Cloud Console.
5. Tambahkan URL aplikasi ke **Authentication > URL Configuration > Redirect URLs**, misalnya:

```text
http://localhost:3000/portal.html
http://localhost:3000/reset-password.html
http://127.0.0.1:5500/portal.html
http://127.0.0.1:5500/reset-password.html
https://mrairsln1249-widu.github.io/psbperadaban/portal.html
https://mrairsln1249-widu.github.io/psbperadaban/reset-password.html
```

Tombol Google pada [auth.html](./auth.html) menggunakan URL `portal.html` relatif terhadap halaman yang sedang dibuka, sehingga path project GitHub Pages tetap benar.
Tautan **Lupa password?** mengirim email reset ke halaman `reset-password.html`; pastikan URL halaman tersebut diizinkan pada **Authentication > URL Configuration > Redirect URLs**.

## 5. Membuat admin

1. Daftar akun melalui `auth.html`.
2. Setelah akun dibuat, jalankan query berikut di SQL Editor dengan email admin yang benar:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@pesantrenperadaban.id');
```

Admin masuk melalui `admin.html`. Pendaftar masuk melalui `portal.html`.

## 6. Menjalankan lokal

```bash
npm start
```

Buka `http://localhost:3000`. Data pendaftaran portal disimpan ke Supabase, sedangkan endpoint chatbot yang sudah ada tetap tersedia di server Node.js.
