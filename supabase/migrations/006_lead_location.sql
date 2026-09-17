-- ============================================================
-- 006_lead_location.sql
-- Menambahkan titik lokasi (koordinat GPS) yang ditentukan pelanggan
-- sendiri lewat form kontak, memakai peta interaktif (lihat
-- assets/js/location-picker.js + kontak.html). Tujuannya supaya tim
-- lapangan bisa langsung membuka koordinat ini di Google Maps dan
-- tiba tepat di lokasi, tanpa salah alamat / salah gang.
--
-- Semua kolom OPSIONAL (nullable): pelanggan yang menolak izin lokasi
-- browser, atau memilih untuk tidak menandai peta, tetap bisa mengirim
-- form seperti biasa. Ini murni penyempurnaan akurasi, bukan syarat wajib.
--
-- Tidak ada perubahan RLS yang diperlukan: policy "public_insert_leads"
-- di 002_rls_policies.sql sudah `with check (true)` di level baris,
-- jadi otomatis mencakup kolom baru ini.
-- ============================================================

alter table leads
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_accuracy_m real,
  add column if not exists location_source text;

-- Drop-then-add supaya migrasi ini aman dijalankan ulang (idempotent).
alter table leads drop constraint if exists leads_location_lat_check;
alter table leads
  add constraint leads_location_lat_check
  check (location_lat is null or location_lat between -90 and 90);

alter table leads drop constraint if exists leads_location_lng_check;
alter table leads
  add constraint leads_location_lng_check
  check (location_lng is null or location_lng between -180 and 180);

alter table leads drop constraint if exists leads_location_source_check;
alter table leads
  add constraint leads_location_source_check
  check (location_source is null or location_source in ('gps', 'manual'));

comment on column leads.location_lat is
  'Garis lintang (latitude) titik lokasi yang ditandai pelanggan sendiri lewat peta di form kontak. NULL jika pelanggan tidak menandai lokasi.';
comment on column leads.location_lng is
  'Garis bujur (longitude) titik lokasi yang ditandai pelanggan sendiri lewat peta di form kontak. NULL jika pelanggan tidak menandai lokasi.';
comment on column leads.location_accuracy_m is
  'Perkiraan radius akurasi GPS dalam meter, dari Geolocation API browser (semakin kecil semakin akurat). NULL jika lokasi diisi manual lewat klik peta / tidak diisi sama sekali.';
comment on column leads.location_source is
  '''gps'' = dari tombol "Gunakan Lokasi Saya" (GPS/WiFi perangkat), ''manual'' = pelanggan menggeser/klik pin sendiri di peta untuk koreksi. NULL jika lokasi tidak diisi.';
