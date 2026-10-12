# ADR-006: Live match voice (WebRTC) + listener mute

## Status
Accepted

## Date
2026-10-12

## Context
Online Match must let players **hear each other** (talk between turns; hear the opponent sing). Mute rules must not silence the singer’s outbound audio to the peer. Expo Go cannot load `react-native-webrtc`.

## Decision
1. **Mute policy:** `shouldMuteLocalVoice` mutes local outbound only when the opponent is in countdown / singing / processing. The active singer stays unmuted so the peer can hear the performance.
2. **VoiceSession** interface with:
   - `createMemoryVoiceSession` for tests / Expo Go (no real audio)
   - `createWebRtcVoiceSession` over injectable RTC + signaling
3. **Signaling:** offer / answer / ICE via `VoiceSignaling` (memory for tests; Supabase `encore_voice_signals` for devices). See `supabase/encore_voice_signals.sql`.
4. **Native:** `react-native-webrtc` + `@config-plugins/react-native-webrtc`; ship through EAS **development** and production builds (not Expo Go).

## Consequences
- Hearing the other singer requires a custom client build and running the voice SQL in Supabase.
- STT recording (`expo-audio`) remains separate from the VoIP path; expect possible mic contention on some devices — acceptable for v1.
