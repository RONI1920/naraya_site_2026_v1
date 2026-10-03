(function () {
  'use strict';
  var cfg = window.SITE_CONFIG || {};
  var AREAS = {'jakarta-selatan':'Jakarta Selatan','depok':'Depok','bogor':'Bogor','tangerang-selatan':'Tangerang Selatan','pondok-aren':'Pondok Aren'};
  var state = {problem: document.body.getAttribute('data-problem') || 'WC mampet', area: ''};
  var q = new URLSearchParams(location.search).get('area');
  if (q && AREAS[q.toLowerCase()]) state.area = AREAS[q.toLowerCase()];

  function track(name, extra) {
    if (typeof window.trackEvent !== 'function') return;
    var p = {problem: state.problem, area: state.area || 'umum', context: 'lp'};
    for (var k in extra) p[k] = extra[k];
    window.trackEvent(name, p);
  }
  function waUrl(text) {
    return window.WA && window.WA.buildUrl ? window.WA.buildUrl(text) :
      'https://wa.me/' + String(cfg.BUSINESS_WHATSAPP || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
  }
  function summaryMsg() {
    return 'Halo NARAYA, saya butuh bantuan: ' + state.problem + (state.area ? ' di ' + state.area : '') +
      '. Bisa info estimasi biaya dan jadwalnya? [ref: lp]';
  }

  var groups = document.querySelectorAll('.chips');
  function paint() {
    groups.forEach(function (g) {
      var key = g.getAttribute('data-group');
      g.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === state[key])); });
    });
    var label = state.problem + (state.area ? ' di ' + state.area : '');
    document.querySelectorAll('[data-summary]').forEach(function (el) { el.textContent = label; });
    document.querySelectorAll('[data-wa]').forEach(function (a) { a.setAttribute('href', waUrl(summaryMsg())); });
  }
  groups.forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var key = g.getAttribute('data-group'), v = b.getAttribute('data-v');
      state[key] = (state[key] === v && key === 'area') ? '' : v;
      paint();
    });
  });
  document.addEventListener('header:ready', paint);
  window.addEventListener('load', paint);
  paint();

  var wib = new Date(Date.now() + (new Date().getTimezoneOffset() + 420) * 60000);
  var open = wib.getHours() >= 7 && wib.getHours() < 21;
  var st = document.getElementById('status');
  if (st) { st.classList.toggle('closed', !open); st.querySelector('span').textContent = open ? 'Buka sekarang · sampai 21.00' : 'Tutup · buka lagi 07.00 WIB'; }

  var bar = document.getElementById('sticky');
  var targets = document.querySelectorAll('.picker .btn-wa, .final .btn-wa, #leadForm');
  if (bar && 'IntersectionObserver' in window) {
    var vis = new Set();
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? vis.add(e.target) : vis.delete(e.target); }); bar.classList.toggle('hide', vis.size > 0); });
    targets.forEach(function (t) { io.observe(t); });
  }

  // Klik WhatsApp
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.addEventListener('click', function () { track('whatsapp_click', {context: a.getAttribute('data-track') || 'lp'}); });
  });

  // Form -> tabel leads di Supabase (sama seperti form di halaman kontak)
  var form = document.getElementById('leadForm'), msgEl = document.getElementById('formMsg');
  function say(t, cls) { msgEl.textContent = t; msgEl.className = 'msg ' + (cls || ''); }
  function normPhone(v) {
    var d = String(v || '').replace(/[^0-9]/g, '');
    if (d.indexOf('0') === 0) d = '62' + d.slice(1);
    else if (d.indexOf('8') === 0) d = '62' + d;
    return d ? '+' + d : '';
  }
  var loadedAt = Date.now();
  function clean(s, n) { return String(s || '').replace(/[<>]/g, '').trim().slice(0, n); }
  function attr() {
    var a = window.NarayaAttribution ? window.NarayaAttribution.get() : {}, p = new URLSearchParams(location.search);
    function pick(k, n) { return clean(p.get(k) || a[k] || '', n || 100) || null; }
    return {utm_source: pick('utm_source'), utm_medium: pick('utm_medium'), utm_campaign: pick('utm_campaign'),
      gclid: pick('gclid', 200), gbraid: pick('gbraid', 200), wbraid: pick('wbraid', 200),
      utm_term: pick('utm_term'), utm_content: pick('utm_content'),
      landing_page: clean(a.landing_page || location.pathname, 200)};
  }
  function insert(row) { return window.sb.from('leads').insert([row]).then(function (r) { if (r.error) throw r.error; }); }
  function save(row) {
    if (!window.sb) return Promise.reject(new Error('db'));
    return insert(row).catch(function (err) {
      if (!/PGRST204|42703|column/i.test(String((err && (err.message || err.code)) || ''))) throw err;
      // Kolom atribusi belum ada di DB (migrasi 009/010 belum dijalankan): jangan hilangkan
      // datanya, simpan di akhir kolom "message" dan catat sebagai event agar terlihat.
      var keep = [];
      ['gclid', 'gbraid', 'wbraid', 'utm_term', 'utm_content', 'landing_page'].forEach(function (k) {
        if (row[k]) keep.push(k + '=' + row[k]);
        delete row[k];
      });
      if (keep.length) row.message = ((row.message ? row.message + ' ' : '') + '[attr ' + keep.join(' ') + ']').slice(0, 1000);
      track('lead_attr_fallback');
      if (window.console) console.warn('[lp] Kolom atribusi belum ada di tabel leads. Jalankan migrasi 009 & 010.');
      return insert(row);
    });
  }
  // Tampilkan tautan WhatsApp yang BISA DIKLIK (bukan window.open di callback async,
  // yang diblokir popup blocker di banyak HP, terutama iOS).
  function showWaFallback(text) {
    msgEl.className = 'msg err';
    msgEl.textContent = 'Form belum bisa terkirim. Ketuk tombol ini agar data Anda tetap sampai: ';
    var a = document.createElement('a');
    a.href = waUrl(text); a.target = '_blank'; a.rel = 'noopener';
    a.className = 'btn btn-wa'; a.style.marginTop = '10px';
    a.textContent = 'Kirim lewat WhatsApp';
    a.addEventListener('click', function () { track('whatsapp_click', {context: 'lp-form-fallback'}); });
    msgEl.appendChild(document.createElement('br')); msgEl.appendChild(a);
  }
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, nama = clean(f.nama.value, 80), wa = normPhone(f.wa.value);
    [f.nama, f.wa].forEach(function (i) { i.classList.remove('bad'); });
    if (f.website.value) return;                    // honeypot
    if (Date.now() - loadedAt < 2500) return;       // terlalu cepat = bot
    if (nama.length < 2) { f.nama.classList.add('bad'); f.nama.focus(); return say('Isi nama Anda (minimal 2 huruf).', 'err'); }
    if (wa.replace('+', '').length < 9 || wa.replace('+', '').length > 15) { f.wa.classList.add('bad'); f.wa.focus(); return say('Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.', 'err'); }
    if (!state.area) return say('Pilih lokasi Anda dulu (langkah 2).', 'err');
    var note = clean(f.catatan.value, 500), btn = form.querySelector('button[type=submit]');
    var row = Object.assign({name: nama, phone: wa, service: state.problem, area: state.area, message: note || null, source_page: location.pathname}, attr());
    btn.disabled = true; say('Mengirim…');
    save(row).then(function () {
      track('lead_form_submit', {form: 'lp'});
      say('Terkirim. Kami hubungi lewat WhatsApp secepatnya.', 'ok'); form.reset();
    }).catch(function () {
      var t = 'Halo NARAYA, saya ' + nama + ' (' + wa + '). Butuh: ' + state.problem + ' di ' + state.area + '.' + (note ? ' Catatan: ' + note + '.' : '') + ' Mohon info estimasi dan jadwal. [ref: lp]';
      showWaFallback(t);
    }).then(function () { btn.disabled = false; });
  });
})();
