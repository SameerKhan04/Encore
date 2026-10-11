# Play Store ship path (Phase 10)

ENCORE ships Android via **EAS Build** (`.aab`) and **EAS Submit**. Config is guarded by `__tests__/store-readiness-test.ts`.

## Prerequisites (you)

1. [Expo account](https://expo.dev) — `npx eas-cli@latest login`
2. [Google Play Developer](https://play.google.com/console) account (~$25 one-time)
3. Create the app in Play Console (package: `com.encore.party`)
4. Create a [Google Service Account key](https://docs.expo.dev/submit/android/) and link it in EAS Credentials
5. Production secrets in EAS (or `.env` for local): Gemini + Supabase `EXPO_PUBLIC_*` values

## One-time project link

```powershell
npx eas-cli@latest build:configure
# If eas.json already exists, confirm / link the Expo project when prompted.
npx eas-cli@latest init
```

## Build the store `.aab`

```powershell
npm run eas:build:android
# same as: npx eas-cli@latest build --platform android --profile production
```

Preview APK for testers (not for Play):

```powershell
npm run eas:build:preview
```

## Submit to Play (internal / draft)

```powershell
npm run eas:submit:android
```

`eas.json` submit profile uses **internal** track + **draft** release so the first upload does not go public until you promote it in Play Console.

## Store listing checklist

- [ ] App name, short/full description, category
- [ ] Icon 512×512, feature graphic, phone screenshots
- [ ] Privacy policy URL (mic + online match) — host `docs/privacy-policy.html` via GitHub Pages, then use:
      `https://sameerkhan04.github.io/Encore/privacy-policy.html`
- [ ] Content rating questionnaire
- [ ] Target audience / Data safety form
- [ ] Complete listing → promote internal → closed → production when ready

## Version bumps

Before each store upload, bump in `app.json`:

- `expo.version` (user-facing, e.g. `1.0.1`)
- `expo.android.versionCode` (integer, always increase)
