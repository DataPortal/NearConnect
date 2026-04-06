begin;

create extension if not exists pgcrypto;

drop view if exists public.participants_public cascade;
drop view if exists public.spaces_public cascade;

drop table if exists public.space_metrics_aggregated cascade;
drop table if exists public.audit_events_minimal cascade;
drop table if exists public.space_fx_quotes cascade;
drop table if exists public.payments cascade;
drop table if exists public.participants cascade;
drop table if exists public.spaces cascade;
drop table if exists public.venues cascade;

drop type if exists public.gender_type cascade;
drop type if exists public.availability_type cascade;
drop type if exists public.payment_status_type cascade;
drop type if exists public.space_status_type cascade;

create type public.gender_type as enum ('M', 'F', 'X');

create type public.availability_type as enum (
  'Disponible',
  'Ouvert à discuter',
  'Ouvert à danser',
  'Ouvert à networking',
  'Juste présent',
  'Pas disponible maintenant'
);

create type public.payment_status_type as enum (
  'pending',
  'confirmed',
  'failed',
  'expired',
  'cancelled'
);

create type public.space_status_type as enum (
  'draft',
  'active',
  'closed',
  'expired',
  'purged'
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null,
  city text,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  default_radius_meters integer not null default 100,
  payment_recipient_msisdn text,
  created_at timestamptz not null default now(),
  constraint chk_venues_radius_positive check (default_radius_meters > 0)
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  event_name text not null,
  public_code text not null unique,
  admin_pin_hash text not null,
  country_code text not null,
  currency_code text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  radius_meters integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.space_status_type not null default 'draft',
  payment_recipient_msisdn text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint chk_space_time_valid check (ends_at > starts_at),
  constraint chk_space_radius_positive check (radius_meters > 0)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  session_token_hash text not null,
  display_name text not null,
  gender public.gender_type not null,
  age integer not null,
  photo_path text,
  phone_normalized text not null,
  phone_hash text not null,
  whatsapp_number_encrypted text not null,
  availability public.availability_type not null,
  paid_unlock boolean not null default false,
  is_visible boolean not null default true,
  joined_latitude numeric(9,6),
  joined_longitude numeric(9,6),
  joined_in_radius boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  expires_at timestamptz not null,
  constraint chk_participants_age_valid check (age >= 18 and age <= 99),
  constraint chk_participants_name_len check (char_length(trim(display_name)) between 2 and 20),
  constraint chk_participants_phone_not_empty check (char_length(trim(phone_normalized)) >= 8),
  constraint chk_participants_expiry_after_create check (expires_at >= created_at)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  phone_hash text not null,
  country_code text not null,
  currency_code text not null,
  base_amount_usd numeric(10,2) not null default 1.00,
  local_amount numeric(12,2) not null,
  fx_rate_used numeric(18,6) not null,
  rounding_rule text not null,
  payment_method text not null,
  recipient_msisdn text not null,
  payment_reference text,
  provider_reference text,
  status public.payment_status_type not null default 'pending',
  paid_in_radius boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz not null,
  constraint chk_payments_base_amount_positive check (base_amount_usd > 0),
  constraint chk_payments_local_amount_positive check (local_amount > 0),
  constraint chk_payments_fx_positive check (fx_rate_used > 0)
);

create table public.space_fx_quotes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  base_currency text not null default 'USD',
  quote_currency text not null,
  fx_rate numeric(18,6) not null,
  rounding_rule text not null,
  rounded_local_amount numeric(12,2) not null,
  quoted_at timestamptz not null default now(),
  constraint chk_quotes_fx_positive check (fx_rate > 0),
  constraint chk_quotes_amount_positive check (rounded_local_amount > 0)
);

create table public.audit_events_minimal (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  event_type text not null,
  created_at timestamptz not null default now()
);

create table public.space_metrics_aggregated (
  id uuid primary key default gen_random_uuid(),
  space_id uuid,
  total_profiles integer not null default 0,
  total_paid integer not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_metrics_profiles_nonnegative check (total_profiles >= 0),
  constraint chk_metrics_paid_nonnegative check (total_paid >= 0)
);

create index idx_venues_country on public.venues(country_code);
create index idx_spaces_venue_id on public.spaces(venue_id);
create index idx_spaces_status on public.spaces(status);
create index idx_spaces_start_end on public.spaces(starts_at, ends_at);
create index idx_spaces_country on public.spaces(country_code);
create index idx_participants_space_id on public.participants(space_id);
create index idx_participants_visible on public.participants(space_id, is_visible);
create index idx_participants_paid_unlock on public.participants(space_id, paid_unlock);
create index idx_participants_phone_hash on public.participants(phone_hash);
create index idx_payments_space_id on public.payments(space_id);
create index idx_payments_participant_id on public.payments(participant_id);
create index idx_payments_status on public.payments(status);
create index idx_payments_phone_hash on public.payments(phone_hash);
create index idx_space_fx_quotes_space_id on public.space_fx_quotes(space_id);
create index idx_audit_events_space_id on public.audit_events_minimal(space_id);

create unique index uq_participants_space_phone
  on public.participants(space_id, phone_normalized);

create unique index uq_participants_space_session
  on public.participants(space_id, session_token_hash);

create unique index uq_payments_one_confirmed_per_space_phone
  on public.payments(space_id, phone_hash)
  where status = 'confirmed';

create view public.spaces_public as
select
  s.id,
  s.venue_id,
  v.name as venue_name,
  v.city as venue_city,
  s.event_name,
  s.public_code,
  s.country_code,
  s.currency_code,
  s.latitude,
  s.longitude,
  s.radius_meters,
  s.starts_at,
  s.ends_at,
  s.status
from public.spaces s
join public.venues v on v.id = s.venue_id;

create view public.participants_public as
select
  p.id,
  p.space_id,
  p.display_name,
  p.gender,
  p.age,
  p.photo_path,
  p.availability,
  p.is_visible,
  p.created_at,
  p.expires_at
from public.participants p
where p.is_visible = true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_spaces_set_updated_at
before update on public.spaces
for each row
execute function public.set_updated_at();

create trigger trg_participants_set_updated_at
before update on public.participants
for each row
execute function public.set_updated_at();

create or replace function public.mark_expired_spaces()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update public.spaces
  set status = 'expired',
      updated_at = now()
  where status in ('draft', 'active')
    and ends_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.purge_expired_space(p_space_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_space public.spaces%rowtype;
  v_total_profiles integer;
  v_total_paid integer;
begin
  select *
  into v_space
  from public.spaces
  where id = p_space_id;

  if not found then
    return false;
  end if;

  if v_space.status not in ('expired', 'closed') and v_space.ends_at > now() then
    return false;
  end if;

  select count(*) into v_total_profiles
  from public.participants
  where space_id = p_space_id;

  select count(*) into v_total_paid
  from public.payments
  where space_id = p_space_id
    and status = 'confirmed';

  insert into public.space_metrics_aggregated (
    space_id,
    total_profiles,
    total_paid
  )
  values (
    p_space_id,
    coalesce(v_total_profiles, 0),
    coalesce(v_total_paid, 0)
  );

  delete from public.audit_events_minimal where space_id = p_space_id;
  delete from public.payments where space_id = p_space_id;
  delete from public.participants where space_id = p_space_id;

  update public.spaces
  set status = 'purged',
      updated_at = now()
  where id = p_space_id;

  return true;
end;
$$;

alter table public.venues enable row level security;
alter table public.spaces enable row level security;
alter table public.participants enable row level security;
alter table public.payments enable row level security;
alter table public.space_fx_quotes enable row level security;
alter table public.audit_events_minimal enable row level security;
alter table public.space_metrics_aggregated enable row level security;

drop policy if exists venues_no_public_access on public.venues;
create policy venues_no_public_access
on public.venues
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists spaces_no_public_access on public.spaces;
create policy spaces_no_public_access
on public.spaces
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists participants_no_public_access on public.participants;
create policy participants_no_public_access
on public.participants
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists payments_no_public_access on public.payments;
create policy payments_no_public_access
on public.payments
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists fx_no_public_access on public.space_fx_quotes;
create policy fx_no_public_access
on public.space_fx_quotes
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists audit_no_public_access on public.audit_events_minimal;
create policy audit_no_public_access
on public.audit_events_minimal
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists metrics_no_public_access on public.space_metrics_aggregated;
create policy metrics_no_public_access
on public.space_metrics_aggregated
for all
to anon, authenticated
using (false)
with check (false);

grant usage on schema public to anon, authenticated;
grant select on public.spaces_public to anon, authenticated;
grant select on public.participants_public to anon, authenticated;

commit;
