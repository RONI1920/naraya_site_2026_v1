# Perubahan v3 — Persiapan Google Ads (1 Okt 2026)

Dasar: `README-AUDIT-GOOGLE-ADS.md`. Keputusan pemilik: WhatsApp = 0822-9805-6092 (telepon tetap 0851-1741-9206),
testimoni dihapus, tanpa harga + klaim judul diubah.

## Yang sudah diperbaiki di code
| Audit | Perbaikan |
|---|---|
| B1 | `analytics.js` ditulis ulang: siap konversi Google Ads (`GOOGLE_ADS_ID` + `GOOGLE_ADS_CONVERSIONS` di `config.js`), gclid/utm ditangkap per sesi. |
| B2 | Satu-satunya pemuat GA4 = `analytics.js` (gtag inline di `index.html` dihapus). Memakai Consent Mode v2: event selalu terkirim, cookie hanya aktif setelah "Terima". Privasi diperbarui sesuai. |
| B3 | Form kontak tidak lagi "sukses palsu": bila DB gagal, pengunjung diarahkan ke WhatsApp dengan data terisi. `Code.gs`: sinkron tiap 1 menit + email notifikasi lead baru (`NOTIFY_EMAIL`). |
| B4 | Semua tombol WA memakai 0822-9805-6092 (sudah demikian di config & pesan.html), telepon 0851-1741-9206. |
| B5 | Teks dummy (Tentang Kami, Syarat), slot foto tim, 3 testimoni noscript, petunjuk developer — dihapus. |
| B6 | H1 beranda: "Jasa Sedot WC & Septic Tank di Jakarta Selatan, Depok, Bogor & Tangsel". Klaim "tidak ada biaya tiba-tiba" → "Estimasi biaya kami sampaikan sebelum teknisi berangkat". |
| P1 | Halaman iklan baru: `lp/sedot-wc.html`, `lp/wc-mampet.html`, `lp/septic-tank-penuh.html` (noindex, tanpa menu, pilihan area). |
| P2 | Pesan WA dari iklan memuat penanda `[ref: gads-<kampanye>]`. Lead menyimpan gclid, utm_term, utm_content, landing_page (migrasi `009`). |
| P3 | Kolom Area di form kontak = pilihan 4 wilayah (wajib). |
| P5 | Skrip widget statistik dilepas dari semua halaman. |
| P6 | Dihapus: `area-layanan/{bekasi,jakarta-barat,jakarta-pusat,jakarta-timur,jakarta-utara,tangerang}.html`. Canonical Tangsel diperbaiki. |
| P7 | Kebijakan privasi: analitik/iklan, parameter iklan, peta pihak ketiga. |
| Lainnya | `og-cover.jpg` dibuat, nama merek diseragamkan di pesan.html, `pesan.html` noindex, ruang bawah untuk sticky bar HP, kartu blog "Segera hadir" dihapus. |

## WAJIB Anda lakukan sebelum iklan tayang
1. **Supabase → SQL Editor**: jalankan `supabase/migrations/009_ads_attribution.sql`.
2. **Apps Script**: tempel `google-sheets-sync/Code.gs` baru, isi Script Property `NOTIFY_EMAIL`, jalankan `setup()` (mengganti trigger ke 1 menit). Aktifkan notifikasi Gmail di HP.
3. **Google Ads**: buat akun, buat 4 konversi (klik WA, klik telepon, form kontak, form pesan), isi `GOOGLE_ADS_ID` dan label di `assets/js/config.js`. Aktifkan auto-tagging (gclid).
4. **GA4**: tandai `whatsapp_click`, `phone_click`, `contact_form_submit`, `lead_form_submit` sebagai key event; cek di DebugView.
5. **Hapus file lama di repo GitHub** (menyalin zip tidak menghapus file): 6 halaman area di atas.
6. **Pastikan benar**: isi `terms.html` (pembatalan, tanggung jawab), "Bayar setelah selesai / tunai-transfer-QRIS" di LP, jam 07.00–21.00.
7. Foto armada/teknisi asli, cerita usaha di Tentang Kami, Google Business Profile, penjaga WA selama iklan tayang.
8. Ukur PageSpeed mobile pada `lp/*.html` dan jalankan uji 10 langkah di README audit.

URL tujuan iklan: `https://narayasanitasisolution.my.id/lp/<halaman>.html` (jangan ke halaman lain).

## Belum dikerjakan (saran tahap berikut)
- Header/footer masih dimuat lewat `fetch()` (LP tidak memakainya, jadi aman untuk iklan).
- `pesan.html` masih 7 field wajib (bukan jalur iklan).
- Autocomplete alamat memakai server publik Nominatim.
- Halaman layanan umum belum diperkuat; kisaran harga ditunda sesuai keputusan Anda.
