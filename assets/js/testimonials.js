/**
 * testimonials.js
 * ------------------------------------------------------------------
 * Two jobs, both scoped only to their own sections:
 *
 * 1. Load published testimonials from Supabase (`testimonials` table,
 *    is_published = true) and render them:
 *      - more than 1  -> single-row auto-scrolling marquee,
 *                        right-to-left, infinite loop, pauses on
 *                        hover/focus (unless the user's OS asks for
 *                        reduced motion — then falls back to a plain
 *                        wrapping grid, no animation).
 *      - exactly 1    -> shown as a single static card (nothing to
 *                        scroll).
 *    Adjust MARQUEE_SECONDS_PER_CARD below to tune the speed.
 *
 * 2. Handle the "submit your testimonial" form (#testimonial-form).
 *    New submissions always insert with is_published = false — they
 *    stay invisible on the site until you approve them from the
 *    Supabase dashboard. Client-side checks here are UX only; the
 *    real enforcement is the RLS policy in
 *    supabase/migrations/004_public_testimonial_submit.sql.
 *
 * Fail-safe behavior (this is the important part):
 *   If Supabase is not configured, unreachable, or the project is
 *   paused, BOTH #testimonials-section and #testimonial-form-section
 *   are hidden (via the `hidden` attribute). Nothing else on the page
 *   is touched — every other section keeps working normally.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var MIN_FILL_SECONDS = 3;
  var THROTTLE_KEY = "sedotwc_last_testimonial_submit";
  var THROTTLE_MS = 60 * 1000;

  // How many seconds of scroll-time per card in the marquee. Bigger
  // number = slower scroll. Total loop duration = count * this value.
  var MARQUEE_SECONDS_PER_CARD = 4.5;
  var MARQUEE_MIN_SECONDS = 18;

  function sanitize(str, maxLen) {
    return String(str || "")
      .trim()
      .slice(0, maxLen || 500)
      .replace(/[<>]/g, "");
  }

  function initials(name) {
    var first = String(name || "").trim().charAt(0);
    return first ? first.toUpperCase() : "?";
  }

  function renderStars(rating) {
    var stars = document.createElement("div");
    stars.className = "testimonial__stars";
    stars.setAttribute("aria-label", rating ? rating + " dari 5 bintang" : "Belum ada rating");

    var filled = Math.min(5, Math.max(0, parseInt(rating, 10) || 0));
    for (var i = 1; i <= 5; i++) {
      var star = document.createElement("span");
      star.textContent = "★";
      star.className = i <= filled ? "is-filled" : "is-empty";
      stars.appendChild(star);
    }
    return stars;
  }

  function buildSlide(row) {
    var block = document.createElement("blockquote");
    block.className = "testimonial";

    var top = document.createElement("div");
    top.className = "testimonial__top";

    var avatar = document.createElement("div");
    avatar.className = "avatar-badge";
    avatar.textContent = initials(row.customer_name);

    top.appendChild(avatar);
    top.appendChild(renderStars(row.rating));

    var p = document.createElement("p");
    p.textContent = '"' + row.content + '"';

    var cite = document.createElement("cite");
    cite.textContent = row.area
      ? row.customer_name + ", " + row.area
      : row.customer_name;

    block.appendChild(top);
    block.appendChild(p);
    block.appendChild(cite);
    return block;
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function renderGrid(list, rows) {
    list.innerHTML = "";
    list.className = "testimonial-grid";
    rows.forEach(function (row) {
      list.appendChild(buildSlide(row));
    });
  }

  function renderMarquee(list, rows) {
    list.innerHTML = "";
    list.className = "testimonial-marquee";

    var track = document.createElement("div");
    track.className = "testimonial-marquee__track";

    // Duplicate the row set once so the loop from -50% back to 0% is
    // seamless — the "second half" is identical to the first, so the
    // strip looks like it never stops moving.
    rows.concat(rows).forEach(function (row) {
      track.appendChild(buildSlide(row));
    });

    var duration = Math.max(rows.length * MARQUEE_SECONDS_PER_CARD, MARQUEE_MIN_SECONDS);
    track.style.animationDuration = duration + "s";

    list.appendChild(track);
  }

  function renderTestimonials(list, rows) {
    if (rows.length <= 1 || prefersReducedMotion()) {
      // Nothing to scroll, or the user's OS asked for reduced motion.
      renderGrid(list, rows);
    } else {
      // Always a single moving row for 2+ testimonials — never wraps
      // into multiple lines, regardless of how many there are.
      renderMarquee(list, rows);
    }
  }

  function isFormEnabled() {
    // Manual on/off switch — see TESTIMONIAL_FORM_ENABLED in config.js.
    // Defaults to enabled if the flag isn't present at all.
    var cfg = window.SITE_CONFIG || {};
    return cfg.TESTIMONIAL_FORM_ENABLED !== false;
  }

  function loadTestimonials() {
    var displaySection = document.getElementById("testimonials-section");
    var formSection = document.getElementById("testimonial-form-section");
    var list = document.getElementById("testimonials-list");

    if (!displaySection || !list) return;

    if (!window.sb) {
      // Supabase not configured (e.g. GANTI_ placeholders still in
      // config.js) — hide both sections, leave the rest of the page alone.
      displaySection.hidden = true;
      if (formSection) formSection.hidden = true;
      return;
    }

    window.sb
      .from("testimonials")
      .select("customer_name, area, content, rating, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(9)
      .then(function (res) {
        if (res.error) throw res.error;

        if (res.data && res.data.length > 0) {
          renderTestimonials(list, res.data);
          displaySection.hidden = false;
        } else {
          // Reachable, but nothing approved yet — no point showing an
          // empty "Kata Pelanggan" heading.
          displaySection.hidden = true;
        }

        // Supabase is reachable — but only show the form if you haven't
        // manually turned it off via TESTIMONIAL_FORM_ENABLED in config.js.
        if (formSection) formSection.hidden = !isFormEnabled();
      })
      .catch(function () {
        // Supabase paused / unreachable / any error — hide both,
        // fail silently. Rest of the page is untouched.
        displaySection.hidden = true;
        if (formSection) formSection.hidden = true;
      });
  }

  function setStatus(form, message, isError) {
    var el = form.querySelector(".form-status");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("form-status--error", !!isError);
    el.classList.toggle("form-status--success", !isError);
  }

  function isThrottled() {
    try {
      var last = Number(window.localStorage.getItem(THROTTLE_KEY) || 0);
      return Date.now() - last < THROTTLE_MS;
    } catch (e) {
      return false;
    }
  }

  function setThrottle() {
    try {
      window.localStorage.setItem(THROTTLE_KEY, String(Date.now()));
    } catch (e) {}
  }

  function handleFormSubmit(form, loadedAt) {
    return function (e) {
      e.preventDefault();

      if (!isFormEnabled()) {
        setStatus(form, "Maaf, pengiriman testimoni sedang dinonaktifkan.", true);
        return;
      }

      var honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) {
        // Silently drop — likely a bot. Pretend success.
        setStatus(form, "Terima kasih! Testimoni Anda telah kami terima.");
        form.reset();
        return;
      }

      var elapsedSeconds = (Date.now() - loadedAt) / 1000;
      if (elapsedSeconds < MIN_FILL_SECONDS) {
        setStatus(form, "Mohon tunggu sebentar sebelum mengirim.", true);
        return;
      }

      if (isThrottled()) {
        setStatus(
          form,
          "Anda baru saja mengirim testimoni. Silakan coba lagi nanti.",
          true
        );
        return;
      }

      var customer_name = sanitize(form.customer_name.value, 100);
      var area = sanitize(form.area.value, 100);
      var content = sanitize(form.content.value, 1000);
      var ratingRaw = form.rating ? form.rating.value : "";
      var rating = ratingRaw
        ? Math.min(5, Math.max(1, parseInt(ratingRaw, 10)))
        : null;

      if (!customer_name || customer_name.length < 2) {
        setStatus(form, "Mohon isi nama Anda.", true);
        return;
      }
      if (!content || content.length < 10) {
        setStatus(form, "Mohon tulis testimoni minimal 10 karakter.", true);
        return;
      }

      var payload = {
        customer_name: customer_name,
        area: area || null,
        content: content,
        rating: rating,
        is_published: false, // enforced again server-side by RLS — see migration 004
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      if (!window.sb) {
        setStatus(form, "Maaf, pengiriman testimoni sedang tidak tersedia.", true);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      window.sb
        .from("testimonials")
        .insert([payload])
        .then(function (res) {
          if (res.error) throw res.error;
          setThrottle();
          setStatus(
            form,
            "Terima kasih! Testimoni Anda telah kami terima dan akan tampil setelah kami tinjau."
          );
          form.reset();
          if (typeof window.trackEvent === "function") {
            window.trackEvent("testimonial_submit", {});
          }
        })
        .catch(function () {
          setStatus(
            form,
            "Maaf, terjadi kendala saat mengirim. Silakan coba lagi nanti.",
            true
          );
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadTestimonials();

    var form = document.getElementById("testimonial-form");
    if (form) {
      var loadedAt = Date.now();
      form.addEventListener("submit", handleFormSubmit(form, loadedAt));
    }
  });
})();