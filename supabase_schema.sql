create extension if not exists pgcrypto;

drop view if exists public.spaces_public;
drop view if exists public.profiles_public;
drop table if exists public.profiles cascade;
drop table if exists public.spaces cascade;

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  space_code text not null unique,
  admin_pin_hash text not null,
  is_active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  display_name text not null,
  whatsapp_number text not null,
  availability text not null,
  short_note text,
  is_visible boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index idx_spaces_code on public.spaces(space_code);
create index idx_profiles_space on public.profiles(space_id);
create index idx_profiles_visibility on public.profiles(is_visible);

create or replace view public.spaces_public as
select
  id,
  name,
  description,
  space_code,
  is_active,
  expires_at,
  created_at
from public.spaces;

create or replace view public.profiles_public as
select
  id,
  space_id,
  display_name,
  whatsapp_number,
  availability,
  short_note,
  is_visible,
  expires_at,
  created_at
from public.profiles;

alter table public.spaces enable row level security;
alter table public.profiles enable row level security;

grant select on public.spaces_public to anon, authenticated;
grant select on public.profiles_public to anon, authenticated;

grant select, insert, update on public.spaces to anon, authenticated;
grant select, insert, update on public.profiles to anon, authenticated;

drop policy if exists "spaces_select_all" on public.spaces;
create policy "spaces_select_all"
on public.spaces
for select
to anon, authenticated
using (true);

drop policy if exists "spaces_insert_all" on public.spaces;
create policy "spaces_insert_all"
on public.spaces
for insert
to anon, authenticated
with check (true);

drop policy if exists "spaces_update_all" on public.spaces;
create policy "spaces_update_all"
on public.spaces
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "profiles_insert_all" on public.profiles;
create policy "profiles_insert_all"
on public.profiles
for insert
to anon, authenticated
with check (true);

drop policy if exists "profiles_update_all" on public.profiles;
create policy "profiles_update_all"
on public.profiles
for update
to anon, authenticated
using (true)
with check (true);
