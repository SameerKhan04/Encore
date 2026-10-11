# ADR-001: Expo managed workflow with Expo Router

## Status
Accepted

## Date
2026-10-11

## Context
ENCORE is a cross-platform mobile party game that needs microphone recording, haptics, and smooth UI transitions. The team wants to ship without maintaining separate native projects by hand, and needs a clear file-based navigation model for agents and humans.

## Decision
Build with **Expo SDK 57** (managed / CNG workflow) and **Expo Router** for navigation. Configure native behavior via `app.json` and config plugins. Do not hand-edit generated `ios/` or `android/` folders.

## Alternatives Considered

### Bare React Native CLI
- Pros: Full native control from day one
- Cons: Higher ops cost; diverges from Expo module ecosystem and EAS simplicity
- Rejected: Overkill for a local party game with standard device APIs

### React Navigation without Expo Router
- Pros: Familiar imperative navigation setup
- Cons: More boilerplate; weaker file↔route correspondence for agents
- Rejected: Expo Router is the recommended Expo path and matches `AGENTS.md`

### Flutter / native Swift+Kotlin
- Pros: Strong platform performance narratives
- Cons: Different stack than the existing Expo foundation; no reuse of current work
- Rejected: Project already committed to Expo in Phase 1

## Consequences
- Use `npx expo install` for native-touching deps; run `npx expo-doctor` when versions drift
- After adding native modules outside Expo Go’s bundle, use a development build
- Versioned Expo docs (`v57.0.0`) are the source of truth — not training-data memory
- Routes live under `app/`; non-route code stays outside
