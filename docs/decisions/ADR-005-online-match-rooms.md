# ADR-005: Online match rooms via invite codes + Supabase

## Status
Accepted

## Date
2026-10-11

## Context
Party Mode proves the core loop on one device. Cross-country play needs a shared room, short invite codes, and realtime state sync without building a custom game server.

## Decision
Add an **Online Match** path beside Party Mode:

- Short ambiguity-safe invite codes
- `MatchTransport` interface with an in-memory implementation (tests / no-config demo) and a Supabase implementation (cross-device)
- Anonymous player ids for lobby presence; full auth can tighten later
- Sync a compact match snapshot (challenge, scores, turn, transcript words)

## Alternatives considered

### Keep offline-only
Rejected: product goal includes remote play.

### Peer WebRTC only
Rejected for v1 online: NAT/signaling complexity is higher than a small Supabase table + Realtime.

## Consequences
- ADR-004 still covers Party Mode; online is a separate transport layer
- Requires `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `supabase/encore_matches.sql`
- Without those env vars the app uses the memory transport (same-device demo only)
