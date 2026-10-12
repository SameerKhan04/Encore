-- Phone-local public profiles for friend lookup.
-- auth_user_id links to Supabase Anonymous auth for production RLS (see encore_rls.sql).
create table if not exists public.encore_profiles (
  public_id text primary key,
  display_name text not null,
  last_seen_at timestamptz,
  expo_push_token text,
  auth_user_id uuid unique,
  updated_at timestamptz not null default now()
);

alter table public.encore_profiles
  add column if not exists last_seen_at timestamptz;
alter table public.encore_profiles
  add column if not exists expo_push_token text;
alter table public.encore_profiles
  add column if not exists auth_user_id uuid unique;

alter table public.encore_profiles enable row level security;

drop policy if exists "encore_profiles_select_anon" on public.encore_profiles;
drop policy if exists "encore_profiles_insert_anon" on public.encore_profiles;
drop policy if exists "encore_profiles_update_anon" on public.encore_profiles;

-- Beta-open policies; tighten before public launch.
create policy "encore_profiles_select_anon"
  on public.encore_profiles for select to anon using (true);

create policy "encore_profiles_insert_anon"
  on public.encore_profiles for insert to anon with check (true);

create policy "encore_profiles_update_anon"
  on public.encore_profiles for update to anon using (true) with check (true);
