/**
 * analytics.js
 * ------------------------------------------------------------------
 * SATU-SATUNYA pemuat GA4 / Google Ads di situs ini (jangan tambahkan
 * snippet gtag lain di HTML — akan menyebabkan hitungan ganda).
 *
 * Cara kerja (Google Consent Mode v2):
 *  1. Semua izin default = "denied". gtag.js tetap dimuat sehingga
 *     konversi bisa dimodelkan Google tanpa cookie.
 *  2. Saat pengunjung menekan "Terima" (consent.js), izin di-update ke
 *     "granted" dan cookie penuh dipakai.
 *  3. Event (whatsapp_click, phone_click, contact_form_submit,
 *     lead_form_submit) SELALU dikirim; Google yang menyesuaikan
 *     penggunaannya sesuai status izin.
 *  4. gclid / utm disimpan per-sesi (sessionStorage) agar bisa ikut
 *     tersimpan bersama lead dan jadi penanda sumber di pesan WhatsApp.
 *
 * Konfigurasi di config.js: GA_MEASUREMENT_ID, GOOGLE_ADS_ID,
 * GOOGLE_ADS_CONVERSIONS.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var CONSENT_KEY = "sedotwc_consent";
  var ATTR_KEY = "naraya_attr";
  var ATTR_PARAMS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var cfg = window.SITE_CONFIG || {};

  /* ---------- Atribusi (gclid + utm), per sesi ---------- */
  function readAttr() {
    try { return JSON.parse(window.sessionStorage.getItem(ATTR_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function captureAttr() {
    try {
      var qs = new URLSearchParams(window.location.search);
      var stored = readAttr();
      var found = false;
      ATTR_PARAMS.forEach(function (k) {
        var v = qs.get(k);
        if (v) { stored[k] = String(v).slice(0, 200); found = true; }
      });
      if (found || !stored.landing_page) {
        if (!stored.landing_page) stored.landing_page = window.location.pathname;
      }
      window.sessionStorage.setItem(ATTR_KEY, JSON.stringify(stored));
    } catch (e) {}
  }
  captureAttr();

  window.NarayaAttribution = {
    get: function () { return readAttr(); },
    // Penanda singkat untuk pesan WhatsApp, mis. "gads-sedot-wc-depok".
    ref: function () {
      var a = readAttr();
      var fromAds = a.gclid || a.gbraid || a.wbraid || /google/i.test(a.utm_source || "");
      if (!fromAds) return "";
      var camp = (a.utm_campaign || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
      return "gads" + (camp ? "-" + camp : "");
    },
  };

  /* ---------- Consent Mode ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  function storedConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function consentState(granted) {
    var v = granted ? "granted" : "denied";
    return { ad_storage: v, analytics_storage: v, ad_user_data: v, ad_personalization: v };
  }

  gtag("consent", "default", Object.assign(consentState(storedConsent() === "granted"), { wait_for_update: 500 }));

  /* ---------- Muat gtag.js sekali saja ---------- */
  var tagId = cfg.GA_MEASUREMENT_ID || "";
  var adsId = cfg.GOOGLE_ADS_ID || "";
  var firstId = tagId || adsId;
  if (firstId) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(firstId);
    document.head.appendChild(s);
    gtag("js", new Date());
    if (tagId) gtag("config", tagId);
    if (adsId) gtag("config", adsId);
  }

  /* ---------- trackEvent ---------- */
  window.trackEvent = function (name, params) {
    try {
      if (!firstId) return;
      gtag("event", name, params || {});
      var conv = (cfg.GOOGLE_ADS_CONVERSIONS || {})[name];
      if (adsId && conv) {
        gtag("event", "conversion", { send_to: adsId + "/" + conv });
      }
    } catch (e) {
      if (window.console) console.warn("trackEvent failed", e);
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (node) {
      node.addEventListener("click", function () {
        window.trackEvent("phone_click", { context: node.getAttribute("data-context") || "unknown" });
      });
    });
  });

  /* ---------- API untuk consent.js ---------- */
  window.__consent = {
    key: CONSENT_KEY,
    grant: function () {
      try { window.localStorage.setItem(CONSENT_KEY, "granted"); } catch (e) {}
      gtag("consent", "update", consentState(true));
    },
    deny: function () {
      try { window.localStorage.setItem(CONSENT_KEY, "denied"); } catch (e) {}
      gtag("consent", "update", consentState(false));
    },
    isRequired: true,
    hasDecision: function () { return !!storedConsent(); },
  };
})();
