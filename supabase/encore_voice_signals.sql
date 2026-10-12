-- Run in the Supabase SQL editor for Online live voice signaling.
create table if not exists public.encore_voice_signals (
  id bigserial primary key,
  match_id text not null,
  from_player_id text not null,
  type text not null check (type in ('offer', 'answer', 'ice')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists encore_voice_signals_match_id_idx
  on public.encore_voice_signals (match_id);

alter table public.encore_voice_signals enable row level security;

drop policy if exists "encore_voice_signals_select_anon" on public.encore_voice_signals;
drop policy if exists "encore_voice_signals_insert_anon" on public.encore_voice_signals;

create policy "encore_voice_signals_select_anon"
  on public.encore_voice_signals for select to anon using (true);

create policy "encore_voice_signals_insert_anon"
  on public.encore_voice_signals for insert to anon with check (true);

-- Idempotent: only add to Realtime if not already a member.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'encore_voice_signals'
  ) then
    alter publication supabase_realtime add table public.encore_voice_signals;
  end if;
end $$;
