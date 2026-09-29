-- ============================================================
-- 008_traffic_realtime.sql
-- Perbaikan widget "Statistik Pengunjung" (lihat 007_traffic_widget.sql
-- untuk skema tabel page_views / page_views_online, TIDAK diubah di
-- migrasi ini). Dua hal yang ditambahkan:
--
--   1. Fungsi get_traffic_stats() -- satu panggilan RPC yang
--      mengembalikan today/yesterday/week/month/all_time sekaligus,
--      dihitung berdasarkan zona waktu Asia/Jakarta (WIB, UTC+7) dan
--      minggu yang dimulai Senin -- menggantikan 5 query `count`
--      terpisah yang sebelumnya dijalankan oleh setiap pengunjung.
--      Fungsi ini HANYA mengembalikan angka agregat (hit halaman),
--      tidak ada data pribadi apa pun.
--
--   2. Menambahkan tabel page_views ke publication
--      `supabase_realtime`, supaya klien bisa subscribe event INSERT
--      lewat postgres_changes dan widget bisa memperbarui angka
--      hampir seketika tanpa polling terus-menerus. Tabel ini sudah
--      punya policy SELECT publik (`public_select_page_views`, dibuat
--      di 007_traffic_widget.sql) sehingga aman untuk di-subscribe
--      dari browser dengan anon key.
--
-- CARA MENJALANKAN:
--   Buka proyek Supabase Anda -> SQL Editor -> tempel seluruh isi
--   file ini -> Run. Pastikan juga fitur Realtime aktif untuk proyek
--   ini (Database -> Replication, atau menu Realtime), karena
--   `alter publication` di bawah hanya menambahkan tabel ke daftar
--   publikasi -- ini tidak berguna kalau Realtime sendiri nonaktif
--   di level proyek.
-- ============================================================

-- ---------- get_traffic_stats() --------------------------------------
-- SQL function biasa (bukan PL/pgSQL) supaya bisa dipanggil sebagai
-- satu RPC ringan. `stable` karena hanya membaca data, tidak menulis.
-- `security definer` + `set search_path = public` supaya konsisten
-- dengan pola RLS di situs ini (lihat 002_rls_policies.sql) dan tidak
-- rentan search_path hijacking.
--
-- `create or replace function` TIDAK BISA mengubah tipe return dari
-- fungsi yang sudah ada dengan nama+parameter yang sama (Postgres akan
-- menolak dengan error 42P13). Karena itu di-drop dulu -- aman
-- dijalankan berulang kali, dan aman juga kalau ini run pertama kali
-- (fungsi belum ada sama sekali).
drop function if exists get_traffic_stats();

create or replace function get_traffic_stats()
returns table (
  today bigint,
  yesterday bigint,
  week bigint,
  month bigint,
  all_time bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      -- Batas hari ini di WIB, dikonversi balik ke timestamptz supaya
      -- bisa dibandingkan langsung dengan kolom viewed_at (timestamptz).
      (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as today_start,
      (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta' - interval '1 day') as yesterday_start,
      -- Minggu mulai Senin: date_trunc('week', ...) di Postgres sudah
      -- memakai konvensi ISO (Senin), sama seperti startOfWeekIso()
      -- versi lama di traffic-widget.js.
      (date_trunc('week', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as week_start,
      (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') as month_start
  )
  select
    (select count(*) from page_views, bounds where viewed_at >= bounds.today_start),
    (select count(*) from page_views, bounds where viewed_at >= bounds.yesterday_start and viewed_at < bounds.today_start),
    (select count(*) from page_views, bounds where viewed_at >= bounds.week_start),
    (select count(*) from page_views, bounds where viewed_at >= bounds.month_start),
    (select count(*) from page_views);
$$;

grant execute on function get_traffic_stats() to anon, authenticated;

-- ---------- Realtime: aktifkan untuk page_views ------------------------
-- Idempotent: alter publication ... add table akan error kalau tabel
-- sudah ada di publikasi, jadi dicek dulu lewat pg_publication_tables.
-- Tabel ini sudah punya policy SELECT publik (public_select_page_views,
-- lihat 007_traffic_widget.sql) sehingga aman untuk disiarkan lewat
-- Realtime ke browser dengan anon key -- isinya cuma timestamp + path.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'page_views'
  ) then
    alter publication supabase_realtime add table page_views;
  end if;
end;
$$;