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
 *
 * Sinkronisasi 2 arah dengan field #alamat (kalau ada di halaman),
 * format & perilaku sama persis dengan pesan.html:
 *   - Peta/GPS -> alamat: setiap pin dipasang/digeser, otomatis reverse-
 *     geocode via Nominatim lalu isi textarea #alamat.
 *   - Alamat -> peta: setiap pelanggan mengetik di #alamat (>=5 huruf),
 *     tampilkan daftar rekomendasi alamat nyata (dibatasi area layanan
 *     NARAYA), dan begitu salah satu dipilih, peta + pin ikut pindah
 *     ke koordinat yang sama persis.
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var DEFAULT_ZOOM = 16;
  var GEOLOCATION_TIMEOUT_MS = 12000;
  var SUGGEST_DEBOUNCE_MS = 550;
  var SUGGEST_MIN_CHARS = 5;
  // Kira-kira mencakup area layanan saat ini: Jakarta Selatan, Depok, Bogor,
  // dan Tangerang Selatan/Pondok Aren. Sama seperti viewbox di pesan.html —
  // kalau area layanan berubah, sesuaikan juga di sana.
  var SERVICE_AREA_VIEWBOX = "106.55,-6.15,107.00,-6.75";

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
    var alamatInput = document.getElementById("alamat");
    var suggestBox = document.getElementById("alamat-suggest");

    // ---------- Reverse geocoding: titik peta -> isi textarea alamat ----
    // Best-effort saja: kalau gagal (offline / Nominatim down), form tetap
    // valid dan pelanggan cukup isi alamat manual.
    function reverseGeocodeToAlamat(lat, lng) {
      if (!alamatInput) return;
      fetch(
        "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
          lat +
          "&lon=" +
          lng +
          "&zoom=18&addressdetails=1"
      )
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (data && data.display_name) {
            alamatInput.value = data.display_name;
          }
        })
        .catch(function () {
          /* diamkan — alamat manual tetap bisa diisi pelanggan */
        });
    }

    function setStatus(text, isError) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.classList.toggle("location-picker__status--error", !!isError);
      statusEl.classList.toggle("location-picker__status--set", !isError && !!text);
    }

    function setCoords(lat, lng, source, accuracyM, skipReverseGeocode) {
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

      if (!skipReverseGeocode) reverseGeocodeToAlamat(lat, lng);
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
      if (alamatInput) alamatInput.value = "";
      if (suggestBox) {
        suggestBox.classList.remove("open");
        suggestBox.innerHTML = "";
      }
    });

    // ---------- Autocomplete alamat -> sinkron ke peta -------------------
    // Begitu pelanggan MENGETIK alamat, munculkan rekomendasi alamat nyata
    // (lewat pencarian Nominatim, dibatasi area layanan NARAYA), dan begitu
    // salah satu dipilih, peta + pin ikut pindah ke koordinat yang sama
    // persis — sama seperti di pesan.html.
    if (alamatInput && suggestBox) {
      var suggestTimer = null;
      var suggestAbort = null;

      var closeSuggest = function () {
        suggestBox.classList.remove("open");
        suggestBox.innerHTML = "";
      };

      var renderSuggestLoading = function () {
        suggestBox.innerHTML = '<div class="suggest-loading">Mencari alamat\u2026</div>';
        suggestBox.classList.add("open");
      };

      var selectSuggestion = function (r) {
        var lat = parseFloat(r.lat);
        var lng = parseFloat(r.lon);
        alamatInput.value = r.display_name;
        closeSuggest();
        setCoords(lat, lng, "manual", null, /* skipReverseGeocode */ true);
        setStatus("\u2713 Lokasi disamakan dengan alamat yang dipilih (" + fmtCoord(lat) + ", " + fmtCoord(lng) + ")");
      };

      var renderSuggestResults = function (results) {
        if (!results || !results.length) {
          suggestBox.innerHTML =
            '<div class="suggest-loading">Tidak ditemukan. Lanjutkan tulis alamat manual atau tandai lewat peta.</div>';
          suggestBox.classList.add("open");
          return;
        }
        suggestBox.innerHTML = "";
        results.forEach(function (r) {
          var item = document.createElement("div");
          item.className = "suggest-item";
          item.textContent = r.display_name;
          // mousedown (bukan click) supaya jalan duluan sebelum textarea
          // kehilangan fokus (blur) menutup daftar saran.
          item.addEventListener("mousedown", function (ev) {
            ev.preventDefault();
            selectSuggestion(r);
          });
          suggestBox.appendChild(item);
        });
        suggestBox.classList.add("open");
      };

      var searchAddress = function (query) {
        if (suggestAbort) suggestAbort.abort();
        suggestAbort = new AbortController();
        var url =
          "https://nominatim.openstreetmap.org/search?format=json&q=" +
          encodeURIComponent(query) +
          "&countrycodes=id&viewbox=" +
          SERVICE_AREA_VIEWBOX +
          "&bounded=1&limit=5&addressdetails=1";
        fetch(url, { signal: suggestAbort.signal })
          .then(function (res) {
            return res.json();
          })
          .then(renderSuggestResults)
          .catch(function (err) {
            if (err && err.name === "AbortError") return; // permintaan lama dibatalkan, wajar
            suggestBox.innerHTML =
              '<div class="suggest-loading">Gagal memuat rekomendasi. Anda tetap bisa lanjut tulis alamat manual.</div>';
            suggestBox.classList.add("open");
          });
      };

      alamatInput.addEventListener("input", function () {
        var q = alamatInput.value.trim();
        window.clearTimeout(suggestTimer);
        if (q.length < SUGGEST_MIN_CHARS) {
          closeSuggest();
          return;
        }
        renderSuggestLoading();
        // Debounce supaya tidak membombardir Nominatim setiap ketukan huruf.
        suggestTimer = window.setTimeout(function () {
          searchAddress(q);
        }, SUGGEST_DEBOUNCE_MS);
      });

      // Tutup daftar saran kalau pelanggan tap di luar kotak alamat / daftar.
      document.addEventListener("click", function (ev) {
        if (ev.target === alamatInput || suggestBox.contains(ev.target)) return;
        closeSuggest();
      });
      alamatInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") closeSuggest();
      });
    }

    // Peta Leaflet perlu tahu ukurannya kalau dibuat di dalam elemen
    // yang awalnya masih 0px (mis. di dalam tab/accordion tersembunyi).
    // Aman dipanggil walau elemen sudah terlihat sejak awal.
    window.setTimeout(function () {
      map.invalidateSize();
    }, 200);
  }

  document.addEventListener("DOMContentLoaded", initLocationPicker);
})();
