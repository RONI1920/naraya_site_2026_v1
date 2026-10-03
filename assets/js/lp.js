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
  function clean(s, n) { return String(s || '').replace(/[<>]/g, '').trim().slice(0, n); }
  function attr() {
    var a = window.NarayaAttribution ? window.NarayaAttribution.get() : {}, p = new URLSearchParams(location.search);
    function pick(k, n) { return clean(p.get(k) || a[k] || '', n || 100) || null; }
    return {utm_source: pick('utm_source'), utm_medium: pick('utm_medium'), utm_campaign: pick('utm_campaign'),
      gclid: pick('gclid', 200) || clean(a.gbraid || a.wbraid || '', 200) || null, utm_term: pick('utm_term'), utm_content: pick('utm_content'),
      landing_page: clean(a.landing_page || location.pathname, 200)};
  }
  function insert(row) { return window.sb.from('leads').insert([row]).then(function (r) { if (r.error) throw r.error; }); }
  function save(row) {
    if (!window.sb) return Promise.reject(new Error('db'));
    return insert(row).catch(function (err) {
      if (!/PGRST204|42703|column/i.test(String((err && (err.message || err.code)) || ''))) throw err;
      ['gclid', 'utm_term', 'utm_content', 'landing_page'].forEach(function (k) { delete row[k]; });
      return insert(row);
    });
  }
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, nama = clean(f.nama.value, 80), wa = f.wa.value.replace(/[^0-9+]/g, '');
    [f.nama, f.wa].forEach(function (i) { i.classList.remove('bad'); });
    if (f.website.value) return;
    if (!nama) { f.nama.classList.add('bad'); f.nama.focus(); return say('Isi nama Anda dulu.', 'err'); }
    if (wa.replace('+', '').length < 9) { f.wa.classList.add('bad'); f.wa.focus(); return say('Nomor WhatsApp belum lengkap.', 'err'); }
    if (!state.area) return say('Pilih lokasi Anda dulu (langkah 2).', 'err');
    var note = clean(f.catatan.value, 500), btn = form.querySelector('button[type=submit]');
    var row = Object.assign({name: nama, phone: wa, service: state.problem, area: state.area, message: note || null, source_page: location.pathname}, attr());
    btn.disabled = true; say('Mengirim…');
    save(row).then(function () {
      track('lead_form_submit');
      say('Terkirim. Kami hubungi lewat WhatsApp secepatnya.', 'ok'); form.reset();
    }).catch(function () {
      var t = 'Halo NARAYA, saya ' + nama + ' (' + wa + '). Butuh: ' + state.problem + ' di ' + state.area + '.' + (note ? ' Catatan: ' + note + '.' : '') + ' Mohon info estimasi dan jadwal. [ref: lp]';
      track('whatsapp_click', {context: 'lp-form-fallback'});
      window.open(waUrl(t), '_blank');
      say('Form belum bisa terkirim, kami buka WhatsApp supaya data Anda tetap sampai.', 'err');
    }).then(function () { btn.disabled = false; });
  });
})();
