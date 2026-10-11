# ADR-004: Offline, single-device local multiplayer

## Status
Accepted

## Date
2026-10-11

## Context
ENCORE is a party game meant for people in the same room sharing one phone. Adding accounts, lobbies, or cloud sync would delay a playable loop and introduce privacy/ops cost before the core mechanic is proven.

## Decision
**v1 is offline-first and single-device:** pass-the-phone local multiplayer only. No auth, no game server, no real-time networking.

## Alternatives Considered

### Local Wi-Fi / Bluetooth multi-device
- Pros: Each player holds their own phone
- Cons: Pairing UX, platform BLE/Wi-Fi quirks, much larger Phase 2
- Rejected for v1: revisit after the core loop is fun on one device

### Online rooms (Firebase / custom backend)
- Pros: Remote play, persistence, analytics hooks
- Cons: Backend cost, latency, accounts; not needed for same-room parties
- Rejected for v1

## Consequences
- Architecture stays client-only; Zustand + local audio files are enough
- UX must make “pass the phone” obvious (Phase 2 design)
- Later online features would be a new ADR and likely a separate sync layer — do not prematurely abstract for them
