# ENCORE

Local party game for iOS and Android: **your lyrics become their challenge.** Players pass one phone; recorded lyrics drive the next round. Offline-first — no accounts or servers in v1.

Built with **Expo SDK 57**, Expo Router, React Native, and Zustand. Phase 1 (foundation shell + design tokens + Jest) is in place; the playable loop is Phase 2. See [docs/plan.md](docs/plan.md).

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** (this repo uses `package-lock.json`)
- For devices:
  - **iOS:** macOS + Xcode (simulator or device), or Expo Go / EAS build
  - **Android:** Android Studio emulator or a device with USB debugging, or Expo Go / EAS build
- Optional: [Expo Go](https://expo.dev/go) for quick UI checks (mic recording may need a development build)

## Quick start

```bash
git clone <repo-url> Encore
cd Encore
npm install
npm start
```

`npm start` runs `expo start`. Then:

- Press `i` — iOS simulator  
- Press `a` — Android emulator  
- Scan the QR code — Expo Go on a physical device  
- Press `w` — web (UI checks only; not the primary play target)

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Metro / Expo dev server |
| `npm run ios` | Start and open iOS |
| `npm run android` | Start and open Android |
| `npm run web` | Start web |
| `npm test` | Run Jest |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |

### Adding native dependencies

Always resolve SDK-compatible versions:

```bash
npx expo install <package>
```

Diagnose version drift with `npx expo-doctor`. Fix mismatches with `npx expo install --fix`.

### Development builds

If you add native modules that Expo Go does not include, use a development build:

```bash
npx expo run:ios
# or
npx expo run:android
# or EAS
npx eas-cli@latest build --profile development
```

Do not hand-edit `ios/` or `android/` — they are generated (CNG). Configure native behavior in `app.json` and plugins.

## Project layout

```text
app/           Expo Router screens
components/    Shared UI
constants/     Theme tokens (brand, colors, spacing, type)
__tests__/     Jest tests
docs/          Architecture, plan, ADRs
AGENTS.md      Expo conventions for contributors and agents
```

Details: [docs/architecture.md](docs/architecture.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Delivery plan](docs/plan.md)
- [ADRs](docs/decisions/)
- [AGENTS.md](AGENTS.md) — Expo version discipline (read SDK 57 docs before changing Expo APIs)

## Current status

**Phase 1 complete.** Home shows the ENCORE brand shell; Settings is a Phase 3 placeholder; game state and audio are declared but not yet wired into a playable round.

## License

See [LICENSE](LICENSE). The template LICENSE originates from Expo’s MIT license; update copyright if you relicense the app itself.
