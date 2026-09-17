/**
 * include-header.js
 * ------------------------------------------------------------------
 * Memuat markup header dari SATU sumber (/partials/header.html) ke
 * dalam placeholder <div id="site-header"></div> di setiap halaman,
 * supaya header cukup diedit di satu tempat saja.
 *
 * Konteks tombol "Chat WhatsApp" di header bisa disesuaikan per
 * halaman lewat atribut di <body>, contoh:
 *
 *   <body data-header-wa-message="area" data-header-wa-area="Bogor">
 *   <body data-header-wa-message="sedotWc">
 *
 * Kalau tidak diisi, defaultnya "generic" (lihat WA.templates di
 * whatsapp.js untuk daftar key yang valid).
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var placeholder = document.getElementById("site-header");
  if (!placeholder) return;

  // BASE_PATH dihitung di config.js (harus dimuat sebelum script ini).
  var BASE_PATH = window.__BASE_PATH || "";

  fetch(BASE_PATH + "partials/header.html")
    .then(function (res) {
      if (!res.ok) throw new Error("Gagal memuat header (" + res.status + ")");
      return res.text();
    })
    .then(function (html) {
      placeholder.outerHTML = html;

      // partials/header.html ditulis dengan link root-absolute ("/xxx")
      // supaya gampang dibaca/di-maintain satu sumber. Di sini kita
      // ubah jadi relatif sesuai kedalaman halaman saat ini (BASE_PATH),
      // supaya tetap benar baik di domain root maupun di subpath
      // (mis. https://username.github.io/nama-repo/).
      var rewritables = document.querySelectorAll(
        '.site-header [href^="/"], .site-header [src^="/"]'
      );
      rewritables.forEach(function (el) {
        ["href", "src"].forEach(function (attr) {
          var val = el.getAttribute(attr);
          if (!val || val.indexOf("//") === 0) return; // biarkan protocol-relative URL
          if (val.charAt(0) === "/") {
            el.setAttribute(attr, BASE_PATH + (val === "/" ? "index.html" : val.slice(1)));
          }
        });
      });

      // Sesuaikan tombol WhatsApp di header dengan konteks halaman ini,
      // sebelum whatsapp.js memprosesnya (lihat event "header:ready").
      var cta = document.querySelector(".site-header .header-cta");
      if (cta) {
        var body = document.body;
        var message = body.getAttribute("data-header-wa-message");
        var area = body.getAttribute("data-header-wa-area");
        if (message) cta.setAttribute("data-wa-message", message);
        if (area) cta.setAttribute("data-wa-area", area);
      }

      // Tandai link nav yang aktif (opsional, bantu aksesibilitas/SEO).
      // Bandingkan .href (sudah di-resolve browser jadi absolute URL)
      // supaya tetap akurat walau markup-nya relatif.
      var here = window.location.href.split(/[?#]/)[0].replace(/\/index\.html$/, "/");
      var navLinks = document.querySelectorAll(".primary-nav a[href]");
      for (var i = 0; i < navLinks.length; i++) {
        var linkUrl = navLinks[i].href.split(/[?#]/)[0].replace(/\/index\.html$/, "/");
        if (linkUrl === here) {
          navLinks[i].setAttribute("aria-current", "page");
          break;
        }
      }

      // Beri tahu script lain (nav-toggle, tombol WhatsApp) bahwa
      // header sudah ada di DOM dan siap di-wire.
      document.dispatchEvent(new CustomEvent("header:ready"));
    })
    .catch(function (err) {
      console.error("[include-header]", err);
      // Fallback minimal supaya halaman tidak kehilangan navigasi ke
      // beranda kalau fetch gagal (mis. dibuka lewat file://).
      placeholder.outerHTML =
        '<header class="site-header"><div class="container">' +
        '<a href="' + BASE_PATH + 'index.html" class="brand"><span class="brand__text">' +
        '<span class="brand__name">NARAYA</span>' +
        '<span class="brand__tag">Sedot WC &amp; Solusi Sanitasi</span>' +
        "</span></a>" +
        "</div></header>";
    });
})();
