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
  add column if not exists pernyataan_setuju boolean;

alter table public.registrations alter column gelombang drop not null;
alter table public.registrations drop constraint if exists registrations_jenjang_check;
alter table public.registrations
  add constraint registrations_jenjang_check
  check (jenjang in ('MTs', 'MA', 'SMP (Pesantren)', 'SMA (Full day/sekolah saja)', 'SMA (Sekolah dan Pesantren)'));
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
set file_size_limit = 2097152
where id = 'registration-documents';
