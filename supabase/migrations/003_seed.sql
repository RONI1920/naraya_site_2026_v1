-- ============================================================
-- 003_seed.sql
-- Optional starter data matching the static HTML content, so the
-- admin panel and Supabase tables aren't empty on day one. Safe to
-- run multiple times (upserts on unique slug/question).
-- ============================================================

insert into services (slug, name, short_description, is_active, seo_title, seo_description) values
  ('sedot-wc', 'Sedot WC', 'Untuk rumah, kos, dan ruko.', true, 'Jasa Sedot WC Terdekat', 'Jasa sedot WC untuk rumah, kos, dan ruko.'),
  ('sedot-septic-tank', 'Sedot Septic Tank', 'Penyedotan tangki septic tank penuh.', true, 'Jasa Sedot Septic Tank Terdekat', 'Jasa sedot septic tank untuk rumah dan tempat usaha.'),
  ('wc-mampet', 'WC Mampet', 'Penanganan WC mampet yang tidak surut.', true, 'Jasa WC Mampet Terdekat', 'Penanganan WC mampet di area layanan kami.'),
  ('septic-tank-penuh', 'Septic Tank Penuh', 'Untuk septic tank penuh/meluap.', true, 'Septic Tank Penuh, Segera Disedot', 'Penanganan septic tank penuh atau meluap.'),
  ('sedot-limbah', 'Sedot Limbah', 'Untuk restoran, kos, dan tempat usaha.', true, 'Jasa Sedot Limbah untuk Usaha', 'Sedot limbah cair untuk tempat usaha.')
on conflict (slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  is_active = excluded.is_active,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

insert into service_areas (slug, name, city, province, is_active) values
  ('jakarta-selatan', 'Jakarta Selatan', 'Jakarta Selatan', 'DKI Jakarta', true),
  ('jakarta-timur', 'Jakarta Timur', 'Jakarta Timur', 'DKI Jakarta', true),
  ('jakarta-barat', 'Jakarta Barat', 'Jakarta Barat', 'DKI Jakarta', true),
  ('jakarta-pusat', 'Jakarta Pusat', 'Jakarta Pusat', 'DKI Jakarta', true),
  ('jakarta-utara', 'Jakarta Utara', 'Jakarta Utara', 'DKI Jakarta', true)
on conflict (slug) do update set
  name = excluded.name, city = excluded.city, province = excluded.province, is_active = excluded.is_active;

insert into faqs (question, answer, category, is_published, sort_order) values
  ('Berapa harga sedot WC?', 'Harga tergantung lokasi, akses, dan volume yang perlu disedot. Chat WhatsApp untuk estimasi sebelum teknisi datang.', 'umum', true, 1),
  ('Apakah bisa datang ke rumah?', 'Bisa, layanan kami mendatangi lokasi Anda selama berada dalam area layanan yang kami cakup.', 'umum', true, 2),
  ('Area mana saja yang dilayani?', 'Lihat daftar lengkap di halaman Area Layanan. Jika area Anda tidak tercantum, silakan tanya via WhatsApp.', 'area', true, 3),
  ('Berapa lama proses penyedotan?', 'Umumnya beberapa puluh menit hingga sekitar satu jam, tergantung volume dan akses ke titik penyedotan.', 'umum', true, 4),
  ('Apakah melayani rumah dan tempat usaha?', 'Ya, kami melayani rumah tinggal, kos, ruko, kantor, restoran, dan tempat usaha lainnya.', 'umum', true, 5),
  ('Apakah bisa booking melalui WhatsApp?', 'Ya, cara paling cepat adalah chat WhatsApp langsung. Formulir kontak juga tersedia sebagai alternatif.', 'umum', true, 6)
on conflict (question) do update set
  answer = excluded.answer, category = excluded.category, is_published = excluded.is_published, sort_order = excluded.sort_order;
