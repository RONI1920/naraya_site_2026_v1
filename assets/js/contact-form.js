/**
 * contact-form.js
 * ------------------------------------------------------------------
 * Handles the short lead form (#lead-form). Client-side checks here
 * are a UX convenience only — the real enforcement is Postgres CHECK
 * constraints + RLS INSERT policies in supabase/migrations. Never
 * trust this file alone for security.
 *
 * Anti-spam:
 *   - honeypot field (must stay empty)
 *   - minimum fill time (bots submit instantly)
 *   - client-side throttle (one submit per 60s per browser)
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var MIN_FILL_SECONDS = 3;
  var THROTTLE_KEY = "sedotwc_last_submit";
  var THROTTLE_MS = 60 * 1000;

  // Harus tetap sinkron dengan CHECK constraint di
  // supabase/migrations/005_reservation_schedule.sql dan daftar
  // <option> di kontak.html.
  var VALID_TIME_SLOTS = [
    "Secepatnya",
    "07:00-09:00",
    "09:00-11:00",
    "11:00-13:00",
    "13:00-15:00",
    "15:00-17:00",
    "17:00-19:00",
  ];

  function todayIsoDate() {
    var d = new Date();
    var offset = d.getTimezoneOffset();
    var local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 10);
  }

  // Cegah user memilih tanggal di masa lalu langsung dari date picker.
  function setMinDateOnLoad(form) {
    var dateInput = form.querySelector('[name="preferred_date"]');
    if (dateInput) dateInput.min = todayIsoDate();
  }

  function sanitize(str, maxLen) {
    return String(str || "")
      .trim()
      .slice(0, maxLen || 500)
      .replace(/[<>]/g, "");
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

  function setStatus(form, message, isError) {
    var el = form.querySelector(".form-status");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("form-status--error", !!isError);
    el.classList.toggle("form-status--success", !isError);
  }

  function getUtmParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: sanitize(params.get("utm_source"), 100),
      utm_medium: sanitize(params.get("utm_medium"), 100),
      utm_campaign: sanitize(params.get("utm_campaign"), 100),
    };
  }

  function handleSubmit(form, loadedAt) {
    return function (e) {
      e.preventDefault();

      var honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) {
        // Silently drop — likely a bot. Pretend success.
        setStatus(form, "Terima kasih, pesan Anda telah kami terima.");
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
          "Anda baru saja mengirim pesan. Silakan tunggu sebentar, atau hubungi kami via WhatsApp untuk respon lebih cepat.",
          true
        );
        return;
      }

      var name = sanitize(form.name.value, 100);
      var phone = sanitize(form.phone.value, 20).replace(/[^0-9+]/g, "");
      var service = sanitize(form.service.value, 100);
      var area = sanitize(form.area.value, 100);
      var alamat = sanitize(form.alamat ? form.alamat.value : "", 500);
      var messageRaw = sanitize(form.message.value, 1000);
      // Gabungkan alamat lengkap (kalau diisi) ke depan pesan, sama seperti
      // pesan.html — supaya tidak perlu kolom baru di tabel `leads`.
      var message = [alamat ? "Alamat: " + alamat : "", messageRaw]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 1000);

      var preferredDateRaw = form.preferred_date ? form.preferred_date.value : "";
      var preferredTimeSlotRaw = form.preferred_time_slot
        ? form.preferred_time_slot.value
        : "";

      // Titik lokasi dari location-picker.js (lihat file itu). Semuanya
      // opsional — kalau pelanggan tidak menandai peta, field-field ini
      // kosong dan dikirim sebagai null, form tetap valid.
      var locationLatRaw = form.location_lat ? form.location_lat.value : "";
      var locationLngRaw = form.location_lng ? form.location_lng.value : "";
      var locationAccuracyRaw = form.location_accuracy ? form.location_accuracy.value : "";
      var locationSourceRaw = form.location_source ? form.location_source.value : "";

      var locationLat = locationLatRaw ? parseFloat(locationLatRaw) : null;
      var locationLng = locationLngRaw ? parseFloat(locationLngRaw) : null;
      var locationAccuracy = locationAccuracyRaw ? parseInt(locationAccuracyRaw, 10) : null;
      var locationSource =
        locationSourceRaw === "gps" || locationSourceRaw === "manual" ? locationSourceRaw : null;

      // Jaga-jaga: kalau nilai lat/lng ternyata rusak (bukan angka
      // valid / di luar rentang bumi), jangan ikut kirim daripada
      // mengirim data lokasi yang salah ke tim lapangan.
      if (
        locationLat === null ||
        locationLng === null ||
        isNaN(locationLat) ||
        isNaN(locationLng) ||
        locationLat < -90 ||
        locationLat > 90 ||
        locationLng < -180 ||
        locationLng > 180
      ) {
        locationLat = null;
        locationLng = null;
        locationAccuracy = null;
        locationSource = null;
      }

      if (!name || name.length < 2) {
        setStatus(form, "Mohon isi nama Anda.", true);
        return;
      }
      if (!phone || phone.length < 8) {
        setStatus(form, "Mohon isi nomor WhatsApp/telepon yang valid.", true);
        return;
      }

      // Keduanya opsional, tapi kalau diisi harus valid — dan tanggal
      // tidak boleh di masa lalu (validasi UX; enforcement sebenarnya
      // tetap di database via CHECK constraint utk time slot).
      var preferredDate = null;
      if (preferredDateRaw) {
        if (preferredDateRaw < todayIsoDate()) {
          setStatus(form, "Tanggal kedatangan tidak boleh tanggal yang sudah lewat.", true);
          return;
        }
        preferredDate = preferredDateRaw;
      }

      var preferredTimeSlot = null;
      if (preferredTimeSlotRaw) {
        if (VALID_TIME_SLOTS.indexOf(preferredTimeSlotRaw) === -1) {
          setStatus(form, "Jam kedatangan tidak valid. Mohon pilih dari daftar.", true);
          return;
        }
        preferredTimeSlot = preferredTimeSlotRaw;
      }

      var payload = Object.assign(
        {
          name: name,
          phone: phone,
          service: service,
          area: area,
          message: message,
          preferred_date: preferredDate,
          preferred_time_slot: preferredTimeSlot,
          location_lat: locationLat,
          location_lng: locationLng,
          location_accuracy_m: locationAccuracy,
          location_source: locationSource,
          source_page: window.location.pathname,
        },
        getUtmParams()
      );

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      submitLead(payload)
        .then(function () {
          setThrottle();
          setStatus(
            form,
            "Terima kasih! Pesan Anda telah kami terima. Untuk respon tercepat, silakan hubungi kami langsung via WhatsApp."
          );
          form.reset();
        })
        .catch(function () {
          setStatus(
            form,
            "Maaf, terjadi kendala saat mengirim. Silakan hubungi kami langsung via WhatsApp.",
            true
          );
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    };
  }

  function submitLead(payload) {
    if (window.sb) {
      return window.sb
        .from("leads")
        .insert([payload])
        .then(function (res) {
          if (res.error) throw res.error;
          if (typeof window.trackEvent === "function") {
            window.trackEvent("contact_form_submit", {
              service: payload.service,
            });
          }
        });
    }
    // No Supabase configured yet — do not fail hard, just resolve so
    // the visitor still sees a friendly message and is nudged to WA.
    return Promise.resolve();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("lead-form");
    if (!form) return;
    setMinDateOnLoad(form);
    var loadedAt = Date.now();
    form.addEventListener("submit", handleSubmit(form, loadedAt));
  });
})();
