# Architecture Decision Records

ADRs capture *why* we chose a path, not just *what* we built.

| ID | Title | Status |
|----|-------|--------|
| [ADR-001](./ADR-001-expo-managed-workflow.md) | Expo managed workflow with Expo Router | Accepted |
| [ADR-002](./ADR-002-zustand-game-state.md) | Zustand for the game state machine | Accepted |
| [ADR-003](./ADR-003-expo-av-audio.md) | expo-av for lyric recording and playback | Accepted |
| [ADR-004](./ADR-004-offline-local-multiplayer.md) | Offline, single-device local multiplayer | Accepted |
| [ADR-005](./ADR-005-online-match-rooms.md) | Online match rooms via invite codes + Supabase | Accepted |
| [ADR-006](./ADR-006-match-voice-mute.md) | Match voice mute policy (stub session first) | Accepted |
| [ADR-007](./ADR-007-anonymous-supabase-auth.md) | Anonymous Supabase auth for production RLS | Accepted |

## Lifecycle

`PROPOSED → ACCEPTED → (SUPERSEDED | DEPRECATED)`

Do not delete old ADRs. When a decision changes, add a new ADR that supersedes the old one.

## Naming

`ADR-NNN-short-kebab-title.md` — continue the sequence; do not restart numbering.
