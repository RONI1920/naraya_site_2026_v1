-- ============================================================
-- 004_public_testimonial_submit.sql
-- Lets site visitors submit a testimonial directly from the browser
-- using the public anon key, while keeping moderation fully in your
-- control:
--   * Every row a visitor inserts MUST have is_published = false.
--     The column also defaults to false (see 001_schema.sql), so a
--     normal submission (which never sends is_published at all)
--     satisfies this automatically.
--   * Visitors can never set is_published = true themselves — the
--     WITH CHECK below rejects that at the database level, not just
--     in the browser, so it can't be bypassed by editing the JS.
--   * Nothing changes for reading: public SELECT is still restricted
--     to is_published = true rows only (see 002_rls_policies.sql).
--   * You approve a testimonial by flipping is_published to true from
--     the Supabase dashboard (Table Editor) or the SQL editor:
--       update testimonials set is_published = true where id = '...';
-- ============================================================

create policy "public_insert_testimonials"
  on testimonials for insert
  to anon, authenticated
  with check (is_published = false);
