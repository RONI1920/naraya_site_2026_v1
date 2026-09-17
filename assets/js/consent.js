/**
 * consent.js — tiny consent banner for analytics only.
 * WhatsApp/phone links and the contact form never depend on consent.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.__consent || !window.__consent.isRequired) return;
    if (window.__consent.hasDecision()) return;

    var bar = document.createElement("div");
    bar.className = "consent-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Persetujuan cookie");
    var BASE_PATH = window.__BASE_PATH || "";
    bar.innerHTML =
      '<p class="consent-bar__text">Kami menggunakan cookie analitik untuk memahami penggunaan situs. ' +
      '<a href="' + BASE_PATH + 'privacy-policy.html">Selengkapnya</a>.</p>' +
      '<div class="consent-bar__actions">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-consent="deny">Tolak</button>' +
      '<button type="button" class="btn btn--primary btn--sm" data-consent="grant">Terima</button>' +
      "</div>";
    document.body.appendChild(bar);

    bar.addEventListener("click", function (e) {
      var action = e.target.getAttribute("data-consent");
      if (!action) return;
      if (action === "grant") window.__consent.grant();
      if (action === "deny") window.__consent.deny();
      bar.remove();
    });
  });
})();
