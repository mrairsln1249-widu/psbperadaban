alter table public.registrations
  add column if not exists tempat_lahir text,
  add column if not exists tanggal_lahir date,
  add column if not exists jenis_kelamin text,
  add column if not exists alamat_santri text,
  add column if not exists wa_santri text,
  add column if not exists nama_ayah text,
  add column if not exists nama_ibu text,
  add column if not exists wa_orangtua text,
  add column if not exists alamat_orangtua text,
  add column if not exists sumber_informasi text,
  add column if not exists motivasi_santri text,
  add column if not exists motivasi_orangtua text,
  add column if not exists nilai_rapor_semester_1 numeric,
  add column if not exists nilai_rapor_semester_2 numeric,
  add column if not exists nilai_rapor_semester_3 numeric,
  add column if not exists nilai_rapor_semester_4 numeric,
  add column if not exists nilai_rapor_semester_5 numeric,
  add column if not exists pernyataan_setuju boolean,
  add column if not exists tanggal_ujian date,
  add column if not exists url_ujian text,
  add column if not exists cbt_username text,
  add column if not exists cbt_password text,
  add column if not exists agama text,
  add column if not exists provinsi text,
  add column if not exists alamat_rt_rw text,
  add column if not exists kelurahan text,
  add column if not exists kecamatan text,
  add column if not exists kabupaten_kota text,
  add column if not exists instagram text,
  add column if not exists youtube text,
  add column if not exists tiktok text,
  add column if not exists pilihan_program text;

alter table public.registrations alter column gelombang drop not null;
alter table public.registrations add column if not exists catatan text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists email text;
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email = '');
drop policy if exists "Applicants update own profile contact" on public.profiles;
create policy "Applicants update own profile contact" on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id, full_name, whatsapp, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Pendaftar'), new.raw_user_meta_data->>'whatsapp', new.email);
  return new;
end; $$;
alter table public.registrations drop constraint if exists registrations_jenjang_check;
alter table public.registrations
  add constraint registrations_jenjang_check
  check (jenjang in ('MTs', 'MA', 'SMP (Pesantren)', 'SMA (Full day/sekolah saja)', 'SMA (Sekolah dan Pesantren)', 'SMP', 'SMA (Boarding)', 'Kesetaraan Paket C'));

drop function if exists public.admin_account_followup_report();
create or replace function public.admin_account_followup_report()
returns table (user_id uuid, email text, full_name text, whatsapp text, created_at timestamptz)
language sql
security definer
set search_path = public, auth
as $$
  select u.id, u.email, coalesce(p.full_name, 'Pendaftar'), p.whatsapp, u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.registrations r on r.user_id = u.id
  where public.is_admin()
    and coalesce(p.role, 'applicant') = 'applicant'
    and r.id is null
  order by u.created_at desc;
$$;
revoke all on function public.admin_account_followup_report() from public;
grant execute on function public.admin_account_followup_report() to authenticated;
alter table public.registrations drop constraint if exists registrations_jenis_kelamin_check;
alter table public.registrations
  add constraint registrations_jenis_kelamin_check
  check (jenis_kelamin in ('Laki-laki', 'Perempuan'));
alter table public.registrations drop constraint if exists registrations_nilai_rapor_semester_1_check;
alter table public.registrations
  add constraint registrations_nilai_rapor_semester_1_check
  check (nilai_rapor_semester_1 between 0 and 100);
alter table public.registrations drop constraint if exists registrations_nilai_rapor_semester_2_check;
alter table public.registrations
  add constraint registrations_nilai_rapor_semester_2_check
  check (nilai_rapor_semester_2 between 0 and 100);
alter table public.registrations drop constraint if exists registrations_nilai_rapor_semester_3_check;
alter table public.registrations
  add constraint registrations_nilai_rapor_semester_3_check
  check (nilai_rapor_semester_3 between 0 and 100);
alter table public.registrations drop constraint if exists registrations_nilai_rapor_semester_4_check;
alter table public.registrations
  add constraint registrations_nilai_rapor_semester_4_check
  check (nilai_rapor_semester_4 between 0 and 100);
alter table public.registrations drop constraint if exists registrations_nilai_rapor_semester_5_check;
alter table public.registrations
  add constraint registrations_nilai_rapor_semester_5_check
  check (nilai_rapor_semester_5 between 0 and 100);

alter table public.registration_documents drop constraint if exists registration_documents_document_type_check;
alter table public.registration_documents
  add constraint registration_documents_document_type_check
  check (document_type in ('foto_bersama', 'pas_foto', 'kartu_keluarga', 'ktp_ayah', 'ktp_ibu', 'akta_kelahiran', 'bukti_transfer', 'rapor', 'ijazah'));
alter table public.registration_documents drop constraint if exists registration_documents_registration_id_document_type_key;
alter table public.registration_documents drop constraint if exists registration_documents_registration_id_document_type_file_path_key;
alter table public.registration_documents
  add constraint registration_documents_registration_id_document_type_file_path_key
  unique (registration_id, document_type, file_path);

drop policy if exists "Applicants update own draft registration" on public.registrations;
create policy "Applicants update own draft registration" on public.registrations for update
using (user_id = auth.uid() and status in ('draft', 'perlu_perbaikan'))
with check (user_id = auth.uid() and status in ('draft', 'perlu_perbaikan', 'menunggu_verifikasi'));

drop policy if exists "Applicants update own documents" on storage.objects;
create policy "Applicants update own documents" on storage.objects for update
using (bucket_id = 'registration-documents' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'registration-documents' and auth.uid()::text = (storage.foldername(name))[1]);

update storage.buckets
set file_size_limit = 1572864
where id = 'registration-documents';
