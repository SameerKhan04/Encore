-- In-app match invites targeted by Encore public ID.
create table if not exists public.encore_match_invites (
  id uuid primary key default gen_random_uuid(),
  from_id text not null,
  to_id text not null,
  match_id text not null,
  invite_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'cancelled', 'expired', 'accepted')),
  created_at timestamptz not null default now()
);

alter table public.encore_match_invites
  add column if not exists status text;

-- Existing rows / tables created without status.
update public.encore_match_invites set status = 'pending' where status is null;

create index if not exists encore_match_invites_to_id_idx
  on public.encore_match_invites (to_id);

alter table public.encore_match_invites enable row level security;

drop policy if exists "encore_match_invites_select_anon" on public.encore_match_invites;
drop policy if exists "encore_match_invites_insert_anon" on public.encore_match_invites;
drop policy if exists "encore_match_invites_update_anon" on public.encore_match_invites;

create policy "encore_match_invites_select_anon"
  on public.encore_match_invites for select to anon using (true);

create policy "encore_match_invites_insert_anon"
  on public.encore_match_invites for insert to anon with check (true);

create policy "encore_match_invites_update_anon"
  on public.encore_match_invites for update to anon using (true) with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'encore_match_invites'
  ) then
    alter publication supabase_realtime add table public.encore_match_invites;
  end if;
end $$;
