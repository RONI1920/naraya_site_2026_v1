> **CATATAN REBRANDING (September 2026)**
> Situs ini telah di-rebrand menjadi **NARAYA — Sedot WC & Solusi Sanitasi**.
> Untuk langkah go-live, data wajib yang harus diisi, dan panduan SEO,
> baca **`PANDUAN-NARAYA.md`** lebih dulu — file itu lebih mutakhir
> daripada README ini.

# Jasa Sedot WC — Website Lokal SEO

Website statis (HTML + CSS + vanilla JS) untuk bisnis jasa sedot WC / septic
tank, dengan Supabase sebagai backend lead/contact form. Dibangun untuk
konversi WhatsApp, SEO lokal, dan performa cepat di HP Android.

## 1. Sebelum Go-Live — Checklist Wajib

- [ ] Buka `assets/js/config.js` dan ganti **semua** nilai `GANTI_...`
      (nomor WhatsApp, telepon, alamat, koordinat, domain, dst).
- [ ] Cari-dan-ganti string `GANTI_` di seluruh file HTML (title, meta,
      JSON-LD, tombol telepon `tel:GANTI_021xxxxxxx`, dsb). Semua file HTML
      sengaja menggunakan placeholder yang sama supaya mudah dicari.
- [ ] Ganti semua testimoni/foto placeholder (`[UPLOAD ... DI SINI]`) dengan
      data asli. Jangan publish testimoni yang tidak nyata.
- [ ] Isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di `config.js` (lihat §3).
- [ ] Isi `GA_MEASUREMENT_ID` jika menggunakan Google Analytics 4.
- [ ] Ganti `assets/img/og-cover.jpg` dan `favicon.ico` dengan aset asli.
- [ ] Baca ulang klaim di homepage — jangan biarkan klaim yang belum
      dikonfirmasi pemilik usaha (misal "24 jam", "10 tahun pengalaman").

## 2. Struktur Proyek

```
/                          Homepage
/layanan.html              Daftar semua layanan
/layanan/*.html            5 halaman layanan (target keyword spesifik)
/area-layanan.html         Daftar area layanan
/area-layanan/*.html       Halaman lokasi (contoh: jakarta-selatan.html)
/blog.html, /blog/*.html   Konten edukasi pelanggan
/tentang-kami.html, /kontak.html, /privacy-policy.html, /terms.html
/404.html
/assets/css/style.css      Design system (satu file)
/assets/js/config.js       SATU-SATUNYA sumber data bisnis — edit di sini
/assets/js/*.js            WhatsApp, analytics, consent, form, Supabase
/supabase/migrations/*.sql Schema + RLS + seed data
```

Tidak ada build step. Setiap halaman HTML berdiri sendiri dan memuat CSS/JS
yang sama dari `/assets`. Jika situs bertambah besar, pertimbangkan migrasi
ke static site generator (Astro/Eleventy) supaya header/footer tidak perlu
disalin manual — struktur di atas sudah kompatibel dengan migrasi tersebut.

## 3. Setup Supabase

1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor**, jalankan berurutan:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed.sql` (opsional, data contoh)
3. Salin **Project URL** dan **anon public key** dari Settings → API, isi ke
   `assets/js/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
4. **JANGAN** salin `service_role` key ke file apa pun di `/assets`. Key itu
   hanya untuk backend admin (lihat §5) dan tidak digunakan oleh situs statis
   ini sama sekali.
5. Untuk menjadikan seseorang admin: buat user via Supabase Auth, lalu jalankan:
   ```sql
   insert into admins (user_id) values ('UUID-USER-DARI-AUTH-USERS');
   ```

### Mengapa aman menaruh anon key di browser?
Karena setiap tabel di `002_rls_policies.sql` dikunci dengan Row Level
Security: publik hanya bisa **INSERT** ke `leads`/`contact_messages`, dan
hanya bisa **SELECT** baris yang `is_active`/`is_published = true` pada
tabel konten (`services`, `service_areas`, `faqs`, `testimonials`,
`blog_posts`). Tidak ada akses baca ke data pelanggan lain, dan
`business_settings` sama sekali tidak bisa diakses publik.

## 4. Deploy

Situs ini adalah folder statis — bisa dideploy ke host statis apa pun:

**Opsi sederhana (rekomendasi):**
- Netlify / Vercel / Cloudflare Pages: hubungkan repo Git, set "publish
  directory" ke root folder ini, tidak perlu build command.
- Pastikan platform hosting mengarahkan `404.html` sebagai halaman not-found
  custom (Netlify: otomatis; Vercel: gunakan `vercel.json` rewrites bila perlu).

**Setelah deploy:**
- Verifikasi HTTPS aktif (biasanya otomatis di ketiga platform di atas).
- Submit `sitemap.xml` ke Google Search Console.
- Update `GANTI_namadomain.co.id` di semua canonical URL, `sitemap.xml`, dan
  `robots.txt` menjadi domain asli.

## 5. Sistem Admin (arsitektur, belum termasuk UI)

Repo ini menyediakan skema database dan kebijakan keamanan (allow-list
`admins`, RLS admin policies) yang siap dipakai oleh dashboard admin, namun
**UI admin (untuk kelola leads/services/blog) belum dibangun di iterasi ini**
— lihat §7 Roadmap. Untuk sementara, tim internal dapat mengelola data
langsung lewat Supabase Table Editor menggunakan akun admin yang sudah
didaftarkan ke tabel `admins`.

Jangan pernah membuat password admin hardcoded di kode. Gunakan Supabase Auth
(email/password atau magic link) dan pastikan rute admin (ketika dibangun)
mengecek sesi + status `is_admin()` sebelum menampilkan data apa pun.

## 6. Menghubungkan ke Google Business Profile

1. Buat/klaim profil di https://business.google.com dengan nama, alamat, dan
   nomor telepon yang **identik** dengan yang tercantum di `config.js`
   (konsistensi NAP — Name, Address, Phone — penting untuk local SEO).
2. Tambahkan kategori bisnis "Septic tank cleaning service" atau kategori
   lokal yang paling sesuai.
3. Isi jam operasional agar sama dengan `BUSINESS_OPENING_HOURS_DISPLAY`.
4. Tambahkan link website ke domain final situs ini.
5. Setelah profil live, salin link Google Maps profil ke
   `BUSINESS_GOOGLE_MAPS_URL` di `config.js`, dan tambahkan embed peta di
   `kontak.html` (lihat komentar `GANTI_Sematkan peta lokasi usaha`).
6. Dorong pelanggan asli memberi ulasan — jangan pernah membeli/memalsukan
   ulasan. Hanya gunakan `aggregateRating` di JSON-LD jika datanya asli dan
   terverifikasi.

## 7. Sinkronisasi Leads ke Google Sheet (opsional)

Untuk koordinasi dengan tim lapangan tanpa perlu buka Supabase
dashboard, leads bisa disinkron otomatis ke Google Sheet (satu arah,
tiap ~10 menit) memakai Google Apps Script. Ini bukan bagian dari
website statis ini — script-nya berjalan di Google Sheet Anda sendiri.

Lihat `google-sheets-sync/Code.gs` (kode script) dan
`google-sheets-sync/SETUP.md` (panduan setup lengkap langkah demi
langkah, termasuk cara ambil `service_role` key dengan aman).

## 8. Roadmap / Yang Belum Dibangun

Repo ini adalah fase pertama produksi. Item berikut sengaja belum dibuat
karena butuh keputusan/konten dari pemilik bisnis, atau merupakan
pengembangan lanjutan:

- Halaman area layanan tambahan (Jakarta Timur/Barat/Pusat/Utara) — gunakan
  `area-layanan/jakarta-selatan.html` sebagai template, isi dengan konten
  lokal yang benar-benar unik per area (bukan sekadar ganti nama kota).
- Artikel blog tambahan (biaya sedot WC, penyebab WC mampet, dll — lihat
  daftar topik di `blog.html`).
- Dashboard admin (UI) untuk kelola leads, services, FAQ, blog, testimonials.
  Skema & RLS sudah siap dipakai (§5); tinggal dibangun antarmukanya
  (disarankan sebagai app terpisah yang login via Supabase Auth, bukan
  ditambahkan ke situs publik ini).
- Rate limiting sisi server yang lebih kuat (saat ini hanya throttle
  client-side + honeypot + CHECK constraints di database). Untuk anti-spam
  lebih kuat, tambahkan Supabase Edge Function di depan tabel `leads`.
- Foto asli (armada, teknisi, before/after) dan testimoni asli pelanggan.
- Embed Google Maps di halaman kontak setelah profil GBP aktif.
