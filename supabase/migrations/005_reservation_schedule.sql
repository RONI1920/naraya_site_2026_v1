-- ============================================================
-- 005_reservation_schedule.sql
-- Menambahkan tanggal & jam kedatangan yang diminta pelanggan ke
-- tabel `leads`, supaya tim lapangan tahu jadwal yang diinginkan
-- tanpa harus buka WhatsApp satu per satu.
--
-- Kedua kolom OPSIONAL (nullable) karena banyak pelanggan sedot WC
-- butuh layanan darurat/hari ini juga dan tidak selalu memilih
-- tanggal spesifik — form akan tetap valid tanpa diisi.
--
-- Tidak ada perubahan RLS yang diperlukan: policy "public_insert_leads"
-- di 002_rls_policies.sql sudah `with check (true)` di level baris,
-- jadi otomatis mencakup kolom baru ini. Begitu juga
-- admin_select_leads / admin_update_leads sudah mencakup seluruh
-- kolom tabel.
-- ============================================================

alter table leads
  add column if not exists preferred_date date,
  add column if not exists preferred_time_slot text;

-- Drop-then-add supaya migrasi ini aman dijalankan ulang (idempotent)
-- tanpa error "constraint already exists".
alter table leads drop constraint if exists leads_preferred_time_slot_check;
alter table leads
  add constraint leads_preferred_time_slot_check
  check (
    preferred_time_slot is null or preferred_time_slot in (
      'Secepatnya',
      '07:00-09:00',
      '09:00-11:00',
      '11:00-13:00',
      '13:00-15:00',
      '15:00-17:00',
      '17:00-19:00'
    )
  );

create index if not exists idx_leads_preferred_date on leads (preferred_date);

comment on column leads.preferred_date is
  'Tanggal kedatangan yang diminta pelanggan lewat form kontak (opsional).';
comment on column leads.preferred_time_slot is
  'Slot jam kedatangan yang diminta pelanggan lewat form kontak (opsional). Nilai harus salah satu dari daftar tetap di CHECK constraint — kalau jam operasional berubah (lihat BUSINESS_OPENING_HOURS di config.js, saat ini 07.00-20.00), update daftar ini DAN daftar <option> di kontak.html + validasi di assets/js/contact-form.js supaya tetap sinkron.';
