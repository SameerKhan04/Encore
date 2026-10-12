# ADR-007: Anonymous Supabase auth for production RLS

## Status

Accepted

## Context

Encore profiles are phone-local (no email/password), but open `anon` RLS policies on
friend requests, invites, and matches are not acceptable for production. We need a
stable identity for Postgres RLS without introducing a sign-up UX.

## Decision

1. Enable Supabase **Anonymous** auth.
2. On app launch (when Supabase is configured), call `signInAnonymously()` once and
   persist the session via AsyncStorage on a shared Supabase client.
3. Store `auth_user_id` on `encore_profiles` and link it after profile setup.
4. Apply RLS policies in `supabase/encore_rls.sql` so authenticated users can only
   mutate their own profile / social rows involving their Encore public ID
   (`my_encore_public_id()`). Match + voice tables allow any authenticated role for
   now (host/guest ids remain ephemeral).

## Consequences

- Dashboard must have Anonymous provider enabled or social writes fail after RLS.
- Existing open `anon` policies are dropped by `encore_rls.sql`; re-run only when ready.
- Memory transport / no-Supabase builds are unchanged.
- Push tokens and presence continue to live on `encore_profiles`.
