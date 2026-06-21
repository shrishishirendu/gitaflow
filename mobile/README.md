# GitaMoment Mobile (Expo)

React Native / Expo app for GitaMoment. Talks to the same FastAPI backend as the
web frontend — both clients hit `/api/karma-lens/analyse`.

## Setup

```bash
cd mobile
npm install
cp .env.example .env.local
```

**Open `.env.local` and set `EXPO_PUBLIC_API_BASE` to your laptop's LAN IP.**
Read the comments in `.env.example` carefully — this is the most common gotcha.

## Run

```bash
# Make sure the backend is running with --host 0.0.0.0 so your phone can reach it:
#   cd ../backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

npm run start
```

A QR code will appear in your terminal.

- **iOS:** open Camera, scan the QR, tap the Expo notification.
- **Android:** open the Expo Go app, tap "Scan QR code".

Phone and laptop must be on the **same Wi-Fi network**.

### Simulator alternatives

```bash
npm run ios       # iOS Simulator (Mac only — needs Xcode)
npm run android   # Android Emulator (needs Android Studio)
```

## Architecture

| Spec section          | Code location                      |
|-----------------------|------------------------------------|
| §8.1 Onboarding       | _Not yet — Week 4 task_            |
| §8.2 Home screen      | `src/screens/HomeScreen.jsx`       |
| §8.3 Karma Lens flow  | `src/screens/LensScreen.jsx` + `ResponseScreen.jsx` |
| §8.4 Dashboard        | _Not yet — Week 4 task_            |
| §8.5 Journal          | `src/screens/JournalScreen.jsx`    |

All Anthropic calls go through the backend. The mobile app holds no API keys.

## Troubleshooting

**"Network request failed"** — Your phone can't reach the backend.
1. Did you put the LAN IP (not `localhost`) in `.env.local`?
2. Is the backend running with `--host 0.0.0.0`?
3. Are phone and laptop on the same Wi-Fi?
4. Some Wi-Fi networks block client-to-client traffic ("AP isolation"). Try
   your phone's hotspot as a quick test.

**Fonts not loading** — First app launch downloads Fraunces and DM Sans from
Google Fonts. Make sure your phone has internet on first run.

**Reanimated warning** — If you see a Reanimated config error, ensure
`babel.config.js` lists `react-native-reanimated/plugin` LAST in plugins.
