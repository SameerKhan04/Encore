-- Mutual friend requests (no auth — keyed by Encore public IDs).
create table if not exists public.encore_friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id text not null,
  to_id text not null,
  status text not null check (status in ('pending', 'accepted', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint encore_friend_requests_no_self check (from_id <> to_id)
);

create unique index if not exists encore_friend_requests_pending_pair
  on public.encore_friend_requests (from_id, to_id)
  where status = 'pending';

-- Widen status check for existing projects (drop + re-add).
alter table public.encore_friend_requests
  drop constraint if exists encore_friend_requests_status_check;
alter table public.encore_friend_requests
  add constraint encore_friend_requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'removed'));

alter table public.encore_friend_requests enable row level security;

drop policy if exists "encore_friend_requests_select_anon" on public.encore_friend_requests;
drop policy if exists "encore_friend_requests_insert_anon" on public.encore_friend_requests;
drop policy if exists "encore_friend_requests_update_anon" on public.encore_friend_requests;

create policy "encore_friend_requests_select_anon"
  on public.encore_friend_requests for select to anon using (true);

create policy "encore_friend_requests_insert_anon"
  on public.encore_friend_requests for insert to anon with check (true);

create policy "encore_friend_requests_update_anon"
  on public.encore_friend_requests for update to anon using (true) with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'encore_friend_requests'
  ) then
    alter publication supabase_realtime add table public.encore_friend_requests;
  end if;
end $$;
