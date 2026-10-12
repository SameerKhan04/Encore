-- Production-oriented RLS: requires Anonymous sign-ins enabled in Supabase Auth.
-- Run after encore_profiles / friend_requests / match_invites / matches exist.
-- Enable: Authentication → Providers → Anonymous → On

alter table public.encore_profiles
  add column if not exists auth_user_id uuid unique;

create or replace function public.my_encore_public_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public_id
  from public.encore_profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

-- Profiles -----------------------------------------------------------------
drop policy if exists "encore_profiles_select_anon" on public.encore_profiles;
drop policy if exists "encore_profiles_insert_anon" on public.encore_profiles;
drop policy if exists "encore_profiles_update_anon" on public.encore_profiles;
drop policy if exists "encore_profiles_select_auth" on public.encore_profiles;
drop policy if exists "encore_profiles_insert_own" on public.encore_profiles;
drop policy if exists "encore_profiles_update_own" on public.encore_profiles;

create policy "encore_profiles_select_auth"
  on public.encore_profiles for select to authenticated using (true);

create policy "encore_profiles_insert_own"
  on public.encore_profiles for insert to authenticated
  with check (auth_user_id = auth.uid());

-- Allow claiming a row that has no auth link yet, then only the owner can update.
create policy "encore_profiles_update_own"
  on public.encore_profiles for update to authenticated
  using (auth_user_id is null or auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Friend requests ----------------------------------------------------------
drop policy if exists "encore_friend_requests_select_anon" on public.encore_friend_requests;
drop policy if exists "encore_friend_requests_insert_anon" on public.encore_friend_requests;
drop policy if exists "encore_friend_requests_update_anon" on public.encore_friend_requests;
drop policy if exists "encore_friend_requests_select_auth" on public.encore_friend_requests;
drop policy if exists "encore_friend_requests_insert_own" on public.encore_friend_requests;
drop policy if exists "encore_friend_requests_update_party" on public.encore_friend_requests;

create policy "encore_friend_requests_select_auth"
  on public.encore_friend_requests for select to authenticated
  using (
    from_id = public.my_encore_public_id()
    or to_id = public.my_encore_public_id()
  );

create policy "encore_friend_requests_insert_own"
  on public.encore_friend_requests for insert to authenticated
  with check (from_id = public.my_encore_public_id());

create policy "encore_friend_requests_update_party"
  on public.encore_friend_requests for update to authenticated
  using (
    from_id = public.my_encore_public_id()
    or to_id = public.my_encore_public_id()
  )
  with check (
    from_id = public.my_encore_public_id()
    or to_id = public.my_encore_public_id()
  );

-- Match invites ------------------------------------------------------------
drop policy if exists "encore_match_invites_select_anon" on public.encore_match_invites;
drop policy if exists "encore_match_invites_insert_anon" on public.encore_match_invites;
drop policy if exists "encore_match_invites_update_anon" on public.encore_match_invites;
drop policy if exists "encore_match_invites_select_auth" on public.encore_match_invites;
drop policy if exists "encore_match_invites_insert_own" on public.encore_match_invites;
drop policy if exists "encore_match_invites_update_party" on public.encore_match_invites;

create policy "encore_match_invites_select_auth"
  on public.encore_match_invites for select to authenticated
  using (
    from_id = public.my_encore_public_id()
    or to_id = public.my_encore_public_id()
  );

create policy "encore_match_invites_insert_own"
  on public.encore_match_invites for insert to authenticated
  with check (from_id = public.my_encore_public_id());

create policy "encore_match_invites_update_party"
  on public.encore_match_invites for update to authenticated
  using (
    from_id = public.my_encore_public_id()
    or to_id = public.my_encore_public_id()
  )
  with check (
    from_id = public.my_encore_public_id()
    or to_id = public.my_encore_public_id()
  );

-- Matches + voice: any authenticated client (host/guest ids are still ephemeral)
drop policy if exists "encore_matches_select_anon" on public.encore_matches;
drop policy if exists "encore_matches_insert_anon" on public.encore_matches;
drop policy if exists "encore_matches_update_anon" on public.encore_matches;
drop policy if exists "encore_matches_select_auth" on public.encore_matches;
drop policy if exists "encore_matches_insert_auth" on public.encore_matches;
drop policy if exists "encore_matches_update_auth" on public.encore_matches;

create policy "encore_matches_select_auth"
  on public.encore_matches for select to authenticated using (true);
create policy "encore_matches_insert_auth"
  on public.encore_matches for insert to authenticated with check (true);
create policy "encore_matches_update_auth"
  on public.encore_matches for update to authenticated using (true) with check (true);

drop policy if exists "encore_voice_signals_select_anon" on public.encore_voice_signals;
drop policy if exists "encore_voice_signals_insert_anon" on public.encore_voice_signals;
drop policy if exists "encore_voice_signals_select_auth" on public.encore_voice_signals;
drop policy if exists "encore_voice_signals_insert_auth" on public.encore_voice_signals;

create policy "encore_voice_signals_select_auth"
  on public.encore_voice_signals for select to authenticated using (true);
create policy "encore_voice_signals_insert_auth"
  on public.encore_voice_signals for insert to authenticated with check (true);
