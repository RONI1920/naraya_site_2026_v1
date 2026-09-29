/**
 * traffic-widget.js
 * ------------------------------------------------------------------
 * Widget "Statistik Pengunjung" di footer (lihat partials/footer.html,
 * elemen #traffic-widget). Datanya ASLI dari situs sendiri lewat
 * Supabase (tabel page_views + page_views_online, lihat
 * supabase/migrations/007_traffic_widget.sql) — bukan widget/script
 * pihak ketiga, supaya tidak menambah tracker luar dan angkanya bisa
 * dipertanggungjawabkan.
 *
 * Yang dilakukan tiap halaman dimuat:
 *   1. Catat satu "hit" ke page_views (kalau Supabase siap).
 *   2. Hitung Hari ini / Kemarin / Minggu ini / Bulan ini / Semua lewat
 *      satu RPC get_traffic_stats() (supabase/migrations/
 *      008_traffic_realtime.sql, berbasis WIB/Asia-Jakarta), dengan
 *      fallback ke query count terpisah kalau RPC belum tersedia
 *      (migrasi 008 belum dijalankan).
 *   3. Angka berubah hampir seketika lewat dua jalur Realtime:
 *      - Presence (channel "site-presence") untuk hitungan "Online",
 *        dengan fallback ke heartbeat + tabel page_views_online kalau
 *        Presence tidak tersedia/gagal.
 *      - postgres_changes INSERT pada page_views memicu refresh RPC
 *        (didebounce ±1.5s), plus polling cadangan tiap 30s untuk
 *        jaga-jaga kalau koneksi Realtime putus.
 *   4. Polling/heartbeat dijeda saat tab tersembunyi, dan langsung
 *      refresh sekali saat tab kembali terlihat.
 *
 * Sepenuhnya best-effort: kalau Supabase belum dikonfigurasi, widget
 * cukup disembunyikan. Kalau widget SUDAH pernah menampilkan angka,
 * satu refresh yang gagal tidak lagi menyembunyikannya — nilai
 * terakhir yang valid dibiarkan tetap tampil (lihat hasEverShownData).
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var HEARTBEAT_MS = 45 * 1000;
  var ONLINE_WINDOW_SECONDS = 90;
  var SESSION_KEY = "naraya_session_id";
  var POLL_FALLBACK_MS = 30 * 1000;
  var REALTIME_DEBOUNCE_MS = 1500;
  var PRESENCE_CHANNEL_NAME = "site-presence";
  var CHANGES_CHANNEL_NAME = "page-views-changes";
  var RPC_NAME = "get_traffic_stats";

  function getSessionId() {
    try {
      var id = window.sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id =
          "s_" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2, 10);
        window.sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (e) {
      // sessionStorage tidak tersedia (mode privat dsb.) -> id sekali pakai
      return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    }
  }

  // ---------- Jalur lama (fallback), dipakai kalau RPC get_traffic_stats
  // belum ada (migrasi 008 belum dijalankan). Zona waktu di sini masih
  // ikut jam LOKAL BROWSER, sama seperti sebelumnya -- ini keterbatasan
  // yang sudah ada dan tidak diperbaiki di jalur fallback, karena
  // perbaikan zona waktu (WIB) ada di sisi database lewat RPC.
  function startOfLocalDayIso(daysAgo) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  }

  function startOfWeekIso() {
    // Minggu dimulai Senin, sama seperti kalender umum di Indonesia.
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var day = d.getDay(); // 0 = Minggu
    var diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString();
  }

  function startOfMonthIso() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d.toISOString();
  }

  function formatCount(n) {
    if (n === null || n === undefined || isNaN(n)) return "\u2013";
    if (n < 1000) return String(n);
    return (n / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + "K";
  }

  function countSince(sb, isoStart, isoEnd) {
    var q = sb.from("page_views").select("*", { count: "exact", head: true }).gte("viewed_at", isoStart);
    if (isoEnd) q = q.lt("viewed_at", isoEnd);
    return q.then(function (res) {
      return res.count || 0;
    });
  }

  function countAll(sb) {
    return sb
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .then(function (res) {
        return res.count || 0;
      });
  }

  function countOnline(sb) {
    var since = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString();
    return sb
      .from("page_views_online")
      .select("*", { count: "exact", head: true })
      .gte("last_seen", since)
      .then(function (res) {
        return res.count || 0;
      });
  }

  function setText(widget, key, value) {
    var el = widget.querySelector('[data-tw="' + key + '"]');
    if (el) el.textContent = value;
  }

  var CHART_MAX_PX = 40; // tinggi bar maksimum dalam px (di dalam container 64px)
  var CHART_MIN_PX = 4; // tinggi bar minimum, supaya nilai 0 tetap terlihat jelas (bukan cuma garis nyaris tak kasat mata)

  // Grafik batang ringkas (Hari ini/Kemarin/Minggu ini/Bulan ini) di atas
  // heading "Statistik Pengunjung". Dibuat dengan style inline (bukan
  // menambah CSS/JS library baru) memakai angka yang SAMA dari
  // refreshCounts, supaya tidak ada query tambahan ke Supabase.
  function renderChart(chartEl, values) {
    if (!chartEl) return;
    var max = Math.max(values.today, values.yesterday, values.week, values.month, 1);
    ["today", "yesterday", "week", "month"].forEach(function (key) {
      var raw = values[key] || 0;
      var px = Math.max(CHART_MIN_PX, Math.round((raw / max) * CHART_MAX_PX));
      var fillEl = chartEl.querySelector('[data-tw-chart-fill="' + key + '"]');
      if (fillEl) fillEl.style.height = px + "px";
      var valEl = chartEl.querySelector('[data-tw-chart-val="' + key + '"]');
      if (valEl) valEl.textContent = formatCount(raw);
    });
  }

  function logPageView(sb) {
    return sb.from("page_views").insert([{ page: window.location.pathname }]);
  }

  function sendHeartbeat(sb, sessionId) {
    sb.from("page_views_online")
      .upsert([{ session_id: sessionId, last_seen: new Date().toISOString() }], {
        onConflict: "session_id",
      })
      .then(function () {})
      .catch(function () {});
  }

  // ---------- Statistik hari/minggu/bulan/semua: RPC + fallback ---------

  function fetchStatsViaRpc(sb) {
    return sb.rpc(RPC_NAME).then(function (res) {
      if (res.error) throw res.error;
      var row = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!row) throw new Error("get_traffic_stats: hasil kosong");
      return {
        today: row.today || 0,
        yesterday: row.yesterday || 0,
        week: row.week || 0,
        month: row.month || 0,
        all_time: row.all_time || 0,
      };
    });
  }

  // Jalur lama: 5 query count terpisah, dipakai hanya kalau RPC gagal
  // (migrasi 008 belum dijalankan di Supabase). Perilaku & zona waktu
  // sama seperti versi sebelumnya.
  function fetchStatsLegacy(sb) {
    var todayStart = startOfLocalDayIso(0);
    var yesterdayStart = startOfLocalDayIso(1);
    var weekStart = startOfWeekIso();
    var monthStart = startOfMonthIso();

    return Promise.all([
      countSince(sb, todayStart, null),
      countSince(sb, yesterdayStart, todayStart),
      countSince(sb, weekStart, null),
      countSince(sb, monthStart, null),
      countAll(sb),
    ]).then(function (results) {
      return {
        today: results[0],
        yesterday: results[1],
        week: results[2],
        month: results[3],
        all_time: results[4],
      };
    });
  }

  function fetchStats(sb) {
    return fetchStatsViaRpc(sb).catch(function () {
      return fetchStatsLegacy(sb);
    });
  }

  // ---------- State modul (aman: hanya satu instance widget per halaman,
  // dijaga oleh guard `initialized` seperti sebelumnya) -------------------

  var initialized = false;
  var hasEverShownData = false; // sekali true, refresh gagal tidak lagi menyembunyikan widget
  var presenceActive = false;
  var heartbeatTimer = null;
  var pollTimer = null;
  var debounceTimer = null;
  var presenceChannel = null;
  var changesChannel = null;

  function refreshCounts(sb, widget, chartEl) {
    fetchStats(sb)
      .then(function (stats) {
        hasEverShownData = true;

        setText(widget, "today", formatCount(stats.today));
        setText(widget, "yesterday", formatCount(stats.yesterday));
        setText(widget, "week", formatCount(stats.week));
        setText(widget, "month", formatCount(stats.month));
        setText(widget, "all", formatCount(stats.all_time));
        widget.hidden = false;

        renderChart(chartEl, {
          today: stats.today,
          yesterday: stats.yesterday,
          week: stats.week,
          month: stats.month,
        });
        if (chartEl) chartEl.hidden = false;

        // Kalau Presence sudah aktif, angka "Online" sudah/akan
        // diperbarui lewat event "sync" -- jangan ditimpa dengan query
        // page_views_online yang sudah usang.
        if (!presenceActive) {
          countOnline(sb)
            .then(function (n) {
              setText(widget, "online", String(n));
            })
            .catch(function () {});
        }
      })
      .catch(function () {
        // Jangan sembunyikan widget hanya karena satu refresh gagal
        // kalau sebelumnya sudah pernah menampilkan angka valid --
        // biarkan nilai terakhir tetap tampil. Sembunyikan hanya kalau
        // belum pernah ada data sama sekali (perilaku awal).
        if (!hasEverShownData) {
          widget.hidden = true;
          if (chartEl) chartEl.hidden = true;
        }
      });
  }

  // ---------- "Online": Realtime Presence, fallback heartbeat -----------

  function startHeartbeatFallback(sb, sessionId) {
    if (heartbeatTimer) return;
    sendHeartbeat(sb, sessionId);
    heartbeatTimer = window.setInterval(function () {
      if (document.hidden) return; // jeda saat tab tersembunyi
      sendHeartbeat(sb, sessionId);
    }, HEARTBEAT_MS);
  }

  function stopHeartbeatFallback() {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // Presence tidak menulis apa pun ke database -- hanya key sesi acak
  // yang di-track selama koneksi realtime terbuka, otomatis hilang saat
  // tab ditutup. Kalau supabase-js versi lama (tidak punya sb.channel)
  // atau subscribe gagal, biarkan heartbeat fallback yang sudah berjalan
  // (dimulai sebelum ini dipanggil) terus bekerja.
  function initPresence(sb, widget, sessionId) {
    try {
      if (!sb || typeof sb.channel !== "function") return null;

      var channel = sb.channel(PRESENCE_CHANNEL_NAME, {
        config: { presence: { key: sessionId } },
      });

      channel.on("presence", { event: "sync" }, function () {
        try {
          var state = channel.presenceState();
          var count = Object.keys(state || {}).length;
          setText(widget, "online", String(count));
          if (!presenceActive) {
            presenceActive = true;
            stopHeartbeatFallback();
          }
        } catch (e) {
          // Biarkan heartbeat fallback yang menangani "online" kalau
          // presenceState() gagal dibaca.
        }
      });

      channel.subscribe(function (status) {
        if (status === "SUBSCRIBED") {
          try {
            channel.track({
              session_id: sessionId,
              online_at: new Date().toISOString(),
            });
          } catch (e) {}
        }
      });

      return channel;
    } catch (e) {
      return null;
    }
  }

  // ---------- Pembaruan instan lewat postgres_changes --------------------

  function scheduleDebouncedRefresh(sb, widget, chartEl) {
    if (debounceTimer) return; // sudah ada refresh terjadwal, jangan tumpuk
    debounceTimer = window.setTimeout(function () {
      debounceTimer = null;
      refreshCounts(sb, widget, chartEl);
    }, REALTIME_DEBOUNCE_MS);
  }

  function initPostgresChanges(sb, widget, chartEl) {
    try {
      if (!sb || typeof sb.channel !== "function") return null;

      var channel = sb.channel(CHANGES_CHANNEL_NAME).on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "page_views" },
        function () {
          scheduleDebouncedRefresh(sb, widget, chartEl);
        }
      );
      channel.subscribe();
      return channel;
    } catch (e) {
      return null;
    }
  }

  function teardownRealtime(sb) {
    stopHeartbeatFallback();
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    try {
      if (presenceChannel) {
        if (sb && typeof sb.removeChannel === "function") {
          sb.removeChannel(presenceChannel);
        } else if (typeof presenceChannel.unsubscribe === "function") {
          presenceChannel.unsubscribe();
        }
      }
    } catch (e) {}
    try {
      if (changesChannel) {
        if (sb && typeof sb.removeChannel === "function") {
          sb.removeChannel(changesChannel);
        } else if (typeof changesChannel.unsubscribe === "function") {
          changesChannel.unsubscribe();
        }
      }
    } catch (e) {}
  }

  function init() {
    // Guard: cegah double-init kalau init() sempat terpanggil dua kali
    // (lihat catatan race condition di bawah) -> mencegah heartbeat
    // interval dobel dan page_views tercatat dua kali per page load.
    if (initialized) return;

    var widget = document.getElementById("traffic-widget");
    if (!widget) return;
    var chartEl = document.getElementById("traffic-widget-chart");
    if (!window.sb) {
      widget.hidden = true;
      if (chartEl) chartEl.hidden = true;
      return;
    }
    initialized = true;

    var sb = window.sb;
    var sessionId = getSessionId();

    logPageView(sb).then(function () {}, function () {});

    // "Online": heartbeat lama langsung dimulai sebagai fallback, lalu
    // dihentikan otomatis begitu Presence terbukti aktif (event "sync"
    // pertama) -- supaya angka online tidak pernah kosong saat transisi.
    startHeartbeatFallback(sb, sessionId);
    presenceChannel = initPresence(sb, widget, sessionId);

    // Pembaruan instan saat ada page_views baru (didebounce supaya tidak
    // memanggil RPC di setiap event kalau trafik ramai).
    changesChannel = initPostgresChanges(sb, widget, chartEl);

    refreshCounts(sb, widget, chartEl);

    // Polling cadangan, jaga-jaga kalau koneksi Realtime putus; dijeda
    // saat tab tersembunyi.
    pollTimer = window.setInterval(function () {
      if (document.hidden) return;
      refreshCounts(sb, widget, chartEl);
    }, POLL_FALLBACK_MS);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshCounts(sb, widget, chartEl);
    });

    window.addEventListener("pagehide", function () {
      teardownRealtime(sb);
    });
  }

  // Footer (tempat #traffic-widget berada) dimuat async lewat fetch
  // (lihat include-footer.js) dan baru siap saat event ini terpicu.
  document.addEventListener("footer:ready", init);
  if (document.getElementById("traffic-widget")) {
    init();
  }
})();