# Setup Supabase

## 1. Buat project

Buat project Supabase, lalu buka **SQL Editor** dan jalankan seluruh isi `supabase-schema.sql`.

Jika project sudah pernah dibuat dengan skema lama, jalankan migration status berikut setelah schema utama:

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

## 3. Konfigurasi email

Untuk tahap lokal, konfirmasi email dapat dimatikan dari **Authentication > Providers > Email**. Untuk produksi, biarkan konfirmasi email aktif dan atur SMTP resmi.

## 4. Aktifkan login Google

1. Buka **Authentication > Providers > Google** di Supabase.
2. Buat OAuth Client ID pada Google Cloud Console.
3. Masukkan Client ID dan Client Secret ke provider Google Supabase.
4. Tambahkan callback URL Supabase yang ditampilkan pada halaman provider ke Google Cloud Console.
5. Tambahkan URL aplikasi ke **Authentication > URL Configuration > Redirect URLs**, misalnya:

```text
http://localhost:3000/portal.html
http://127.0.0.1:5500/portal.html
https://mrairsln1249-widu.github.io/psbperadaban/portal.html
```

Tombol Google pada [auth.html](./auth.html) menggunakan URL `portal.html` relatif terhadap halaman yang sedang dibuka, sehingga path project GitHub Pages tetap benar.

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
