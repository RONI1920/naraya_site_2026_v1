/**
 * supabase-client.js
 * ------------------------------------------------------------------
 * Initializes a Supabase client using ONLY the public anon key.
 * This file is safe to ship to the browser because every table it
 * can reach is locked down with Row Level Security — see
 * supabase/migrations/002_rls_policies.sql. It can never read leads,
 * contact_messages, or any admin-only data; it can only INSERT into
 * a narrow allow-list of tables (leads, contact_messages).
 *
 * Requires the Supabase JS CDN script to be loaded first:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 * ------------------------------------------------------------------
 */

(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};

  if (
    !cfg.SUPABASE_URL ||
    cfg.SUPABASE_URL.indexOf("GANTI_") === 0 ||
    !window.supabase
  ) {
    // Config not filled in yet, or CDN script not loaded on this page.
    // Fail silently — forms will fall back to WhatsApp-only submission.
    window.sb = null;
    return;
  }

  window.sb = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );
})();
