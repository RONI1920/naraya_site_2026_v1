# Setup: Sinkronisasi Leads Supabase → Google Sheet

Tujuan: leads yang masuk dari form `kontak.html` (tersimpan di tabel
`leads` di Supabase) otomatis muncul di Google Sheet setiap ±10 menit,
supaya mudah dikoordinasikan dengan tim lapangan — tanpa perlu buka
Supabase dashboard.

Arah data:
- **Supabase → Sheet**: otomatis, setiap 10 menit (bisa juga manual).
- **Sheet → Supabase**: manual, hanya kolom Status & Catatan Admin,
  lewat tombol menu. Tidak otomatis, supaya tidak ada perubahan tak
  sengaja ke database.

## 1. Ambil service_role key dari Supabase

1. Buka project Supabase Anda → **Settings → API**.
2. Cari bagian **Project API keys**, salin:
   - **Project URL** (sama seperti `SUPABASE_URL` di `assets/js/config.js`)
   - **service_role** key (BUKAN `anon` key yang dipakai di website).
     Key ini **rahasia** — jangan pernah taruh di file website, di Git,
     atau dibagikan ke siapa pun selain Anda sendiri.

## 2. Buat Google Sheet + tempel script

1. Buat Google Sheet baru (boleh kosong, judul bebas, misal "Leads Sedot WC").
2. Menu **Extensions → Apps Script**.
3. Hapus semua isi default `Code.gs`, lalu tempel seluruh isi file
   `Code.gs` dari folder ini.
4. Klik ikon gerigi **Project Settings** di sidebar kiri.
5. Scroll ke **Script Properties → Add script property**, tambahkan
   tiga baris ini satu per satu:

   | Property                     | Value                                   |
   |-------------------------------|------------------------------------------|
   | `SUPABASE_URL`                | Project URL dari langkah 1               |
   | `SUPABASE_SERVICE_ROLE_KEY`   | service_role key dari langkah 1          |
   | `SHEET_NAME`                  | `Leads` (opsional, ini defaultnya)       |

6. Kembali ke tab **Editor** (ikon `< >`), pilih fungsi `setup` di
   dropdown toolbar (di sebelah tombol ▷ Run), lalu klik **Run**.
7. Google akan minta izin akses (karena script memanggil layanan
   eksternal & mengubah spreadsheet) — klik **Review permissions**,
   pilih akun Google Anda, klik **Advanced → Buka (nama project) (unsafe)**
   lalu **Allow**. Ini normal untuk script buatan sendiri yang belum
   diverifikasi Google, dan aman karena hanya Anda yang menjalankannya.
8. Kembali ke Sheet — akan muncul tab **Leads** berisi header + data
   yang sudah ada di Supabase, dan menu **Sedot WC** di menu bar.

Setelah langkah ini, trigger otomatis sudah aktif: sinkron berjalan
sendiri setiap 10 menit selama Sheet ini ada (bisa dicek/diubah di
Apps Script → ikon jam **Triggers** di sidebar kiri).

## 3. Struktur kolom di Sheet

| Kolom | Isi | Sumber |
|---|---|---|
| A | Lead ID | Supabase (jangan diedit) |
| B | Waktu Masuk | Supabase |
| C | Nama | Supabase |
| D | No. WhatsApp | Supabase |
| E | Layanan | Supabase |
| F | Area | Supabase |
| G | **Titik Lokasi (Google Maps)** | Supabase — link siap-klik dari koordinat yang ditandai pelanggan di peta form kontak (kosong kalau pelanggan tidak menandai lokasi) |
| H | Pesan | Supabase |
| I | Tanggal Diminta | Supabase (dari field baru di form kontak) |
| J | Jam Diminta | Supabase (dari field baru di form kontak) |
| K | Halaman Sumber | Supabase |
| L–N | UTM Source/Medium/Campaign | Supabase |
| **O** | **Status** | **Bisa diedit** — dropdown: `new`, `contacted`, `scheduled`, `completed`, `cancelled` |
| **P** | **Catatan Admin** | **Bisa diedit** — bebas teks, mis. nama teknisi/PIC |
| Q | Terakhir Disinkron | Diisi otomatis oleh script |

Kolom O & P tidak akan ditimpa oleh sinkron otomatis — aman untuk Anda
edit kapan saja. Setelah edit, klik menu **Sedot WC → Push Status &
Catatan ke Supabase** untuk menyimpannya balik ke database (misalnya
supaya tercatat juga di Supabase Table Editor, atau kalau nanti ada
dashboard admin yang membacanya).

## 4. Pemakaian sehari-hari

- Buka Sheet kapan saja — data leads terbaru sudah ada di sana
  (maksimal telat ~10 menit dari waktu form disubmit).
- Kalau butuh data yang benar-benar real-time: menu **Sedot WC →
  Sinkron Sekarang**.
- Sebelum berangkat, tim lapangan tinggal klik link di kolom **Titik
  Lokasi (Google Maps)** (G) untuk membuka rute langsung ke lokasi yang
  ditandai pelanggan — kalau kolom ini kosong, gunakan alamat teks di
  kolom Area (F) seperti biasa.
- Setelah menghubungi pelanggan dan mengonfirmasi jadwal ke tim
  lapangan, update kolom **Status** (O) dan **Catatan Admin** (P) di
  baris terkait, lalu **Sedot WC → Push Status & Catatan ke Supabase**
  kalau ingin tersimpan juga di database.
- Bagikan Sheet ini ke tim lapangan dengan akses **Editor** atau
  **Viewer** seperti biasa (Share). Mereka **tidak perlu** akses ke
  Extensions → Apps Script / Project Settings — jangan diberi akses
  ke situ, supaya `SUPABASE_SERVICE_ROLE_KEY` tetap rahasia.

## 5. Troubleshooting

- **Error "SUPABASE_URL belum diisi..."** → cek lagi Script Properties
  di langkah 2, pastikan nama property persis `SUPABASE_URL` (huruf
  besar semua, tanpa spasi).
- **Error 401/403 dari Supabase** → service_role key salah/tertukar
  dengan anon key, atau project Supabase sedang paused (project gratis
  Supabase auto-pause kalau tidak ada aktivitas ±1 minggu — buka
  dashboard Supabase untuk resume).
- **Trigger tidak jalan otomatis** → buka Apps Script → ikon jam
  **Triggers** di sidebar, pastikan ada trigger `syncLeads` tipe
  time-driven. Kalau tidak ada, jalankan `setup` sekali lagi dari
  editor.
- **Mau ubah frekuensi sinkron** (misal jadi tiap 5 menit) → di
  **Triggers**, edit trigger yang ada, atau hapus lalu ubah
  `everyMinutes(10)` di `createTriggerIfMissing_()` pada `Code.gs`
  sebelum `setup` dijalankan lagi.
