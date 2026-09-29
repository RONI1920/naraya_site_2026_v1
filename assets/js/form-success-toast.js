/**
 * form-success-toast.js
 * ------------------------------------------------------------------
 * Notifikasi "Pesan terkirim" yang jelas terlihat (overlay di tengah
 * layar), gaya serupa .success-view di pesan.html, tapi tidak
 * menyentuh pesan.html sama sekali. Dipanggil secara opsional oleh
 * contact-form.js lewat window.showFormSuccessToast(options).
 *
 * Tidak boleh melempar error ke luar -- kegagalan toast tidak boleh
 * mengganggu form kontak. Semua style di-inject sekali lewat JS
 * (bukan menambah/mengubah CSS global), semua class berawalan
 * "nr-toast" supaya tidak bertabrakan dengan style yang sudah ada.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var STYLE_ID = "nr-toast-style";
  var DEFAULT_TITLE = "Pesan terkirim";
  var DEFAULT_MESSAGE =
    "Terima kasih. Pesan Anda sudah kami terima dan akan segera kami tindak lanjuti.";
  var DEFAULT_DURATION = 3000;

  var current = null; // { root, hideTimer, onKeydown }

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      ".nr-toast-overlay{position:fixed;top:0;left:0;right:0;bottom:0;" +
      "background:rgba(13,43,41,.45);display:flex;align-items:center;" +
      "justify-content:center;padding:24px;z-index:99999;" +
      "font-family:var(--font-body,\"Plus Jakarta Sans\",\"Segoe UI\",sans-serif);" +
      "opacity:0;transition:opacity .2s ease;}" +
      ".nr-toast-overlay.nr-toast-show{opacity:1;}" +
      ".nr-toast-card{position:relative;background:var(--paper,#fff);" +
      "border:1px solid var(--line,#E4E9E7);border-radius:16px;" +
      "max-width:320px;width:100%;padding:40px 24px 32px;text-align:center;" +
      "box-shadow:0 20px 50px rgba(13,43,41,.25);" +
      "transform:scale(.85);opacity:0;" +
      "transition:transform .2s ease,opacity .2s ease;}" +
      ".nr-toast-overlay.nr-toast-show .nr-toast-card{transform:scale(1);opacity:1;}" +
      ".nr-toast-card.nr-toast-pop{animation:nr-toast-pop-in .45s cubic-bezier(.26,1.4,.5,1);}" +
      "@keyframes nr-toast-pop-in{0%{transform:scale(.3);opacity:0;}100%{transform:scale(1);opacity:1;}}" +
      ".nr-toast-icon{width:56px;height:56px;margin:0 auto 16px;display:block;}" +
      ".nr-toast-title{font-size:18px;font-weight:800;margin:0 0 8px;" +
      "color:var(--ink,#0D2B29);}" +
      ".nr-toast-message{font-size:14px;line-height:1.6;margin:0;" +
      "color:var(--ink-soft,#163B38);}" +
      ".nr-toast-close{position:absolute;top:10px;right:10px;width:28px;height:28px;" +
      "border:none;background:transparent;border-radius:50%;cursor:pointer;" +
      "font-size:18px;line-height:1;color:var(--ink-soft,#163B38);}" +
      ".nr-toast-close:hover,.nr-toast-close:focus{background:var(--teal-100,#DCF2EE);}" +
      "@media (prefers-reduced-motion: reduce){" +
      ".nr-toast-overlay,.nr-toast-card{transition:none;}" +
      ".nr-toast-card.nr-toast-pop{animation:none;}}";
    document.head.appendChild(style);
  }

  function buildIconSvg() {
    return (
      '<svg class="nr-toast-icon" viewBox="0 0 56 56" fill="none" aria-hidden="true">' +
      '<circle cx="28" cy="28" r="27" stroke="#10A28F" stroke-width="2" />' +
      '<path d="M17 29 L24 36 L39 20" stroke="#10A28F" stroke-width="3.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" />' +
      "</svg>"
    );
  }

  function prefersReducedMotion() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (e) {
      return false;
    }
  }

  function clearCurrent() {
    if (!current) return;
    if (current.hideTimer) window.clearTimeout(current.hideTimer);
    if (current.onKeydown) {
      document.removeEventListener("keydown", current.onKeydown);
    }
    if (current.root && current.root.parentNode) {
      current.root.parentNode.removeChild(current.root);
    }
    current = null;
  }

  function hideToast() {
    if (!current) return;
    var root = current.root;
    clearCurrent();
    if (root) {
      root.classList.remove("nr-toast-show");
      // Biarkan transisi opacity selesai sebelum benar-benar dihapus
      // (root sudah dilepas dari `current`, jadi aman dihapus di sini).
      window.setTimeout(function () {
        if (root.parentNode) root.parentNode.removeChild(root);
      }, 250);
    }
  }

  function showFormSuccessToast(options) {
    try {
      var opts = options || {};
      var title = opts.title || DEFAULT_TITLE;
      var message = opts.message || DEFAULT_MESSAGE;
      var duration =
        typeof opts.duration === "number" ? opts.duration : DEFAULT_DURATION;

      injectStyleOnce();

      // Kalau masih ada toast tampil, ganti (jangan menumpuk).
      clearCurrent();

      var reduceMotion = prefersReducedMotion();

      var overlay = document.createElement("div");
      overlay.className = "nr-toast-overlay";
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");

      var card = document.createElement("div");
      card.className = "nr-toast-card" + (reduceMotion ? "" : " nr-toast-pop");

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "nr-toast-close";
      closeBtn.setAttribute("aria-label", "Tutup");
      closeBtn.innerHTML = "&times;";

      var titleEl = document.createElement("h2");
      titleEl.className = "nr-toast-title";
      titleEl.textContent = title;

      var messageEl = document.createElement("p");
      messageEl.className = "nr-toast-message";
      messageEl.textContent = message;

      card.innerHTML = buildIconSvg();
      card.appendChild(titleEl);
      card.appendChild(messageEl);
      card.appendChild(closeBtn);
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Trigger transisi masuk (butuh reflow sebelum menambah class).
      window.setTimeout(function () {
        overlay.classList.add("nr-toast-show");
      }, 10);

      function onKeydown(e) {
        if (e.key === "Escape" || e.keyCode === 27) hideToast();
      }

      function onOverlayClick(e) {
        if (e.target === overlay) hideToast();
      }

      closeBtn.addEventListener("click", hideToast);
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onKeydown);

      var hideTimer = window.setTimeout(hideToast, duration);

      current = {
        root: overlay,
        hideTimer: hideTimer,
        onKeydown: onKeydown,
      };
    } catch (e) {
      // Kegagalan toast tidak boleh mengganggu form kontak.
    }
  }

  window.showFormSuccessToast = showFormSuccessToast;
})();
