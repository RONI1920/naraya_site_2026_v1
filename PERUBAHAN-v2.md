# Perubahan v2 — Optimasi Performance (26 Sept 2026)

## Ringkasan
Skor PageSpeed sebelumnya: Performance 63, Accessibility 91, Best Practices 96, SEO 100.
Perubahan di bawah menyasar skor Performance tanpa mengubah tampilan atau fungsi apa pun.

## Yang diperbaiki

1. **Gambar hero & foto trust dikonversi ke WebP + dibuat versi mobile (800px)**
   - `assets/img/hero-banner*.webp`, `trust-photo.webp`, `og-cover.webp` (baru)
   - `index.html` sekarang pakai `srcset` supaya HP otomatis download versi
     800px (~50-60KB) alih-alih versi 1600px (~180-220KB) yang lama.
   - File `.jpg` asli **sengaja tidak dihapus** — dipakai sebagai fallback,
     dan `og:image` di meta tag tetap `.jpg` (lebih kompatibel untuk preview
     link di WhatsApp/Facebook dibanding WebP).

2. **CSS diminify**
   - `assets/css/style.css` (55KB, sumber asli, tetap dipertahankan untuk
     diedit ke depannya) → `assets/css/style.min.css` (34KB, dipakai semua
     halaman). Turun ~37%.

3. **Script non-kritis dikasih `defer`**
   - `supabase-client.js`, `traffic-widget.js`, `testimonials.js`, dan CDN
     Supabase sekarang `defer` di semua halaman — browser prioritaskan
     render halaman dulu, baru jalankan widget yang tidak perlu tampil
     instan (testimoni, traffic widget).

4. **Konsistensi kecil**: tombol "Chat WhatsApp Sekarang" di hero index.html
   yang sebelumnya hardcode nomor, sekarang pakai sistem `data-wa-message`
   yang sama dengan tombol lain (biar kalau nomor WA ganti, cukup ubah di
   satu tempat: `config.js`).

## PENTING — sebelum upload ke server
Kalau kamu nanti ubah isi `assets/css/style.css`, ingat untuk generate ulang
`style.min.css` (atau minta bantuan lagi di sini) — kalau tidak, perubahan
CSS tidak akan muncul karena semua halaman sekarang load versi `.min.css`.

## Belum dikerjakan (di luar kode, perlu kamu lakukan manual)
- Google Business Profile (lihat `PANDUAN-NARAYA.md` bagian "Prioritas 1")
- Setelah upload, jalankan ulang tes di pagespeed.web.dev untuk lihat skor barunya
