/**
 * include-footer.js
 * ------------------------------------------------------------------
 * Memuat markup footer dari SATU sumber (/partials/footer.html) ke
 * dalam placeholder <div id="site-footer"></div> di setiap halaman,
 * supaya footer cukup diedit di satu tempat saja — sama seperti pola
 * header (lihat include-header.js).
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var placeholder = document.getElementById("site-footer");
  if (!placeholder) return;

  // BASE_PATH dihitung di config.js (harus dimuat sebelum script ini).
  var BASE_PATH = window.__BASE_PATH || "";

  fetch(BASE_PATH + "partials/footer.html")
    .then(function (res) {
      if (!res.ok) throw new Error("Gagal memuat footer (" + res.status + ")");
      return res.text();
    })
    .then(function (html) {
      placeholder.outerHTML = html;

      // Sama seperti include-header.js: partials/footer.html ditulis
      // root-absolute ("/xxx"), di sini di-rewrite jadi relatif sesuai
      // kedalaman halaman (BASE_PATH).
      var rewritables = document.querySelectorAll(
        '.site-footer [href^="/"], .site-footer [src^="/"]'
      );
      rewritables.forEach(function (el) {
        ["href", "src"].forEach(function (attr) {
          var val = el.getAttribute(attr);
          if (!val || val.indexOf("//") === 0) return;
          if (val.charAt(0) === "/") {
            el.setAttribute(attr, BASE_PATH + (val === "/" ? "index.html" : val.slice(1)));
          }
        });
      });

      // Nomor telepon footer diambil dari config.js (SITE_CONFIG.BUSINESS_PHONE),
      // supaya ganti nomor cukup di satu tempat. Elemen yang ditandai
      // data-config-phone diisi href "tel:..." dan teks nomornya. Kalau
      // nomor di config kosong, barisnya disembunyikan (tidak ada link kosong).
      var phone = (window.SITE_CONFIG && window.SITE_CONFIG.BUSINESS_PHONE) || "";
      document
        .querySelectorAll(".site-footer [data-config-phone]")
        .forEach(function (a) {
          if (!phone) {
            var row = a.closest("p");
            if (row) row.hidden = true;
            return;
          }
          a.setAttribute("href", "tel:" + phone.replace(/[^\d+]/g, ""));
          a.textContent = phone;
        });

      // Beri tahu script lain (tombol WhatsApp di footer, tahun berjalan
      // di #current-year) bahwa footer sudah ada di DOM dan siap di-wire —
      // keduanya baru muncul setelah fetch ini selesai, bukan langsung
      // saat DOMContentLoaded.
      document.dispatchEvent(new CustomEvent("footer:ready"));
    })
    .catch(function (err) {
      console.error("[include-footer]", err);
      // Fallback minimal supaya halaman tidak kehilangan footer sama
      // sekali kalau fetch gagal (mis. dibuka lewat file://).
      placeholder.outerHTML =
        '<footer class="site-footer"><div class="container">' +
        '<div class="footer-bottom"><span>&copy; ' +
        new Date().getFullYear() +
        " NARAYA Sedot WC &amp; Solusi Sanitasi.</span></div></div></footer>";
    });
})();