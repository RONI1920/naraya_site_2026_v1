/**
 * location-picker.js
 * ------------------------------------------------------------------
 * Peta interaktif di form kontak (#lead-form) supaya pelanggan bisa
 * menandai titik lokasi rumah/tempat usaha secara akurat, sehingga
 * tim lapangan tiba di koordinat yang benar-benar sesuai Google Maps
 * — bukan hanya mengandalkan nama jalan yang diketik manual.
 *
 * Pakai Leaflet + tile OpenStreetMap (gratis, tanpa API key / billing
 * Google Cloud) supaya bisa langsung dipakai tanpa setup tambahan.
 * Koordinat yang dihasilkan (lat/lng) adalah standar GPS universal —
 * tetap 100% akurat dibuka di Google Maps oleh tim lapangan, walau
 * peta yang tampil ke pelanggan pakai tile OpenStreetMap.
 *
 * Alur:
 *   1. Pelanggan tap "Gunakan Lokasi Saya" -> browser minta izin GPS
 *      (Geolocation API) -> peta pindah + pin ke lokasi itu.
 *   2. Pelanggan bisa geser pin atau tap titik lain di peta untuk
 *      koreksi manual (mis. GPS meleset ke jalan sebelah).
 *   3. lat/lng/akurasi/sumber disimpan ke hidden input, ikut terkirim
 *      bersama form ke tabel `leads` (lihat contact-form.js).
 *
 * Sepenuhnya OPSIONAL — form tetap valid & bisa dikirim tanpa lokasi
 * ditandai (misalnya pelanggan menolak izin GPS atau JS gagal load).
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var DEFAULT_ZOOM = 16;
  var GEOLOCATION_TIMEOUT_MS = 12000;

  function fmtCoord(n) {
    return Number(n).toFixed(6);
  }

  function initLocationPicker() {
    var mapEl = document.getElementById("location-picker-map");
    var form = document.getElementById("lead-form");
    if (!mapEl || !form || typeof window.L === "undefined") return;

    var latInput = form.querySelector('[name="location_lat"]');
    var lngInput = form.querySelector('[name="location_lng"]');
    var accInput = form.querySelector('[name="location_accuracy"]');
    var srcInput = form.querySelector('[name="location_source"]');
    var statusEl = document.getElementById("location-picker-status");
    var gpsBtn = document.getElementById("location-picker-gps-btn");
    var clearBtn = document.getElementById("location-picker-clear-btn");
    var mapsLink = document.getElementById("location-picker-maps-link");

    // Pusat awal peta: alamat markas NARAYA (dari config.js), supaya
    // peta tidak kosong/tidak nyasar ke tengah laut sebelum pelanggan
    // memilih lokasi mereka sendiri.
    var cfg = window.SITE_CONFIG || {};
    var startLat = typeof cfg.BUSINESS_LATITUDE === "number" ? cfg.BUSINESS_LATITUDE : -6.2;
    var startLng = typeof cfg.BUSINESS_LONGITUDE === "number" ? cfg.BUSINESS_LONGITUDE : 106.816666;

    var map = window.L.map(mapEl, {
      center: [startLat, startLng],
      zoom: 11,
      scrollWheelZoom: false, // supaya scroll halaman tidak "kejebak" di peta saat di HP
    });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Aktifkan scroll-zoom hanya setelah peta di-tap/klik, supaya tidak
    // mengganggu scroll halaman saat pengunjung sedang menggulir form.
    map.on("click focus", function () {
      map.scrollWheelZoom.enable();
    });

    var marker = null;

    function setStatus(text, isError) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.classList.toggle("location-picker__status--error", !!isError);
      statusEl.classList.toggle("location-picker__status--set", !isError && !!text);
    }

    function setCoords(lat, lng, source, accuracyM) {
      latInput.value = fmtCoord(lat);
      lngInput.value = fmtCoord(lng);
      srcInput.value = source;
      accInput.value = accuracyM ? Math.round(accuracyM) : "";

      if (!marker) {
        marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", function () {
          var pos = marker.getLatLng();
          setCoords(pos.lat, pos.lng, "manual", null);
        });
      } else {
        marker.setLatLng([lat, lng]);
      }
      map.setView([lat, lng], Math.max(map.getZoom(), DEFAULT_ZOOM));

      var label =
        source === "gps"
          ? "Lokasi GPS Anda telah ditandai. Geser pin kalau kurang tepat."
          : "Titik lokasi ditandai manual. Geser pin untuk koreksi.";
      setStatus("\u2713 " + label + " (" + fmtCoord(lat) + ", " + fmtCoord(lng) + ")");

      if (mapsLink) {
        mapsLink.href = "https://www.google.com/maps?q=" + lat + "," + lng;
        mapsLink.hidden = false;
      }
      if (clearBtn) clearBtn.hidden = false;
    }

    function clearCoords() {
      latInput.value = "";
      lngInput.value = "";
      accInput.value = "";
      srcInput.value = "";
      if (marker) {
        map.removeLayer(marker);
        marker = null;
      }
      setStatus("");
      if (mapsLink) mapsLink.hidden = true;
      if (clearBtn) clearBtn.hidden = true;
    }

    // Tap/klik di peta = tandai/koreksi manual.
    map.on("click", function (e) {
      setCoords(e.latlng.lat, e.latlng.lng, "manual", null);
    });

    if (gpsBtn) {
      gpsBtn.addEventListener("click", function () {
        if (!("geolocation" in navigator)) {
          setStatus("Perangkat/browser ini tidak mendukung lokasi otomatis. Silakan tap peta secara manual.", true);
          return;
        }
        gpsBtn.disabled = true;
        var originalLabel = gpsBtn.textContent;
        gpsBtn.textContent = "Mencari lokasi\u2026";
        setStatus("Mencari sinyal GPS\u2026 pastikan izin lokasi diizinkan di browser.");

        navigator.geolocation.getCurrentPosition(
          function (pos) {
            gpsBtn.disabled = false;
            gpsBtn.textContent = originalLabel;
            setCoords(
              pos.coords.latitude,
              pos.coords.longitude,
              "gps",
              pos.coords.accuracy
            );
          },
          function (err) {
            gpsBtn.disabled = false;
            gpsBtn.textContent = originalLabel;
            var msg = "Tidak bisa mengambil lokasi otomatis. Silakan tap titik lokasi Anda langsung di peta.";
            if (err && err.code === 1) {
              msg = "Izin lokasi ditolak. Anda tetap bisa menandai lokasi dengan tap langsung di peta di bawah.";
            }
            setStatus(msg, true);
          },
          {
            enableHighAccuracy: true,
            timeout: GEOLOCATION_TIMEOUT_MS,
            maximumAge: 0,
          }
        );
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", clearCoords);
      clearBtn.hidden = true;
    }

    // Reset peta & pin saat form berhasil terkirim dan ter-reset.
    form.addEventListener("reset", function () {
      window.setTimeout(clearCoords, 0);
    });

    // Peta Leaflet perlu tahu ukurannya kalau dibuat di dalam elemen
    // yang awalnya masih 0px (mis. di dalam tab/accordion tersembunyi).
    // Aman dipanggil walau elemen sudah terlihat sejak awal.
    window.setTimeout(function () {
      map.invalidateSize();
    }, 200);
  }

  document.addEventListener("DOMContentLoaded", initLocationPicker);
})();
