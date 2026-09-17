/**
 * main.js — shared, tiny, dependency-free UI behavior.
 */
(function () {
  "use strict";

  // Header dimuat async dari /partials/header.html (lihat
  // include-header.js), jadi .nav-toggle baru ada di DOM setelah event
  // "header:ready" ditembakkan — bukan langsung saat DOMContentLoaded.
  function wireNavToggle() {
    var navToggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("primary-nav");
    if (navToggle && nav && !navToggle.dataset.wired) {
      navToggle.dataset.wired = "true";
      navToggle.addEventListener("click", function () {
        var isOpen = nav.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }
  }

  document.addEventListener("header:ready", wireNavToggle);

  // Footer dimuat async dari /partials/footer.html (lihat
  // include-footer.js), jadi #current-year baru ada di DOM setelah event
  // "footer:ready" ditembakkan — bukan langsung saat DOMContentLoaded.
  function setFooterYear() {
    var yearEl = document.getElementById("current-year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  document.addEventListener("footer:ready", setFooterYear);

  document.addEventListener("DOMContentLoaded", function () {
    // Jaga-jaga kalau ada halaman dengan header statis (tanpa placeholder).
    wireNavToggle();

    // FAQ accordion (works without JS too, via <details>, but we
    // enhance analytics on open).
    document.querySelectorAll(".faq__item").forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (item.open && typeof window.trackEvent === "function") {
          window.trackEvent("faq_open", {
            question: item.getAttribute("data-question") || "",
          });
        }
      });
    });

    // Page-type view tracking, driven by a body[data-page-type] attribute.
    var pageType = document.body.getAttribute("data-page-type");
    if (pageType && typeof window.trackEvent === "function") {
      window.trackEvent(pageType + "_view", {
        path: window.location.pathname,
      });
    }

    // Jaga-jaga kalau ada halaman dengan footer statis (tanpa placeholder).
    setFooterYear();
  });
})();
