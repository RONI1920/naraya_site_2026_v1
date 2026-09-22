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
 *   2. Kirim "denyut" kehadiran ke page_views_online, diulang tiap
 *      45 detik selama tab terbuka, supaya angka "online" akurat.
 *   3. Hitung total Hari ini / Kemarin / Minggu ini / Bulan ini / Semua
 *      dan tampilkan di widget.
 *
 * Sepenuhnya best-effort: kalau Supabase belum dikonfigurasi atau
 * gagal (offline dsb.), widget cukup disembunyikan — tidak pernah
 * mengganggu bagian lain situs.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var HEARTBEAT_MS = 45 * 1000;
  var ONLINE_WINDOW_SECONDS = 90;
  var SESSION_KEY = "naraya_session_id";

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

  function refreshCounts(sb, widget) {
    var todayStart = startOfLocalDayIso(0);
    var yesterdayStart = startOfLocalDayIso(1);
    var weekStart = startOfWeekIso();
    var monthStart = startOfMonthIso();

    Promise.all([
      countSince(sb, todayStart, null),
      countSince(sb, yesterdayStart, todayStart),
      countSince(sb, weekStart, null),
      countSince(sb, monthStart, null),
      countAll(sb),
      countOnline(sb),
    ])
      .then(function (results) {
        setText(widget, "today", formatCount(results[0]));
        setText(widget, "yesterday", formatCount(results[1]));
        setText(widget, "week", formatCount(results[2]));
        setText(widget, "month", formatCount(results[3]));
        setText(widget, "all", formatCount(results[4]));
        setText(widget, "online", String(results[5]));
        widget.hidden = false;
      })
      .catch(function () {
        // Gagal ambil data -> sembunyikan widget saja, jangan tampilkan
        // angka kosong/menyesatkan.
        widget.hidden = true;
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

  function init() {
    var widget = document.getElementById("traffic-widget");
    if (!widget) return;
    if (!window.sb) {
      widget.hidden = true;
      return;
    }
    var sb = window.sb;
    var sessionId = getSessionId();

    logPageView(sb).catch(function () {});
    sendHeartbeat(sb, sessionId);
    window.setInterval(function () {
      sendHeartbeat(sb, sessionId);
    }, HEARTBEAT_MS);

    refreshCounts(sb, widget);
    // Refresh berkala supaya angka terlihat "hidup" tanpa perlu reload
    // halaman, terutama untuk angka Online.
    window.setInterval(function () {
      refreshCounts(sb, widget);
    }, HEARTBEAT_MS);
  }

  // Footer (tempat #traffic-widget berada) dimuat async lewat fetch
  // (lihat include-footer.js) dan baru siap saat event ini terpicu.
  document.addEventListener("footer:ready", init);
})();
