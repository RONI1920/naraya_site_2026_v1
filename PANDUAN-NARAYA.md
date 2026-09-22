# NARAYA — Sedot WC & Solusi Sanitasi
## Panduan Go-Live & SEO

### Field baru: titik lokasi via peta (GPS)

Form kontak (`kontak.html`) sekarang juga punya **peta titik lokasi**
opsional di bawah field Area. Pelanggan bisa menekan tombol
"Gunakan Lokasi Saya" (browser akan minta izin GPS) atau menandai
langsung dengan tap/geser pin di peta untuk koreksi manual. Tujuannya
supaya tim lapangan tiba tepat sesuai koordinat Google Maps, bukan
hanya mengandalkan alamat yang diketik.

- **Wajib dijalankan sebelum go-live:** `supabase/migrations/006_lead_location.sql`
  di SQL Editor Supabase — menambah kolom `location_lat`, `location_lng`,
  `location_accuracy_m`, `location_source` (semuanya nullable/opsional)
  ke tabel `leads`.
- Peta memakai **Leaflet + tile OpenStreetMap** (bukan Google Maps
  JavaScript API) karena tidak butuh API key atau billing Google Cloud
  — bisa langsung aktif tanpa setup tambahan. Koordinat yang dihasilkan
  tetap koordinat GPS standar, 100% akurat kalau dibuka di Google Maps.
  Kalau nanti Anda sudah punya API key Google Maps sendiri dan ingin
  tampilan peta yang identik dengan Google Maps, ganti tile provider di
  `assets/js/location-picker.js` — bagian lain (form, database, Google
  Sheet) tidak perlu diubah.
- Di Google Sheet sinkron leads, kolom baru **"Titik Lokasi (Google
  Maps)"** muncul setelah kolom Area, berisi link siap-klik langsung ke
  titik yang ditandai pelanggan. Kolom Status/Catatan Admin/Terakhir
  Disinkron otomatis bergeser satu kolom ke kanan (sekarang O/P/Q,
  bukan lagi N/O/P) — kalau Anda sudah pernah setup Sheet sebelumnya,
  jalankan ulang menu **"Sedot WC > Sinkron Sekarang"** setelah update
  kode Apps Script supaya header baris 1 ikut ter-refresh.
- Field ini 100% opsional di sisi pelanggan — kalau mereka menolak izin
  lokasi atau tidak menandai peta sama sekali, formulir tetap terkirim
  normal seperti sebelumnya.

### Field baru: tanggal & jam kedatangan

Form kontak (`kontak.html`) sekarang punya 2 field tambahan opsional:
**Tanggal Kedatangan** dan **Jam Kedatangan** (7 slot: Secepatnya +
6 rentang 2 jam antara 07.00–19.00). Datanya masuk ke kolom baru
`preferred_date` dan `preferred_time_slot` di tabel `leads` — jalankan
`supabase/migrations/005_reservation_schedule.sql` di SQL Editor
Supabase kalau belum. Kalau jam operasional (`BUSINESS_OPENING_HOURS`
di `config.js`) berubah, sesuaikan juga daftar `<option>` di
`kontak.html`, daftar `VALID_TIME_SLOTS` di `assets/js/contact-form.js`,
dan CHECK constraint di migrasi 005 supaya ketiganya tetap sinkron.

### Koordinasi dengan tim lapangan lewat Google Sheet

Lihat folder `google-sheets-sync/` — sinkron leads dari Supabase ke
Google Sheet otomatis tiap 10 menit, sudah termasuk tanggal & jam
kedatangan di atas. Panduan setup lengkap: `google-sheets-sync/SETUP.md`.

---

## ⚠️ BAGIAN 1 — WAJIB DIISI SEBELUM SITUS DIPUBLIKASIKAN

Situs ini **belum bisa menghasilkan pelanggan** sampai hal di bawah diganti.
Ada di satu file: `assets/js/config.js`.

✅ **Sudah dikonfirmasi & diterapkan ke seluruh situs** (nomor WhatsApp/telepon
`+62 851-1741-9206`, email `narayasanitasisolution@gmail.com` — termasuk 60
tautan `tel:` yang sebelumnya masih hardcoded ke nomor lama `0212200899` di
24 halaman, dan email JSON-LD yang sebelumnya `info@narayasanitasisolution.my.id`).

| Yang harus diganti | Status |
|---|---|
| `BUSINESS_WHATSAPP` / `BUSINESS_PHONE` | ✅ Selesai — `+62 851-1741-9206` |
| `BUSINESS_EMAIL` | ✅ Selesai — `narayasanitasisolution@gmail.com` |
| `BUSINESS_ADDRESS` + koordinat | ✅ Selesai — alamat dikonfirmasi, koordinat `-6.219763, 106.9003752` diisi dari link Google Maps, peta ditampilkan di `kontak.html` |

### Domain

Saya memakai domain sementara **`narayasanitasisolution.my.id`**. Kalau domain Anda
berbeda, ganti di seluruh situs dengan satu perintah:

```bash
grep -rl "narayasanitasisolution.my.id" . | xargs sed -i 's/narayasanitasi\.co\.id/DOMAIN-ANDA.com/g'
```

### Konten yang masih placeholder

- `tentang-kami.html` — masih berisi teks contoh. Ganti dengan cerita usaha
  yang sebenarnya (kapan berdiri, berapa armada, siapa yang menangani).
- `assets/img/tim-pendiri.jpg` — belum ada. Taruh foto tim di path itu, lalu
  buka `tentang-kami.html` dan hapus tanda komentar di sekitar tag `<img>`.
- `assets/img/trust-photo.jpg` — sudah ada, tapi pastikan itu foto armada
  NARAYA yang asli, bukan foto stok.

---

## BAGIAN 2 — APA YANG SUDAH DIKERJAKAN

### Update 2026-09-22: area layanan dipersempit jadi 4, harga dihapus dari situs

Atas permintaan langsung: tim lapangan saat ini hanya realistis menjangkau
**Jakarta Selatan, Depok, Bogor, dan Tangerang Selatan**. Dan situs tidak lagi
menampilkan angka harga di mana pun — biaya selalu dikonfirmasi lewat WhatsApp.

- **Halaman area dihapus:** `jakarta-timur.html`, `jakarta-barat.html`,
  `jakarta-pusat.html`, `jakarta-utara.html`, `bekasi.html`, `tangerang.html`
  (beserta gambar `assets/img/area/*` masing-masing). Kalau area ini mulai
  dilayani lagi nanti, halaman lama ada di riwayat git kalau perlu ditulis
  ulang — jangan langsung dipulihkan mentah-mentah karena kontennya perlu
  ditinjau ulang dulu (harga, jam, dsb).
- **Pondok Aren** digabung ke `area-layanan/tangerang-selatan.html` (bukan
  halaman sendiri) — ditambah FAQ, paragraf, dan `areaServed` schema khusus
  Pondok Aren di halaman itu.
- **Semua angka `Rp375.000` dihapus** dari: bar atas semua halaman, beranda,
  `harga.html` (sekarang jadi halaman "Estimasi Biaya" tanpa angka),
  badge di halaman layanan & area, footer, template pesan WhatsApp
  (`assets/js/whatsapp.js`), dan seluruh schema.org (`priceRange`,
  `priceSpecification`, `offers` di tiap Service dihapus dari JSON-LD —
  `OfferCatalog` di `harga.html` tetap ada tapi tanpa field harga, jadi
  sekadar daftar layanan).
- `assets/js/config.js`: `BUSINESS_SERVICE_AREAS` dipangkas jadi 4 entri,
  blok `BUSINESS_PRICE_*` / `BUSINESS_PROMO_HEADLINE` dihapus (diganti satu
  `BUSINESS_PRICE_NOTE` generik tanpa angka).
- `sitemap.xml`: 6 URL area yang dihapus juga dibuang dari sitemap.
- `supabase/migrations/003_seed.sql`: seed `service_areas` diganti jadi 4
  area aktif; 6 area lama disisipkan dengan `is_active = false` (dinonaktifkan,
  bukan dihapus, supaya lead/reservasi lama yang mereferensikan slug itu
  tetap valid).
- `pesan.html`: bounding box Nominatim untuk autocomplete alamat dipersempit
  dari seluruh Jabodetabek ke perkiraan kasar area 4 kota ini
  (`SERVICE_AREA_VIEWBOX`) — sesuaikan lagi kalau area berubah.

**Yang sengaja TIDAK diubah:** alamat kantor NARAYA sendiri tetap Jakarta
Timur (Duren Sawit) — itu lokasi kantor/gudang, bukan klaim area layanan,
jadi tidak masuk hitungan "area yang dilayani".

### Rebranding (tuntas, 0 sisa)

Branding lama di situs ini **tidak konsisten**: file konfigurasi menulis
"Tanki.Id" dan "CV Jaya Abadi Sanitasi", sementara halaman HTML menulis
"Sedot WC Jaya Abadi". Semuanya kini disatukan menjadi:

- **Nama tampil:** NARAYA
- **Tagline:** Sedot WC & Solusi Sanitasi
- **Nama lengkap:** NARAYA Sedot WC & Solusi Sanitasi
- **Badan usaha:** CV Naraya Solusi Sanitasi *(⚠️ ganti kalau berbeda)*

Termasuk: logo SVG baru, gambar share media sosial baru, header, footer,
seluruh judul halaman, dan semua template pesan WhatsApp.

### Promo Rp375.000 (terpasang di 7 titik)

1. Bar promo hitam di paling atas setiap halaman
2. Judul & paragraf pembuka beranda
3. Blok harga besar + tabel harga di beranda
4. Halaman `harga.html` khusus
5. Badge "Promo — mulai Rp375.000" di setiap halaman layanan & area
6. Footer
7. **Schema.org `priceSpecification`** — inilah yang membuat harga
   berpeluang tampil langsung di hasil pencarian Google

Semua angka bersumber dari `BUSINESS_PRICE_STARTING_FROM` di `config.js`.

> **Catatan kejujuran klaim:** di semua tempat harga ditulis sebagai *"mulai
> dari"* dan disertai keterangan bahwa biaya akhir dikonfirmasi lewat
> WhatsApp sebelum teknisi berangkat. Ini melindungi Anda dari komplain
> pelanggan sekaligus dari masalah iklan menyesatkan.

### Optimasi SEO

**26 halaman** kini punya judul, deskripsi, dan canonical yang **unik
seluruhnya** (26/26) — tidak ada lagi halaman yang saling berebut peringkat.

- Judul semua ≤ 60 karakter, deskripsi 110–165 karakter (tidak terpotong Google)
- Open Graph + Twitter Card lengkap → tampilan rapi saat di-share di WhatsApp
- `max-image-preview:large` → gambar besar di hasil pencarian
- Structured data berlapis dan saling tertaut lewat `@id`:
  LocalBusiness/PlumbingBusiness, Service + Offer, FAQPage, BreadcrumbList,
  OfferCatalog, BlogPosting
- Sitemap baru dengan `lastmod`, halaman legal sengaja dikeluarkan agar
  tidak memboroskan jatah crawl
- robots.txt kini **mengizinkan** `/assets/` — memblokir CSS/JS membuat
  Google melihat halaman rusak dan menurunkan peringkat

### Masalah yang saya temukan & perbaiki di luar permintaan

| Masalah | Dampaknya | Status |
|---|---|---|
| **Bekasi tidak punya halaman sama sekali** | "BE" di Jabodetabek hilang total dari target pencarian | ✅ Dibuat dengan konten lokal asli |
| Breadcrumb "Beranda" rusak di 9 halaman area | Mengarah ke halaman yang tidak ada | ✅ Diperbaiki |
| FAQ di halaman ≠ FAQ di schema | Google mengabaikan rich result-nya | ✅ Disamakan persis |
| Jam buka bertentangan (Sen–Sab 07–20 vs "setiap hari 07–21") | Membingungkan pelanggan & Google | ✅ Disamakan |
| `tim-pendiri.jpg` tidak ada | Error 404 di setiap kunjungan | ✅ Dinonaktifkan |
| Judul beranda = judul halaman sedot-wc | Dua halaman berebut kata kunci sama | ✅ Dipisahkan |
| Catatan internal developer tampil ke publik | Terbaca pengunjung & Google | ✅ Dihapus |

### Halaman baru

- **`harga.html`** — menyasar pencarian "harga sedot WC Jabodetabek", berisi
  tabel harga, penjelasan faktor yang memengaruhi biaya akhir, dan FAQ harga.
- **`area-layanan/bekasi.html`** — ditulis dengan konten lokal yang benar-benar
  khas Bekasi (rumah padat Pondok Gede, kos pekerja Cikarang, genangan yang
  merusak daya resap), bukan sekadar mengganti nama kota. Halaman tipis yang
  isinya hanya ganti nama kota justru dihukum Google.

---

## BAGIAN 3 — LANGKAH MENUJU HALAMAN 1 GOOGLE

Perlu saya sampaikan terus terang: **pekerjaan pada file website hanya
sebagian dari persamaannya.** Untuk pencarian lokal seperti "sedot wc
terdekat", faktor penentu terbesar ada di luar website.

### Prioritas 1 — Google Business Profile (dampak terbesar)

Ini yang menentukan apakah Anda muncul di **peta / 3 hasil teratas**, dan
bobotnya jauh melebihi seluruh optimasi teknis di situs ini.

1. Daftar di https://business.google.com — gratis
2. Verifikasi alamat (Google kirim kartu pos atau video call)
3. Isi lengkap: kategori **"Septic System Service"**, jam buka **07.00–21.00**
   (harus sama dengan situs), nomor WhatsApp, area layanan 10 kota
4. Unggah minimal 10 foto asli: truk, teknisi bekerja, sebelum/sesudah
5. Salin tautan profil ke `BUSINESS_GOOGLE_MAPS_URL` di `config.js`
6. **Minta ulasan dari setiap pelanggan yang puas.** Target 20+ ulasan.

> Saya **tidak** menambahkan rating bintang palsu ke structured data situs
> ini, meskipun itu membuat tampilan hasil pencarian lebih menarik. Rating
> fiktif melanggar kebijakan Google dan berisiko penalti manual yang jauh
> lebih merugikan daripada keuntungannya. Rating akan muncul sendiri begitu
> ulasan asli di Google Business Profile terkumpul.

### Prioritas 2 — Daftarkan situs ke Google

1. Buka https://search.google.com/search-console
2. Tambahkan domain, verifikasi kepemilikan
3. Kirim sitemap: `https://domain-anda.com/sitemap.xml`
4. Uji structured data di https://search.google.com/test/rich-results
   — pastikan FAQ dan harga terbaca tanpa error

### Prioritas 3 — Pasang Google Analytics

Isi `GA_MEASUREMENT_ID` di `config.js` (format `G-XXXXXXX`). Tanpa ini Anda
tidak tahu kata kunci mana yang mendatangkan pelanggan.

### Prioritas 4 — Konten berkelanjutan

Situs baru butuh **3–6 bulan** untuk bersaing. Blog saat ini hanya punya
1 artikel. Tambah 1–2 artikel per bulan dengan topik yang benar-benar dicari:

- Berapa biaya sedot WC di Jakarta? (panduan lengkap)
- Cara mengatasi WC mampet tanpa tukang
- Berapa tahun sekali septic tank harus disedot?
- Penyebab septic tank cepat penuh
- Ukuran septic tank ideal untuk rumah

### Ekspektasi waktu yang realistis

| Periode | Yang wajar terjadi |
|---|---|
| Minggu 1–2 | Halaman mulai terindeks Google |
| Bulan 1–2 | Muncul untuk kata kunci spesifik ("sedot wc cibinong") |
| Bulan 3–6 | Masuk halaman 1 untuk kata kunci area, bila ulasan terkumpul |
| Bulan 6–12 | Bersaing untuk kata kunci besar ("sedot wc jakarta") |

Siapa pun yang menjanjikan halaman 1 dalam hitungan minggu untuk pasar
sekompetitif Jabodetabek sedang melebih-lebihkan.

---

## BAGIAN 4 — CARA MENAMPILKAN HARGA LAGI (KALAU SUATU SAAT MAU)

Sejak update 2026-09-22, situs ini **sengaja tidak menampilkan angka harga
di mana pun**. Biaya selalu dikonfirmasi lewat WhatsApp setelah pelanggan
menjelaskan lokasi dan kondisi (lihat catatan di BAGIAN 2). Kalau nanti
Anda ingin kembali menampilkan harga mulai di situs, ini titik-titik yang
perlu diisi ulang:

1. **`assets/js/config.js`** — tambahkan kembali angka & teks harga (mis.
   `BUSINESS_PRICE_STARTING_FROM`, `BUSINESS_PRICE_DISPLAY`,
   `BUSINESS_PRICE_LABEL`) di bagian `PRICING / PROMO`. Sekarang bagian itu
   cuma berisi `BUSINESS_PRICE_NOTE` generik tanpa angka.
2. **Bar atas (`partials/header.html`)** — teks `.promo-bar__text` saat ini
   berisi daftar area, bukan harga. Ganti isinya kalau mau menampilkan harga
   lagi di sana, atau biarkan sebagai info area dan taruh harga di tempat
   lain.
3. **`harga.html`** — halaman ini sekarang jadi "Estimasi Biaya" tanpa angka
   (blok `pricing-anchor`, tiap `pricing-row`, dan FAQ harga sudah ditulis
   ulang tanpa Rp). Untuk menampilkan angka lagi, isi kembali
   `pricing-anchor__amount` dan `pricing-row__price` di tiap kartu, lalu
   sesuaikan ulang FAQ & JSON-LD `FAQPage`-nya.
4. **Schema.org (JSON-LD)** — kalau mau harga muncul di hasil pencarian
   Google lagi, tambahkan kembali `priceSpecification` / `offers` dengan
   `price` dan `priceCurrency` di tiap `Service` yang relevan (dulu ada di
   `harga.html`, `layanan/*.html`, dan `area-layanan/*.html`, sudah dibuang
   semua saat update 2026-09-22).
5. **Template WhatsApp (`assets/js/whatsapp.js`)** — kalau mau pesan
   prefill menyebut angka harga lagi, edit fungsi template yang relevan
   (`estimasi`, `sedotWc`, `sedotSepticTank`, dsb).
6. Periksa ulang tidak ada sisa referensi ke frasa lama yang sudah dihapus:
   `grep -rn "Jabodetabek\|estimasi via WhatsApp" --include="*.html" .`
   dan sesuaikan supaya konsisten dengan harga baru yang Anda tampilkan.

> Kalau angka harganya sama untuk semua layanan (seperti dulu), cara paling
> cepat tetap: taruh SATU angka di `config.js`, lalu tempel manual ke
> titik-titik di atas — bukan pakai `sed` masal seperti versi lama, karena
> sekarang tidak ada lagi placeholder angka yang seragam di seluruh file.

---

## Struktur Halaman

```
/                               Beranda (promo + layanan + FAQ + area)
/harga.html                     ★ BARU — daftar harga
/layanan.html                   Ringkasan layanan
  /layanan/sedot-wc.html
  /layanan/sedot-septic-tank.html
  /layanan/wc-mampet.html
  /layanan/septic-tank-penuh.html
  /layanan/sedot-limbah.html
/area-layanan.html              4 area (lihat catatan update di BAGIAN 2)
  /area-layanan/jakarta-selatan.html
  /area-layanan/bogor.html
  /area-layanan/depok.html
  /area-layanan/tangerang-selatan.html   termasuk Pondok Aren (tanpa halaman terpisah)
/blog.html                      1 artikel — perlu ditambah
/tentang-kami.html              ⚠️ masih placeholder
/kontak.html
/privacy-policy.html · /terms.html · /404.html
```
