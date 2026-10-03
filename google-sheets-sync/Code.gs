/**
 * ============================================================
 * Sedot WC — Sinkronisasi Leads Supabase -> Google Sheet
 * ============================================================
 * File ini BUKAN bagian dari website statis di folder induk — ini
 * ditempel langsung ke Google Sheet lewat Extensions > Apps Script.
 * Panduan setup lengkap ada di SETUP.md di folder yang sama.
 *
 * Ringkasan cara pakai:
 *   1. Buat Google Sheet baru (kosong).
 *   2. Extensions > Apps Script, hapus isi default, tempel file ini.
 *   3. Project Settings (ikon gerigi) > Script Properties, tambahkan:
 *        - SUPABASE_URL                → Project URL dari Supabase
 *        - SUPABASE_SERVICE_ROLE_KEY   → service_role key (RAHASIA)
 *        - SHEET_NAME                  → opsional, default "Leads"
 *   4. Kembali ke editor script, pilih fungsi "setup" di dropdown,
 *      klik Run. Izinkan permission yang diminta Google.
 *   5. Selesai. Trigger otomatis akan sinkron setiap 10 menit, dan
 *      menu "Sedot WC" muncul di Google Sheet untuk sinkron manual /
 *      push status ke Supabase.
 *
 * PENTING SOAL KEAMANAN:
 *   - SUPABASE_SERVICE_ROLE_KEY yang disimpan di Script Properties
 *     BISA membaca & menulis SEMUA data di project Supabase Anda,
 *     termasuk yang dilindungi Row Level Security. Ini AMAN selama
 *     hanya disimpan di Script Properties (server-side Google, tidak
 *     pernah dikirim ke browser) — TAPI:
 *       * Jangan pernah taruh key ini di kode yang dibagikan, dicommit
 *         ke Git, ditaruh di cell spreadsheet, atau di /assets pada
 *         website.
 *       * Hanya orang dengan akses "Editor" ke PROJECT APPS SCRIPT ini
 *         (Extensions > Apps Script) yang bisa melihat Script
 *         Properties — bukan orang yang hanya diberi akses ke
 *         spreadsheet biasa.
 *   - Bagikan Google Sheet ini ke tim lapangan seperti biasa (mereka
 *     TIDAK perlu, dan sebaiknya TIDAK diberi, akses ke editor Apps
 *     Script / Project Settings — cukup akses ke Sheet-nya saja).
 * ============================================================
 */

var HEADERS = [
  'Lead ID', 'Waktu Masuk', 'Nama', 'No. WhatsApp', 'Layanan', 'Area',
  'Titik Lokasi (Google Maps)',
  'Pesan', 'Tanggal Diminta', 'Jam Diminta', 'Halaman Sumber',
  'UTM Source', 'UTM Medium', 'UTM Campaign', 'Status', 'Catatan Admin',
  'Terakhir Disinkron',
  // Kolom atribusi iklan (ditambah di akhir agar posisi kolom lama tidak bergeser)
  'GCLID', 'GBRAID', 'WBRAID', 'UTM Term', 'UTM Content', 'Landing Page'
];
var ID_COL = 1; // kolom A
var RAW_DATA_COL_COUNT = 14; // A..N: seluruh data mentah dari Supabase (sebelum Status)
var STATUS_COL = 15; // kolom O
var NOTES_COL = 16; // kolom P
var SYNCED_AT_COL = 17; // kolom Q
var VALID_STATUS = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'];

// ---------- helpers dasar ------------------------------------------------

function getProp_(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v || fallback;
}

function getSheet_() {
  var name = getProp_('SHEET_NAME', 'Leads');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeaders_(sheet) {
  var range = sheet.getRange(1, 1, 1, HEADERS.length);
  var current = range.getValues()[0];
  var needsWrite = false;
  for (var i = 0; i < HEADERS.length; i++) {
    if (current[i] !== HEADERS[i]) { needsWrite = true; break; }
  }
  if (needsWrite) {
    range.setValues([HEADERS]);
    sheet.setFrozenRows(1);
    range.setFontWeight('bold');
  }
  // Dropdown Status supaya tim tidak salah ketik (dan valid saat di-push balik)
  var statusRange = sheet.getRange(2, STATUS_COL, Math.max(sheet.getMaxRows() - 1, 1), 1);
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(VALID_STATUS, true)
    .setAllowInvalid(true)
    .build();
  statusRange.setDataValidation(rule);
}

function supabaseHeaders_() {
  var key = getProp_('SUPABASE_SERVICE_ROLE_KEY', '');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi di Script Properties.');
  return { apikey: key, Authorization: 'Bearer ' + key };
}

function supabaseUrl_() {
  var url = getProp_('SUPABASE_URL', '');
  if (!url) throw new Error('SUPABASE_URL belum diisi di Script Properties.');
  return url.replace(/\/$/, '');
}

// ---------- ambil data dari Supabase -------------------------------------

function fetchLeadsFromSupabase_() {
  var endpoint = supabaseUrl_() + '/rest/v1/leads?select=*&order=created_at.asc';
  var allRows = [];
  var offset = 0;
  var pageSize = 1000; // batas default PostgREST per request

  while (true) {
    var resp = UrlFetchApp.fetch(endpoint, {
      method: 'get',
      headers: Object.assign(supabaseHeaders_(), {
        Range: offset + '-' + (offset + pageSize - 1),
      }),
      muteHttpExceptions: true,
    });
    var code = resp.getResponseCode();
    if (code >= 300) {
      throw new Error('Supabase error ' + code + ': ' + resp.getContentText());
    }
    var rows = JSON.parse(resp.getContentText());
    allRows = allRows.concat(rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
    if (offset > 50000) break; // safety valve
  }
  return allRows;
}

function tz_() {
  return Session.getScriptTimeZone() || 'Asia/Jakarta';
}

function fmtDateTime_(iso) {
  if (!iso) return '';
  try {
    return Utilities.formatDate(new Date(iso), tz_(), 'yyyy-MM-dd HH:mm');
  } catch (e) {
    return iso;
  }
}

// Bangun link Google Maps siap-klik dari koordinat yang ditandai
// pelanggan sendiri lewat peta di form kontak (lihat
// assets/js/location-picker.js). Kosong kalau pelanggan tidak
// menandai lokasi — Sheet akan menampilkan sel kosong, bukan error.
function mapsLink_(lead) {
  if (lead.location_lat == null || lead.location_lng == null) return '';
  return 'https://www.google.com/maps?q=' + lead.location_lat + ',' + lead.location_lng;
}

function leadToRow_(lead) {
  return [
    lead.id,
    fmtDateTime_(lead.created_at),
    lead.name || '',
    lead.phone || '',
    lead.service || '',
    lead.area || '',
    mapsLink_(lead),
    lead.message || '',
    lead.preferred_date || '',
    lead.preferred_time_slot || '',
    lead.source_page || '',
    lead.utm_source || '',
    lead.utm_medium || '',
    lead.utm_campaign || '',
    lead.status || 'new',
    lead.notes || '',
    Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss'),
    lead.gclid || '',
    lead.gbraid || '',
    lead.wbraid || '',
    lead.utm_term || '',
    lead.utm_content || '',
    lead.landing_page || '',
  ];
}

// ---------- sinkron Supabase -> Sheet ------------------------------------

/**
 * Sinkron SATU ARAH: Supabase -> Sheet.
 *
 * - Lead baru ditambahkan sebagai baris baru.
 * - Lead yang sudah ada di-refresh HANYA di kolom A..M (data mentah dari
 *   Supabase) + kolom P (Terakhir Disinkron). Kolom N (Status) & O
 *   (Catatan Admin) TIDAK ditimpa saat refresh — supaya perubahan yang
 *   Anda ketik manual di Sheet tidak hilang tiap 10 menit.
 * - Untuk mengirim Status/Catatan yang Anda edit di Sheet balik ke
 *   Supabase, pakai menu "Sedot WC > Push Status & Catatan ke Supabase".
 */
function syncLeads() {
  var sheet = getSheet_();
  ensureHeaders_(sheet);

  var leads = fetchLeadsFromSupabase_();

  var lastRow = sheet.getLastRow();
  var existingIds = {};
  if (lastRow > 1) {
    var idValues = sheet.getRange(2, ID_COL, lastRow - 1, 1).getValues();
    for (var r = 0; r < idValues.length; r++) {
      if (idValues[r][0]) existingIds[String(idValues[r][0])] = r + 2;
    }
  }

  var rowsToAppend = [];
  var newLeadsToNotify = [];
  leads.forEach(function (lead) {
    var rowValues = leadToRow_(lead);
    var existingRow = existingIds[String(lead.id)];
    if (existingRow) {
      // A..N = data mentah (14 kolom), biarkan O (Status) & P (Catatan Admin).
      // (Sebelumnya hanya 13 kolom + salah ambil indeks "Terakhir Disinkron".)
      sheet.getRange(existingRow, 1, 1, RAW_DATA_COL_COUNT).setValues([rowValues.slice(0, RAW_DATA_COL_COUNT)]);
      sheet.getRange(existingRow, SYNCED_AT_COL, 1, 1).setValues([[rowValues[SYNCED_AT_COL - 1]]]);
      // Kolom atribusi iklan (R..W)
      sheet.getRange(existingRow, SYNCED_AT_COL + 1, 1, HEADERS.length - SYNCED_AT_COL)
        .setValues([rowValues.slice(SYNCED_AT_COL)]);
    } else {
      rowsToAppend.push(rowValues);
      // Hanya lead BARU (<= 30 menit) yang dinotifikasi, supaya sinkron
      // pertama kali tidak mengirim ratusan email lama.
      var ageMin = (Date.now() - new Date(lead.created_at).getTime()) / 60000;
      if ((lead.status || 'new') === 'new' && ageMin <= 30) newLeadsToNotify.push(lead);
    }
  });

  if (rowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, HEADERS.length)
      .setValues(rowsToAppend);
  }

  sortByNewest_(sheet);
  notifyNewLeads_(newLeadsToNotify);
}

/**
 * Notifikasi lead baru lewat email (muncul sebagai notifikasi di HP bila
 * aplikasi Gmail terpasang dan notifikasi diaktifkan).
 * Atur penerima di Project Settings > Script Properties:
 *   NOTIFY_EMAIL = email1@contoh.com,email2@contoh.com
 * Kosong = tidak ada notifikasi.
 */
function notifyNewLeads_(leads) {
  var to = getProp_('NOTIFY_EMAIL', '');
  if (!to || !leads || leads.length === 0) return;
  leads.forEach(function (lead) {
    try {
      var phone = String(lead.phone || '').replace(/[^0-9]/g, '');
      var wa = phone ? 'https://wa.me/' + phone.replace(/^0/, '62') : '';
      var body =
        'LEAD BARU - segera hubungi.\n\n' +
        'Nama    : ' + (lead.name || '-') + '\n' +
        'HP/WA   : ' + (lead.phone || '-') + '\n' +
        'Layanan : ' + (lead.service || '-') + '\n' +
        'Area    : ' + (lead.area || '-') + '\n' +
        'Pesan   : ' + (lead.message || '-') + '\n' +
        'Peta    : ' + (mapsLink_(lead) || '-') + '\n' +
        'Sumber  : ' + [lead.utm_source, lead.utm_campaign, lead.gclid ? '(gclid)' : ''].filter(Boolean).join(' / ') + '\n\n' +
        (wa ? 'Chat WhatsApp: ' + wa + '\n' : '');
      MailApp.sendEmail(to, 'LEAD BARU: ' + (lead.service || 'Sedot WC') + ' - ' + (lead.area || '?') + ' - ' + (lead.name || ''), body);
    } catch (e) {
      console.error('Gagal kirim notifikasi: ' + e);
    }
  });
}

function sortByNewest_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return; // tidak ada cukup baris untuk diurut
  sheet.getRange(2, 1, lastRow - 1, HEADERS.length)
    .sort({ column: 2, ascending: false }); // urut by "Waktu Masuk" terbaru dulu
}

// ---------- push Status/Catatan dari Sheet -> Supabase -------------------

/**
 * Kirim kolom Status (N) & Catatan Admin (O) yang Anda edit manual di
 * Sheet kembali ke Supabase. Dipanggil manual lewat menu — TIDAK
 * otomatis — supaya tidak ada perubahan tak sengaja.
 */
function pushStatusToSupabase() {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Belum ada data untuk di-push.');
    return;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var headers = Object.assign(supabaseHeaders_(), {
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  });
  var url = supabaseUrl_();

  var updated = 0;
  var errors = [];

  data.forEach(function (row) {
    var id = row[ID_COL - 1];
    var status = String(row[STATUS_COL - 1] || '').trim();
    var notes = row[NOTES_COL - 1];
    if (!id || !status) return;
    if (VALID_STATUS.indexOf(status) === -1) {
      errors.push(id + ': status "' + status + '" tidak valid');
      return;
    }
    var resp = UrlFetchApp.fetch(
      url + '/rest/v1/leads?id=eq.' + encodeURIComponent(id),
      {
        method: 'patch',
        headers: headers,
        payload: JSON.stringify({ status: status, notes: notes }),
        muteHttpExceptions: true,
      }
    );
    if (resp.getResponseCode() >= 300) {
      errors.push(id + ': ' + resp.getContentText());
    } else {
      updated++;
    }
  });

  var msg = 'Berhasil update ' + updated + ' baris ke Supabase.';
  if (errors.length) msg += '\n\nGagal (' + errors.length + '):\n' + errors.join('\n');
  SpreadsheetApp.getUi().alert(msg);
}

// ---------- menu & trigger -------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Sedot WC')
    .addItem('Sinkron Sekarang', 'syncLeads')
    .addItem('Push Status & Catatan ke Supabase', 'pushStatusToSupabase')
    .addSeparator()
    .addItem('Setup Awal (jalankan sekali)', 'setup')
    .addToUi();
}

/** Jalankan SEKALI dari editor Apps Script (Run > setup) saat setup awal. */
function setup() {
  ensureHeaders_(getSheet_());
  syncLeads();
  createTriggerIfMissing_();
  SpreadsheetApp.getUi().alert(
    'Setup selesai. Sinkron otomatis akan berjalan setiap 1 menit.\n' +
    'Isi Script Property NOTIFY_EMAIL agar lead baru dikirim ke email Anda.\n' +
    'Gunakan menu "Sedot WC" untuk sinkron manual atau push status.'
  );
}

function createTriggerIfMissing_() {
  // Hapus trigger syncLeads lama (mis. yang 10 menit) lalu buat yang 1 menit.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncLeads') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncLeads').timeBased().everyMinutes(1).create();
}
