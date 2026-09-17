/**
 * analytics.js
 * ------------------------------------------------------------------
 * Minimal GA4 loader + a single trackEvent() function used across the
 * site (whatsapp_click, phone_click, contact_form_submit, etc).
 *
 * GA4 only loads if:
 *   1. window.SITE_CONFIG.GA_MEASUREMENT_ID is set, AND
 *   2. the visitor has accepted analytics in the consent banner
 *      (see consent.js), unless no consent gate is required in your
 *      jurisdiction — adjust CONSENT_REQUIRED below with legal advice.
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var CONSENT_REQUIRED = true;
  var CONSENT_KEY = "sedotwc_consent";
  var gaLoaded = false;

  function hasConsent() {
    if (!CONSENT_REQUIRED) return true;
    try {
      return window.localStorage.getItem(CONSENT_KEY) === "granted";
    } catch (e) {
      return false;
    }
  }

  function loadGA() {
    var cfg = window.SITE_CONFIG || {};
    var id = cfg.GA_MEASUREMENT_ID;
    if (!id || gaLoaded) return;
    gaLoaded = true;

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", id, { anonymize_ip: true });
  }

  /**
   * trackEvent(name, params)
   * Fires a GA4 event if analytics are loaded/consented; always logs
   * locally in dev via console for debugging. Never throws.
   */
  window.trackEvent = function (name, params) {
    try {
      if (hasConsent()) {
        loadGA();
        if (typeof window.gtag === "function") {
          window.gtag("event", name, params || {});
        }
      }
    } catch (e) {
      // Analytics must never break the page.
      if (window.console) console.warn("trackEvent failed", e);
    }
  };

  // Re-check consent + load GA on page load (in case consent was
  // already granted in a previous session).
  document.addEventListener("DOMContentLoaded", function () {
    if (hasConsent()) loadGA();

    // Generic click tracking for phone links.
    document.querySelectorAll('a[href^="tel:"]').forEach(function (node) {
      node.addEventListener("click", function () {
        window.trackEvent("phone_click", {
          context: node.getAttribute("data-context") || "unknown",
        });
      });
    });
  });

  window.__consent = {
    key: CONSENT_KEY,
    grant: function () {
      try {
        window.localStorage.setItem(CONSENT_KEY, "granted");
      } catch (e) {}
      loadGA();
    },
    deny: function () {
      try {
        window.localStorage.setItem(CONSENT_KEY, "denied");
      } catch (e) {}
    },
    isRequired: CONSENT_REQUIRED,
    hasDecision: function () {
      try {
        return !!window.localStorage.getItem(CONSENT_KEY);
      } catch (e) {
        return false;
      }
    },
  };
})();
