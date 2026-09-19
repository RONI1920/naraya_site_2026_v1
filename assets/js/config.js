/**
 * config.js
 * ------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for business info + public integration keys.
 *
 * ⚠️  REPLACE ALL "GANTI_" PLACEHOLDER VALUES BEFORE GOING LIVE.
 *
 * Safe to expose in the browser:
 *   - SUPABASE_ANON_KEY is a PUBLIC key. It is only safe because every
 *     table it can touch is protected by Row Level Security (RLS).
 *     See supabase/migrations/002_rls_policies.sql.
 *   - Never put SUPABASE_SERVICE_ROLE_KEY in this file or anywhere in
 *     /assets. That key belongs only in a server-side admin backend
 *     or Supabase Edge Function environment, never in Git.
 * ------------------------------------------------------------------
 */

/**
 * BASE_PATH auto-detect
 * ------------------------------------------------------------------
 * Dihitung dari src script config.js ini sendiri, supaya semua script
 * lain (include-header.js, include-footer.js, consent.js) tahu berapa
 * "../" yang dibutuhkan untuk kembali ke root situs — baik saat situs
 * di-serve dari domain root maupun dari subpath seperti
 * https://username.github.io/nama-repo/.
 */
(function () {
  "use strict";
  var thisScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = 0; i < scripts.length; i++) {
        if (/assets\/js\/config\.js/.test(scripts[i].src || scripts[i].getAttribute("src") || "")) {
          return scripts[i];
        }
      }
      return scripts[scripts.length - 1];
    })();
  var src = thisScript.getAttribute("src") || "";
  window.__BASE_PATH = src.replace(/assets\/js\/config\.js.*$/, "");
})();

window.SITE_CONFIG = Object.freeze({
  // ---- IDENTITY ---------------------------------------------------
  BUSINESS_NAME: "NARAYA",
  // Tagline resmi. Dipakai di header, footer, dan schema.org.
  BUSINESS_TAGLINE: "Sedot WC & Solusi Sanitasi",
  // Nama brand lengkap untuk schema.org "name" dan og:site_name.
  BUSINESS_NAME_FULL: "NARAYA Sedot WC & Solusi Sanitasi",
  // BUSINESS_LEGAL_NAME: "CV Naraya Solusi Sanitasi", // ⚠️ ganti kalau badan usaha berbeda
  BUSINESS_DESCRIPTION:
    "NARAYA Sedot WC & Solusi Sanitasi — jasa sedot WC, sedot septic tank, WC mampet, dan sedot limbah untuk rumah, kos, ruko, kantor, dan tempat usaha di seluruh Jabodetabek. Harga transparan mulai Rp375.000.",
  BUSINESS_YEAR_ESTABLISHED: 2026,

  // ---- CONTACT ------------------------------------------------------
  // WhatsApp number in international format, digits only, no "+".
  BUSINESS_WHATSAPP: "+6285117419206",
  // Phone number for tel: links, digits only or with leading 0.
  BUSINESS_PHONE: "+6285117419206",
  BUSINESS_EMAIL: "narayasanitasisolution@gmail.com",

  // ---- ADDRESS / LOCATION --------------------------------------------
  BUSINESS_ADDRESS: "Jl. A Tanah 80 RT 004/RW 008 Kel. Klender, Kec. Duren Sawit",
  BUSINESS_CITY: "Jakarta Timur",
  BUSINESS_PROVINCE: "DKI Jakarta",
  BUSINESS_POSTAL_CODE: "13470",
  BUSINESS_COUNTRY: "ID",
  // Decimal degrees. Get exact values from Google Maps (right-click > coordinates).
  BUSINESS_LATITUDE: -6.219763,
  BUSINESS_LONGITUDE: 106.9003752,
  // Google Business Profile / Google Maps place link.
  BUSINESS_GOOGLE_MAPS_URL: "https://www.google.com/maps/place/Jl.+A+Tanah+80,+RW.8,+Klender,+Kec.+Duren+Sawit,+Kota+Jakarta+Timur,+Daerah+Khusus+Ibukota+Jakarta+13470/@-6.2197697,106.9003993,21z/data=!4m6!3m5!1s0x2e69f359f90f6213:0x264df22866fce177!8m2!3d-6.219763!4d106.9003752!16s%2Fg%2F1hm5q6_fr",

  // ---- HOURS ----------------------------------------------------------
  // Only state hours the business actually keeps. Do not claim 24/7
  // unless that is genuinely true and confirmed by the owner.
  // ⚠️ Array dan teks tampilan HARUS cocok. Sebelumnya array menulis
  // Senin–Sabtu 07:00–21:00 tapi teksnya "setiap hari 07.00–21.00" —
  // ketidakcocokan seperti ini bisa memicu peringatan di Google Search
  // Console dan membingungkan calon pelanggan. Sudah disamakan.
  BUSINESS_OPENING_HOURS: [
    { days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], opens: "07:00", closes: "21:00" },
  ],
  BUSINESS_OPENING_HOURS_DISPLAY: "Setiap hari, 07.00–21.00",

  // ---- SERVICE AREAS ---------------------------------------------------
  // Used to build /area-layanan links + LocalBusiness "areaServed".
  // Keep this list to areas the business genuinely, reliably services.
  BUSINESS_SERVICE_AREAS: [
    { slug: "jakarta-selatan", name: "Jakarta Selatan" },
    { slug: "jakarta-timur", name: "Jakarta Timur" },
    { slug: "jakarta-barat", name: "Jakarta Barat" },
    { slug: "jakarta-pusat", name: "Jakarta Pusat" },
    { slug: "jakarta-utara", name: "Jakarta Utara" },
    { slug: "bogor", name: "Bogor" },
    { slug: "depok", name: "Depok" },
    { slug: "tangerang", name: "Tangerang" },
    { slug: "tangerang-selatan", name: "Tangerang Selatan" },
    { slug: "bekasi", name: "Bekasi" },
  ],

  // ---- PRICING / PROMO --------------------------------------------------
  // Harga promo yang ditampilkan di seluruh situs + schema.org Offer.
  // Ubah SATU angka di sini, seluruh halaman ikut berubah.
  BUSINESS_PRICE_STARTING_FROM: 375000,
  BUSINESS_PRICE_CURRENCY: "IDR",
  // Teks siap-tampil (dipakai badge promo di header, hero, dan kartu harga).
  BUSINESS_PRICE_DISPLAY: "Rp375.000",
  BUSINESS_PRICE_LABEL: "Mulai Rp375.000",
  BUSINESS_PROMO_HEADLINE: "Promo Sedot WC Jabodetabek — Mulai Rp375.000",
  // Catatan wajib agar klaim harga tetap jujur & tidak memicu komplain.
  BUSINESS_PRICE_NOTE:
    "Harga mulai Rp375.000 berlaku untuk penyedotan standar di area terjangkau. Biaya akhir dikonfirmasi via WhatsApp sebelum teknisi berangkat.",

  // ---- SOCIAL / SAMEAS ---------------------------------------------------
  BUSINESS_INSTAGRAM: "", // e.g. "https://instagram.com/xxx" or "" to hide
  BUSINESS_FACEBOOK: "",
  BUSINESS_TIKTOK: "",

  // ---- SITE ----------------------------------------------------------
  BUSINESS_DOMAIN: "narayasanitasisolution.my.id",
  SITE_URL: "https://narayasanitasisolution.my.id",
  SITE_LANGUAGE: "id-ID",

  // ---- SUPABASE (public anon key only) --------------------------------
  SUPABASE_URL: "https://pcgchdhivnjdwksxhufi.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_-EKyjVn34UHirICcFibu6Q_VuzUzZJD",

  // ---- TESTIMONIALS ----------------------------------------------------
  // Set to false to hide the "Bagikan Pengalaman Anda" submission form
  // everywhere on the site — even if Supabase is reachable. The
  // testimonials DISPLAY (Kata Pelanggan) is not affected by this flag;
  // it keeps showing published testimonials regardless.
  TESTIMONIAL_FORM_ENABLED: false,

  // ---- ANALYTICS -------------------------------------------------------
  GA_MEASUREMENT_ID: "G-34XLDS27M8", // e.g. "G-XXXXXXX" — leave "" to disable GA4
});