-- ============================================================
-- 007_traffic_widget.sql
-- Tabel pendukung widget "Statistik Pengunjung" di footer
-- (assets/js/traffic-widget.js). Menggantikan widget counter pihak
-- ketiga (mis. "Live Traffic Feed") dengan penghitung asli milik
-- situs sendiri, memakai Supabase yang sudah ada — supaya:
--   * Angka yang ditampilkan benar-benar nyata (bukan widget luar
--     yang sumber datanya tidak bisa diverifikasi).
--   * Tidak menambah script pelacak pihak ketiga / iklan di situs.
--   * Tidak perlu API key/layanan baru.
--
-- CATATAN KEAMANAN (beda dari tabel lain di situs ini):
-- Baris di tabel `page_views` HANYA berisi timestamp + path halaman —
-- tidak ada IP, nama, nomor telepon, atau data pribadi apa pun. Karena
-- itu tabel ini SENGAJA dibuka untuk publik SELECT (di luar tabel lain
-- seperti `leads` yang publik hanya boleh INSERT, lihat
-- 002_rls_policies.sql) — supaya widget bisa menghitung total
-- langsung dari browser tanpa server tambahan. Jangan tambahkan kolom
-- apa pun yang berbau data pribadi ke tabel ini di masa depan.
-- ============================================================

-- ---------- page_views ----------------------------------------------
-- Satu baris = satu kali halaman dimuat (hit), bukan "unique visitor".
create table if not exists page_views (
  id bigint generated always as identity primary key,
  viewed_at timestamptz not null default now(),
  page text
);

create index if not exists page_views_viewed_at_idx on page_views (viewed_at);

alter table page_views enable row level security;

create policy "public_insert_page_views"
  on page_views for insert
  to anon, authenticated
  with check (true);

create policy "public_select_page_views"
  on page_views for select
  to anon, authenticated
  using (true);

-- Tidak ada policy update/delete untuk anon -> baris tidak bisa diubah/
-- dihapus dari browser, hanya lewat dashboard Supabase (service_role).

-- ---------- page_views_online -----------------------------------------
-- Presence sangat sederhana: satu baris per sesi browser, di-"upsert"
-- (insert lalu update) setiap ~45 detik selagi tab situs terbuka.
-- Widget menghitung baris dengan last_seen dalam 90 detik terakhir
-- sebagai "online sekarang". Baris lama TIDAK otomatis terhapus (perlu
-- housekeeping manual/periodik di dashboard Supabase kalau ingin tabel
-- ini tetap kecil), tapi karena hanya berisi id sesi acak + timestamp,
-- risikonya rendah walau dibiarkan menumpuk.
create table if not exists page_views_online (
  session_id text primary key,
  last_seen timestamptz not null default now()
);

alter table page_views_online enable row level security;

create policy "public_insert_online"
  on page_views_online for insert
  to anon, authenticated
  with check (true);

create policy "public_update_online"
  on page_views_online for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "public_select_online"
  on page_views_online for select
  to anon, authenticated
  using (true);
