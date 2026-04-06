create extension if not exists pgcrypto;

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  space_code text not null unique,
  admin_pin text not null,
  is_active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.profiles (
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

create index if not exists idx_spaces_space_code on public.spaces(space_code);
create index if not exists idx_profiles_space_id on public.profiles(space_id);
create index if not exists idx_profiles_visible on public.profiles(is_visible);

alter table public.spaces enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "public can create spaces" on public.spaces;
create policy "public can create spaces"
on public.spaces
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can read active spaces" on public.spaces;
create policy "public can read active spaces"
on public.spaces
for select
to anon, authenticated
using (true);

drop policy if exists "public can update spaces" on public.spaces;
create policy "public can update spaces"
on public.spaces
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can create profiles" on public.profiles;
create policy "public can create profiles"
on public.profiles
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can read profiles" on public.profiles;
create policy "public can read profiles"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "public can update profiles" on public.profiles;
create policy "public can update profiles"
on public.profiles
for update
to anon, authenticated
using (true)
with check (true);
