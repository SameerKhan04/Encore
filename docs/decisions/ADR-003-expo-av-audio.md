# ADR-003: expo-av for lyric recording and playback

## Status
Accepted

## Date
2026-10-11

## Context
The product promise (“your lyrics become their challenge”) requires capturing short audio on device and playing it back for the next player. Phase 1 locks `expo-av` for this. Expo’s package doctor currently lists `expo-av` under a React Native Directory exclude in `package.json`, reflecting ecosystem metadata — not a rejection of the API for our use case.

## Decision
Use **`expo-av`** for microphone recording and clip playback in the core game loop. Wrap usage in a small `lib`/hook layer so screens never call the raw API ad hoc.

## Alternatives Considered

### expo-audio / newer Expo audio modules
- Pros: May become the long-term Expo recommendation as the audio stack evolves
- Cons: Must verify SDK 57 support and API stability at implementation time
- Rejected for Phase 1 lock-in: `expo-av` is what the foundation declared; re-evaluate with docs before Phase 2 if SDK guidance has shifted

### react-native-audio-recorder-player (or similar third-party)
- Pros: Feature-rich on some platforms
- Cons: Extra native maintenance; conflicts with “prefer Expo modules” guidance
- Rejected: Prefer Expo-maintained modules

### No recording — text-only prompts
- Pros: Simpler permissions
- Cons: Breaks the lyric/performance fantasy of the tagline
- Rejected: Audio is core to the product

## Consequences
- Configure mic permission strings/plugins in `app.json` before shipping Phase 2
- Always unload/stop recordings on unmount and between rounds to avoid leaked native resources
- Physical device testing is required; simulators vary on mic behavior
- If Expo deprecates `expo-av` on a later SDK, migrate behind the same wrapper interface and supersede this ADR
