-- Run in the Supabase SQL editor for cross-device Online Match.
create table if not exists public.encore_matches (
  id uuid primary key,
  invite_code text unique not null,
  host_id text not null,
  guest_id text,
  abandoned_by text,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Additive for existing projects that already created the table.
-- If a prior run failed mid-script, run these two statements alone, then:
--   notify pgrst, 'reload schema';
alter table public.encore_matches
  add column if not exists abandoned_by text;

alter table public.encore_matches enable row level security;

drop policy if exists "encore_matches_select_anon" on public.encore_matches;
drop policy if exists "encore_matches_insert_anon" on public.encore_matches;
drop policy if exists "encore_matches_update_anon" on public.encore_matches;

-- Beta-open policies; tighten before public launch.
create policy "encore_matches_select_anon"
  on public.encore_matches for select to anon using (true);

create policy "encore_matches_insert_anon"
  on public.encore_matches for insert to anon with check (true);

create policy "encore_matches_update_anon"
  on public.encore_matches for update to anon using (true) with check (true);

-- Idempotent: only add to Realtime if not already a member.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'encore_matches'
  ) then
    alter publication supabase_realtime add table public.encore_matches;
  end if;
end $$;
