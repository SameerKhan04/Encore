# Delivery plan

Phased build for ENCORE. Scope is inferred from the Phase 1 foundation (theme shell, tab placeholders, and locked dependencies). Adjust phase boundaries as product decisions firm up; record material changes as ADRs.

## Product intent

**ENCORE** — local party game. Players pass one phone. Someone records lyrics; those lyrics become the next person’s challenge. Offline-first, no accounts in v1.

Tagline: *Your lyrics become their challenge.*

## Phase overview

| Phase | Status | Goal |
|-------|--------|------|
| 1 — Foundation | **Done** | Expo app, brand shell, tokens, Jest, core deps |
| 2 — Core loop | Planned | Zustand game machine + record/play + playable round |
| 3 — Settings & polish | Planned | Settings screen, preferences, UX hardening |
| 4 — Ship | Planned | Permissions polish, EAS builds, store readiness |

---

### Phase 1 — Foundation (complete)

**Shipped in commit:** *Initial Phase 1 foundation: Expo Router app with theme shell and Jest.*

- Expo Router entry, tabs (Home + Settings placeholder), modal stack
- Design tokens and brand on Home (`constants/theme.ts`)
- Dependencies declared: Zustand, `expo-av`, `expo-haptics`, Reanimated
- Jest smoke tests for deps, theme, and Home

**Exit criteria (met):** `npm test` and `npm run typecheck` pass; Home shows ENCORE brand and tagline.

---

### Phase 2 — Core game loop

Turn the shell into a playable local round.

**Likely work**

1. Zustand store: explicit states and legal transitions (lobby → recording → pass-device → challenge → resolve → …)
2. Audio module wrapping `expo-av` (permissions, record, stop, play, cleanup)
3. Game UI screens/components driven by store state (keep routes thin)
4. Haptic + Reanimated cues at round boundaries
5. Tests for state transitions and critical audio failure paths

**Exit criteria**

- Two people can complete at least one full round on a device/simulator with mic access
- No backend required
- Typecheck + tests green

**Out of scope for Phase 2:** accounts, online multiplayer, content libraries, Settings UI.

---

### Phase 3 — Settings & polish

Settings tab is currently a placeholder (“Coming in Phase 3”).

**Likely work**

- Settings UI: haptics toggle, sound/mute, round timer defaults (as needed)
- Persist preferences (e.g. AsyncStorage) if anything must survive relaunch
- Empty/error/permission-denied copy that matches the dark brand shell
- Retire leftover Expo template chrome where it still shows (e.g. tab icons, `Colors.ts` vs `theme.ts`)

**Exit criteria**

- Settings changes affect gameplay feedback
- Home/Settings feel like one product, not a template + custom screen

---

### Phase 4 — Ship

- Microphone (and any other) permission strings and plugin config finalized in `app.json`
- EAS development + production profiles; smoke build on a physical device
- App icon / splash / store listing assets aligned with brand tokens
- Optional: OTA updates via `eas update`

**Exit criteria**

- Installable build outside Expo Go if native needs require it
- Checklist for TestFlight / Play internal testing complete

---

## Near-term backlog (unordered)

- Align tab bar styling with `constants/theme.ts`
- Decide pass-phone UX (countdown vs button vs both)
- Decide whether challenge is “sing back”, “guess song”, or another rule — **product decision; document in an ADR when chosen**
- Folder for non-route code (`store/`, `lib/audio/`, etc.) when Phase 2 starts

## Non-goals (v1)

- Server-authoritative multiplayer
- User accounts / cloud save
- Licensed lyric catalogs or streaming integrations
- Web as a primary play surface (web may run for UI checks only)

## Tracking decisions

Architecture choices that are expensive to reverse go in [docs/decisions/](./decisions/). Update this plan when a phase completes or scope changes.
