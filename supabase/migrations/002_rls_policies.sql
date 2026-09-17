-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security. This is the file that makes it SAFE to use
-- the public anon key directly from the browser (see
-- assets/js/supabase-client.js). Read it carefully before deploying.
--
-- Rules enforced:
--   * leads, contact_messages: public can INSERT only. No public
--     SELECT/UPDATE/DELETE — visitors can never read other people's
--     submitted data.
--   * services, service_areas, faqs, testimonials, blog_posts:
--     public can SELECT only rows marked published/active. No public
--     write access at all.
--   * business_settings: no public access whatsoever.
--   * All admin (read leads, update status, publish content, etc.)
--     happens through an authenticated role — see the "admin" policies
--     below, which require auth.uid() to be present AND to match a
--     row in the `admins` allow-list table.
-- ============================================================

-- ---------- admins allow-list ------------------------------------
-- Add the auth.users UUID of trusted staff here manually via the
-- Supabase dashboard/SQL editor. Never expose this table publicly.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;
-- Intentionally NO policies here: table is inaccessible via anon/authenticated
-- roles from the client; only service_role (server-side) or the Supabase
-- dashboard can read/write it.

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$ language sql stable security definer;

-- ---------- leads --------------------------------------------------
alter table leads enable row level security;

create policy "public_insert_leads"
  on leads for insert
  to anon, authenticated
  with check (true);

create policy "admin_select_leads"
  on leads for select
  to authenticated
  using (is_admin());

create policy "admin_update_leads"
  on leads for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "admin_delete_leads"
  on leads for delete
  to authenticated
  using (is_admin());

-- ---------- contact_messages -----------------------------------------
alter table contact_messages enable row level security;

create policy "public_insert_contact_messages"
  on contact_messages for insert
  to anon, authenticated
  with check (true);

create policy "admin_select_contact_messages"
  on contact_messages for select
  to authenticated
  using (is_admin());

create policy "admin_update_contact_messages"
  on contact_messages for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "admin_delete_contact_messages"
  on contact_messages for delete
  to authenticated
  using (is_admin());

-- ---------- services --------------------------------------------------
alter table services enable row level security;

create policy "public_select_active_services"
  on services for select
  to anon, authenticated
  using (is_active = true);

create policy "admin_write_services"
  on services for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------- service_areas ----------------------------------------------
alter table service_areas enable row level security;

create policy "public_select_active_service_areas"
  on service_areas for select
  to anon, authenticated
  using (is_active = true);

create policy "admin_write_service_areas"
  on service_areas for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------- testimonials -----------------------------------------------
alter table testimonials enable row level security;

create policy "public_select_published_testimonials"
  on testimonials for select
  to anon, authenticated
  using (is_published = true);

create policy "admin_write_testimonials"
  on testimonials for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------- faqs -------------------------------------------------------
alter table faqs enable row level security;

create policy "public_select_published_faqs"
  on faqs for select
  to anon, authenticated
  using (is_published = true);

create policy "admin_write_faqs"
  on faqs for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------- blog_posts ---------------------------------------------------
alter table blog_posts enable row level security;

create policy "public_select_published_blog_posts"
  on blog_posts for select
  to anon, authenticated
  using (is_published = true);

create policy "admin_write_blog_posts"
  on blog_posts for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ---------- business_settings ---------------------------------------------
alter table business_settings enable row level security;
-- No anon/authenticated policies at all: this table is admin/service-role
-- only, by design (no policy = no access under RLS).

create policy "admin_write_business_settings"
  on business_settings for all
  to authenticated
  using (is_admin())
  with check (is_admin());
