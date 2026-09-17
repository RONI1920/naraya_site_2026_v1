-- ============================================================
-- 001_schema.sql
-- Core tables for the Jasa Sedot WC website.
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- updated_at trigger helper -----------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------- business_settings --------------------------------
create table if not exists business_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_business_settings_updated_at
  before update on business_settings
  for each row execute function set_updated_at();

-- ---------- services -------------------------------------------
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text,
  description text,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_services_slug on services (slug);
create index if not exists idx_services_is_active on services (is_active);
create trigger trg_services_updated_at
  before update on services
  for each row execute function set_updated_at();

-- ---------- service_areas ----------------------------------------
create table if not exists service_areas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text not null,
  province text not null,
  description text,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_service_areas_slug on service_areas (slug);
create index if not exists idx_service_areas_is_active on service_areas (is_active);
create trigger trg_service_areas_updated_at
  before update on service_areas
  for each row execute function set_updated_at();

-- ---------- leads ------------------------------------------------
-- Public-facing INSERT-only table fed by the WhatsApp/lead form.
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 100),
  phone text not null check (char_length(phone) between 8 and 20),
  service text check (char_length(service) <= 100),
  area text check (char_length(area) <= 100),
  message text check (char_length(message) <= 1000),
  source_page text check (char_length(source_page) <= 200),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  status text not null default 'new'
    check (status in ('new','contacted','scheduled','completed','cancelled')),
  notes text
);
create index if not exists idx_leads_created_at on leads (created_at desc);
create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_area on leads (area);

-- ---------- testimonials -----------------------------------------
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  area text,
  content text not null check (char_length(content) <= 1000),
  rating int check (rating between 1 and 5),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_testimonials_is_published on testimonials (is_published);

-- ---------- faqs ---------------------------------------------------
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null unique,
  answer text not null,
  category text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_faqs_is_published on faqs (is_published);
create index if not exists idx_faqs_sort_order on faqs (sort_order);

-- ---------- blog_posts ----------------------------------------------
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  featured_image text,
  seo_title text,
  seo_description text,
  author text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_blog_posts_slug on blog_posts (slug);
create index if not exists idx_blog_posts_is_published on blog_posts (is_published);
create index if not exists idx_blog_posts_published_at on blog_posts (published_at desc);
create trigger trg_blog_posts_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();

-- ---------- contact_messages -----------------------------------------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 100),
  phone text check (char_length(phone) <= 20),
  message text not null check (char_length(message) <= 1000),
  source_page text check (char_length(source_page) <= 200),
  status text not null default 'new' check (status in ('new','read','resolved'))
);
create index if not exists idx_contact_messages_created_at on contact_messages (created_at desc);
create index if not exists idx_contact_messages_status on contact_messages (status);
