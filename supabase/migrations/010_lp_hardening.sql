-- ============================================================
-- 010_lp_hardening.sql
-- Jalankan di Supabase > SQL Editor SETELAH 009_ads_attribution.sql.
-- Aman dijalankan berulang.
--
-- Isi:
--   1. Kolom gbraid & wbraid (terpisah dari gclid).
--   2. Policy INSERT leads diperketat: publik tidak boleh mengisi
--      status/notes (selalu 'new' / kosong).
--   3. Trigger BEFORE INSERT pada leads:
--        - normalisasi nomor telepon (08xx / 62xx / +62xx -> +62xx)
--        - buang lead ganda (nomor sama dalam 2 menit) tanpa error
--        - batas laju: > 30 lead/menit ditolak (anti-spam)
--   4. is_admin() dikunci search_path-nya.
-- ============================================================

-- 1. gbraid / wbraid -------------------------------------------------
alter table public.leads add column if not exists gbraid text;
alter table public.leads add column if not exists wbraid text;
alter table public.leads drop constraint if exists leads_gbraid_len;
alter table public.leads add  constraint leads_gbraid_len
  check (gbraid is null or char_length(gbraid) <= 200);
alter table public.leads drop constraint if exists leads_wbraid_len;
alter table public.leads add  constraint leads_wbraid_len
  check (wbraid is null or char_length(wbraid) <= 200);
alter table public.leads drop constraint if exists leads_landing_page_len;
alter table public.leads add  constraint leads_landing_page_len
  check (landing_page is null or char_length(landing_page) <= 200);

-- 2. Policy insert yang lebih ketat -------------------------------------
drop policy if exists "public_insert_leads" on public.leads;
create policy "public_insert_leads"
  on public.leads for insert
  to anon, authenticated
  with check (status = 'new' and notes is null);

-- 3. Trigger normalisasi + anti-duplikat + rate limit -----------------------
create or replace function public.leads_before_insert()
returns trigger
language plpgsql
security definer   -- perlu agar pengecekan duplikat/rate limit bisa membaca leads walau anon tak punya SELECT
set search_path = public
as $$
declare
  d text;
begin
  new.name := btrim(new.name);

  -- Normalisasi nomor: sisakan digit, ubah awalan 0 / 62 menjadi +62
  d := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  if d like '0%' then
    d := '62' || substr(d, 2);
  elsif d like '8%' then
    d := '62' || d;
  end if;
  if char_length(d) between 8 and 19 then
    new.phone := '+' || d;
  end if;

  -- Lead ganda (nomor sama < 2 menit): abaikan diam-diam, klien tetap dapat "sukses"
  if exists (
    select 1 from public.leads
    where phone = new.phone and created_at > now() - interval '2 minutes'
  ) then
    return null;
  end if;

  -- Batas laju global
  if (select count(*) from public.leads where created_at > now() - interval '1 minute') > 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_leads_before_insert on public.leads;
create trigger trg_leads_before_insert
  before insert on public.leads
  for each row execute function public.leads_before_insert();

-- 4. Kunci search_path fungsi security definer ------------------------------
alter function public.is_admin() set search_path = public;

-- Cek hasil (opsional):
-- select column_name from information_schema.columns
--  where table_name='leads' and column_name in ('gclid','gbraid','wbraid','utm_term','utm_content','landing_page');
