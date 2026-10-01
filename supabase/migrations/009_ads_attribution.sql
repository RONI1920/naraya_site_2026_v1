-- 009_ads_attribution.sql
-- Menambah kolom atribusi iklan pada tabel leads agar tiap lead bisa
-- ditelusuri ke klik/kampanye Google Ads (gclid, utm_term, utm_content)
-- dan halaman masuk (landing_page).
--
-- Jalankan di Supabase > SQL Editor SEBELUM iklan tayang.
-- Aman dijalankan berulang (IF NOT EXISTS). Kalau belum dijalankan,
-- form tetap berfungsi: formulir otomatis mengirim ulang tanpa kolom ini.

alter table public.leads add column if not exists gclid        text;
alter table public.leads add column if not exists utm_term     text;
alter table public.leads add column if not exists utm_content  text;
alter table public.leads add column if not exists landing_page text;

alter table public.leads drop constraint if exists leads_gclid_len;
alter table public.leads add  constraint leads_gclid_len
  check (gclid is null or char_length(gclid) <= 200);
