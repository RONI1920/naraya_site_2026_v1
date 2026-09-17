/**
 * whatsapp.js
 * ------------------------------------------------------------------
 * Centralized WhatsApp deep-link generator. Every "Chat WhatsApp" button
 * on the site should be wired through this file rather than hardcoding
 * wa.me links, so the number and message templates stay in one place.
 *
 * Usage in HTML:
 *   <a href="#" data-wa-message="sedot-wc" data-wa-context="hero">Chat WhatsApp</a>
 *
 * Usage in JS:
 *   const url = WA.buildUrl(WA.templates.wcMampet("Kebayoran Baru"));
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  function digitsOnly(value) {
    return String(value || "").replace(/[^0-9]/g, "");
  }

  function buildUrl(message) {
    var cfg = window.SITE_CONFIG || {};
    var number = digitsOnly(cfg.BUSINESS_WHATSAPP);
    var text = encodeURIComponent(message || "");
    return "https://wa.me/" + number + (text ? "?text=" + text : "");
  }

  // Prefilled message templates, one per conversion context.
  var templates = {
    generic: function () {
      return "Halo NARAYA, saya ingin bertanya tentang jasa sedot WC.";
    },
    // Dipakai bar promo harga di header (semua halaman).
    promo: function () {
      return (
        "Halo NARAYA, saya lihat promo sedot WC mulai Rp375.000 di website. " +
        "Mohon info harga dan jadwal untuk lokasi saya."
      );
    },
    // Dipakai tombol di halaman /harga.html.
    harga: function (layanan) {
      return (
        "Halo NARAYA, saya ingin menanyakan harga" +
        (layanan ? " untuk layanan " + layanan : " layanan sedot WC") +
        ". Mohon estimasi biaya dan jadwal terdekat."
      );
    },
    sedotWc: function () {
      return "Halo NARAYA, saya ingin menggunakan jasa sedot WC (promo mulai Rp375.000). Mohon informasi harga dan jadwal.";
    },
    sedotSepticTank: function () {
      return "Halo NARAYA, saya ingin menggunakan jasa sedot septic tank (promo mulai Rp375.000). Mohon informasi harga dan jadwal.";
    },
    wcMampet: function (area) {
      return (
        "Halo NARAYA, WC saya mampet" +
        (area ? " di area " + area : "") +
        ". Saya ingin bertanya apakah bisa ditangani."
      );
    },
    septicTankPenuh: function () {
      return "Halo NARAYA, septic tank saya sudah penuh. Mohon informasi jadwal penyedotan dan biayanya.";
    },
    sedotLimbah: function () {
      return "Halo NARAYA, saya ingin bertanya tentang jasa sedot limbah untuk tempat usaha saya.";
    },
    area: function (area) {
      return (
        "Halo NARAYA, saya berada di " +
        (area || "area saya") +
        " dan membutuhkan jasa sedot WC."
      );
    },
    blog: function (title) {
      return (
        "Halo NARAYA, saya membaca artikel \"" +
        (title || "") +
        "\" dan ingin bertanya lebih lanjut."
      );
    },
  };

  function trackClick(context) {
    if (typeof window.trackEvent === "function") {
      window.trackEvent("whatsapp_click", { context: context || "unknown" });
    }
  }

  // Wire up any element with data-wa-message / data-wa-context / data-wa-area.
  // Dipanggil beberapa kali: saat DOMContentLoaded (tombol yang sudah ada
  // di halaman), saat "header:ready" (tombol WhatsApp di header) dan saat
  // "footer:ready" (tombol WhatsApp di footer) — keduanya baru muncul
  // setelah include-header.js / include-footer.js selesai fetch. Guard
  // data-wa-wired mencegah tombol yang sama di-wire dua kali.
  function init() {
    var nodes = document.querySelectorAll(
      "[data-wa-message]:not([data-wa-wired])"
    );
    nodes.forEach(function (node) {
      node.setAttribute("data-wa-wired", "true");

      var key = node.getAttribute("data-wa-message");
      var area = node.getAttribute("data-wa-area") || "";
      var context = node.getAttribute("data-wa-context") || key;
      var fn = templates[key] || templates.generic;
      var href = buildUrl(fn(area));

      if (node.tagName === "A") {
        node.setAttribute("href", href);
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener");
      }

      node.addEventListener("click", function () {
        trackClick(context);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("header:ready", init);
  document.addEventListener("footer:ready", init);

  window.WA = {
    buildUrl: buildUrl,
    templates: templates,
  };
})();
