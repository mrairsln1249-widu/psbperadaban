create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'applicant' check (role in ('applicant', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  registration_number text not null unique default ('PSB-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  nama text not null,
  ttl text not null,
  tempat_lahir text not null,
  tanggal_lahir date not null,
  jenis_kelamin text not null check (jenis_kelamin in ('Laki-laki', 'Perempuan')),
  jenjang text not null check (jenjang in ('MTs', 'MA', 'SMP (Pesantren)', 'SMA (Full day/sekolah saja)', 'SMA (Sekolah dan Pesantren)')),
  asal_sekolah text not null,
  gelombang text,
  nama_wali text not null,
  wa_wali text not null,
  alamat text not null,
  alamat_santri text,
  wa_santri text not null,
  nama_ayah text not null,
  nama_ibu text not null,
  wa_orangtua text not null,
  alamat_orangtua text not null,
  sumber_informasi text not null,
  motivasi_santri text not null,
  motivasi_orangtua text not null,
  nilai_rapor_semester_1 numeric not null check (nilai_rapor_semester_1 between 0 and 100),
  nilai_rapor_semester_2 numeric not null check (nilai_rapor_semester_2 between 0 and 100),
  nilai_rapor_semester_3 numeric not null check (nilai_rapor_semester_3 between 0 and 100),
  nilai_rapor_semester_4 numeric not null check (nilai_rapor_semester_4 between 0 and 100),
  nilai_rapor_semester_5 numeric not null check (nilai_rapor_semester_5 between 0 and 100),
  pernyataan_setuju boolean not null,
  catatan text,
  status text not null default 'draft' check (status in ('draft', 'menunggu_verifikasi', 'perlu_perbaikan', 'terverifikasi', 'menunggu_pembayaran', 'pembayaran_diperiksa', 'pembayaran_lunas', 'siap_ujian', 'sudah_ujian', 'lulus', 'tidak_lulus', 'cadangan', 'daftar_ulang_selesai', 'ditolak')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registration_documents (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('foto_bersama', 'pas_foto', 'kartu_keluarga', 'ktp_ayah', 'ktp_ibu', 'akta_kelahiran', 'bukti_transfer', 'rapor', 'ijazah')),
  file_path text not null,
  original_name text not null,
  created_at timestamptz not null default now(),
  unique (registration_id, document_type, file_path)
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Pendaftar'));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_documents enable row level security;

create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Applicants create own registration" on public.registrations for insert with check (user_id = auth.uid());
create policy "Applicants read own registration" on public.registrations for select using (user_id = auth.uid() or public.is_admin());
create policy "Applicants update own draft registration" on public.registrations for update
using (user_id = auth.uid() and status in ('draft', 'perlu_perbaikan'))
with check (user_id = auth.uid() and status in ('draft', 'perlu_perbaikan', 'menunggu_verifikasi'));
create policy "Admins update registrations" on public.registrations for update using (public.is_admin()) with check (public.is_admin());
create policy "Applicants manage own documents" on public.registration_documents for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit) values ('registration-documents', 'registration-documents', false, 2097152)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy "Applicants upload own documents" on storage.objects for insert
with check (bucket_id = 'registration-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Applicants read own documents" on storage.objects for select
using (bucket_id = 'registration-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));
create policy "Applicants update own documents" on storage.objects for update
using (bucket_id = 'registration-documents' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'registration-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Applicants delete own documents" on storage.objects for delete
using (bucket_id = 'registration-documents' and auth.uid()::text = (storage.foldername(name))[1]);
