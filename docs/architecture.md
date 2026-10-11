# Architecture

ENCORE is a local, pass-the-phone party game for iOS and Android. One player’s recorded lyrics become the next player’s challenge. The app is offline-first: game flow, audio, and settings live on device.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Expo SDK 57 + React Native 0.86 | Managed workflow, CNG, shared iOS/Android/web tooling |
| UI | React 19 + StyleSheet | Mobile-first; design tokens in `constants/theme.ts` |
| Navigation | Expo Router (file-based) | Routes = files under `app/`; typed routes enabled |
| Game state | Zustand | Small client state machine; no server sync in v1 |
| Audio | `expo-av` | Record and play back lyric clips |
| Feedback | `expo-haptics`, Reanimated | Round transitions and tactile cues |
| Tests | Jest + `jest-expo` + RNTL | Dependency, theme, and screen smoke tests |

Package manager: **npm** (`package-lock.json`). Prefer `npx expo install <pkg>` over raw `npm install` for native modules so versions match the SDK.

## High-level flow

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Home / lobby│ ──► │ Game state machine│ ──► │ Record / play   │
│ (tabs)      │     │ (Zustand store)   │     │ (expo-av)       │
└─────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Settings (P3)   │
                    │ haptics, audio  │
                    └─────────────────┘
```

Phase 1 ships the shell only. The Zustand store and audio pipeline are dependency commitments; implementation starts in Phase 2 (see [plan.md](./plan.md)).

## Directory layout

```text
Encore/
├── app/                    # Expo Router screens (routes only)
│   ├── _layout.tsx         # Root stack, fonts, splash
│   ├── (tabs)/             # Tab navigator
│   │   ├── index.tsx       # Home / brand shell
│   │   └── two.tsx         # Settings placeholder (Phase 3)
│   ├── modal.tsx
│   ├── +not-found.tsx
│   └── +html.tsx           # Web document shell
├── components/             # Shared UI (non-route)
├── constants/
│   ├── theme.ts            # Brand + design tokens (source of truth for UI)
│   └── Colors.ts           # Legacy Expo template palette (tabs still use it)
├── assets/                 # Fonts, icons, splash
├── __tests__/              # Jest suites
├── docs/                   # Architecture, plan, ADRs
├── AGENTS.md               # Agent / contributor Expo conventions
├── app.json                # Expo config + plugins (no hand-edited ios/android)
└── package.json
```

**Convention:** route files stay in `app/`. Non-route code (stores, hooks, audio helpers, game UI) belongs outside `app/` — e.g. `store/`, `hooks/`, `lib/` as those appear. Do not create or edit `ios/` / `android/` by hand; Continuous Native Generation owns them from `app.json` and config plugins.

## Navigation model

- Root: `Stack` — `(tabs)` + `modal`
- Tabs: Home (`index`) and Settings (`two`, placeholder)
- Deep link scheme: `encore` (see `app.json`)
- Typed routes: `experiments.typedRoutes` in `app.json`

Game rounds will likely be stack screens or modal flows launched from Home, not extra tabs. Exact route names land with Phase 2.

## State model (intended)

Zustand owns the **game state machine**: lobby → record → pass → challenge → score / next round → end. Audio URIs and round metadata stay in that store (or a thin companion module). Settings (haptics on/off, etc.) are separate and can use AsyncStorage later; they are not required for Phase 2 MVP.

No backend, auth, or multiplayer networking in the current architecture.

## UI system

Primary tokens live in `constants/theme.ts`:

- Brand: `ENCORE`, tagline *Your lyrics become their challenge.*
- Colors: dark shell (`#0B0E14`), amber accent (`#F0A202`), danger for fail/timeout states
- Spacing and type scale for StyleSheet layouts

New screens should import from `@/constants/theme` rather than inventing one-off colors.

## Native modules & builds

- Expo Go covers many modules, but anything outside the Go bundle needs a **development build** (`npx expo run:ios|android` or EAS development profile).
- `expo-av` recording requires microphone permissions — configure in `app.json` / plugins when Phase 2 wires audio.
- Cloud builds and OTA: EAS (`npx eas-cli@latest …`). See [Expo EAS docs](https://docs.expo.dev/eas/index.md).

## Testing strategy

| Suite | Guards |
|-------|--------|
| `phase1-deps-test.ts` | Critical deps remain declared |
| `theme-test.ts` | Brand and token shape |
| `home-screen-test.tsx` | Home still shows brand + tagline |

Add unit tests next to game state transitions and audio permission/error paths as those modules land. Run `npm test` and `npm run typecheck` before calling a phase done.

## Related docs

- [Delivery plan](./plan.md)
- [ADRs](./decisions/)
- [AGENTS.md](../AGENTS.md) — Expo version discipline for agents
- Expo SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/
