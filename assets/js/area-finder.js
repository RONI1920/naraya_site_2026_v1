/**
 * area-finder.js
 * ------------------------------------------------------------------
 * Pencarian cepat di /area-layanan.html: pengunjung mengetik kecamatan,
 * kota, atau kawasan (mis. "Duren Sawit", "BSD", "Cikarang") dan kartu
 * kota yang cocok saja yang ditampilkan.
 *
 * - Data pencarian ada di atribut kartu: data-name (nama kota) dan
 *   data-keys (kecamatan/kawasan, dipisah "|"). Tambah kata kunci baru
 *   cukup di HTML, tidak perlu ubah file ini.
 * - Kalau tidak ada yang cocok, tampil ajakan chat WhatsApp dengan pesan
 *   berisi teks yang diketik (memakai WA.buildUrl dari whatsapp.js).
 * - Progressive enhancement: kolom pencarian baru ditampilkan setelah
 *   script ini jalan. Tanpa JS, semua kartu kota tetap terlihat.
 * - Teks yang diketik TIDAK dikirim ke analitik.
 * ------------------------------------------------------------------
 */
(function () {
    "use strict";

    var finder = document.querySelector(".area-finder");
    var grid = document.getElementById("area-grid");
    if (!finder || !grid) return;

    var input = finder.querySelector("input");
    var status = document.getElementById("area-finder-status");
    var empty = document.getElementById("area-empty");
    var emptyQuery = document.getElementById("area-empty-q");
    var emptyWa = document.getElementById("area-empty-wa");
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".area-card"));

    var MIN_CHARS = 2;

    // huruf kecil, buang tanda baca, rapikan spasi
    function norm(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    // Indeks pencarian per kartu: nama kota + semua kata kunci.
    var index = cards.map(function (card) {
        var keys = (card.getAttribute("data-keys") || "").split("|");
        keys.push(card.getAttribute("data-name") || "");
        return keys.map(norm).filter(Boolean);
    });

    function showAll() {
        cards.forEach(function (card) { card.hidden = false; });
        empty.hidden = true;
        status.textContent = "";
    }

    function update() {
        var raw = input.value.trim();
        var q = norm(raw);

        if (q.length < MIN_CHARS) {
            showAll();
            return;
        }

        var shown = 0;
        cards.forEach(function (card, i) {
            var match = index[i].some(function (key) { return key.indexOf(q) !== -1; });
            card.hidden = !match;
            if (match) shown += 1;
        });

        if (shown > 0) {
            empty.hidden = true;
            status.textContent = shown + " wilayah cocok dengan “" + raw + "”.";
            return;
        }

        // Tidak ada yang cocok -> arahkan ke WhatsApp dengan pesan terisi.
        status.textContent = "Belum ada wilayah yang cocok dengan “" + raw + "”.";
        emptyQuery.textContent = raw;
        if (window.WA && typeof window.WA.buildUrl === "function") {
            emptyWa.setAttribute("href", window.WA.buildUrl(window.WA.templates.area(raw)));
        }
        empty.hidden = false;
    }

    input.addEventListener("input", update);

    // Enter: kalau hanya satu kota yang cocok, langsung buka halamannya.
    input.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        var visible = cards.filter(function (card) { return !card.hidden; });
        if (visible.length === 1 && norm(input.value).length >= MIN_CHARS) {
            e.preventDefault();
            window.location.href = visible[0].querySelector("a").href;
        }
    });

    emptyWa.addEventListener("click", function () {
        if (typeof window.trackEvent === "function") {
            window.trackEvent("whatsapp_click", { context: "area-finder-empty" });
        }
    });

    finder.hidden = false;
})();