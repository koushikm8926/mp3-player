# Minax Music — Android MP3 Player + Admin Panel

A complete implementation of the *Custom Android MP3 Media Player Application* specification
from Minax Digital Pvt. Ltd.

This repository contains two deliverables:

| Directory | What it is | Stack |
| --------- | ---------- | ----- |
| `/` (root) | Android music player | Expo SDK 57 · React Native 0.86 · custom Kotlin native module |
| `/admin`  | Web admin panel + mobile API | Next.js 16 · React 19 · TypeScript · Tailwind v4 · Prisma 7 · SQLite |

---

## Quick start

```bash
# 1 — Admin panel + API (terminal 1)
cd admin
npm install
npm run setup           # generate client, create the database, seed it
npm run dev             # http://localhost:3000

# 2 — Android app (terminal 2)
npm install
npx expo prebuild --platform android
npx expo run:android    # debug build on an emulator or connected device
```

Default admin credentials (change them immediately — see [Security](#security)):

```
admin@minaxdigital.com  /  Admin@12345
```

Add sample users, devices and events so the dashboard is not empty:

```bash
cd admin && npx tsx prisma/seed.ts --demo
```

Full step-by-step setup, including release signing, is in **[docs/INSTALL.md](docs/INSTALL.md)**.

---

## Scope coverage

Every line item from the proposal, and where it lives.

### Mobile application (Android)

| Feature | Where |
| ------- | ----- |
| Splash screen | `src/screens/SplashScreen.js` + native splash via `expo-splash-screen` |
| Home dashboard | `src/screens/HomeScreen.js` |
| Music library | `src/context/LibraryContext.js`, `src/services/musicLibrary.js` |
| Songs | `src/screens/library/SongsScreen.js` |
| Albums / Artists / Genres / Folders | `src/screens/library/BrowseScreens.js`, `src/screens/DetailScreens.js` |
| Playlist management | `src/screens/PlaylistsScreen.js`, `src/db/repositories.js` |
| Favourites | `favoritesRepo` + `src/screens/DetailScreens.js` |
| Recently played | `historyRepo` + `RecentlyPlayedScreen` |
| Search | `src/screens/SearchScreen.js` (songs, albums, artists, genres, folders) |
| Audio playback engine | `src/context/PlayerContext.js` over `expo-audio` |
| Background playback | `setAudioModeAsync({ shouldPlayInBackground: true })` + foreground service |
| Notification controls | `AudioControlsService` (Media3 `MediaSessionService`) |
| Lock screen controls | `player.setActiveForLockScreen(...)` with per-track metadata |
| Equalizer | `modules/expo-music-core` (Kotlin AudioFx) + `src/screens/EqualizerScreen.js` |
| Sleep timer | `src/screens/SleepTimerScreen.js` (fixed, custom, end-of-track) |
| Hidden music | `hiddenRepo` + `src/screens/HiddenMusicScreen.js` (tracks and folders) |
| Backup & restore | `src/services/backup.js`, `src/screens/BackupRestoreScreen.js` |
| User settings | `src/context/SettingsContext.js`, `src/screens/SettingsScreen.js` |
| Language preferences | `src/i18n/` — 7 languages, `src/screens/MiscScreens.js` |
| Crossfade | Volume-ramped dual player in `PlayerContext` (0–12 s) |
| Gapless playback | Next-track preloading in `PlayerContext` |
| Keep screen on | `expo-keep-awake`, toggled in Settings |
| Pause on headphone disconnect | `ACTION_AUDIO_BECOMING_NOISY` event from the native module |
| Music library refresh | Pull-to-refresh + Settings → Refresh music library |
| Library scanning | `MediaStoreScanner.kt` (full metadata incl. genre and artwork) |
| Smooth user interface | FlashList virtualisation, memoised rows, three themes, eight accents |

### Admin panel

| Feature | Where |
| ------- | ----- |
| Secure admin login | `src/app/login/`, bcrypt + JWT httpOnly cookie, `src/proxy.ts` |
| Dashboard | `src/app/(dashboard)/page.tsx` |
| Registered users | `src/app/(dashboard)/users/page.tsx` |
| User details | `src/app/(dashboard)/users/[id]/page.tsx` |
| Active users | `src/app/(dashboard)/active/page.tsx` |
| User search | `src/components/UserFilters.tsx` (name, email, id + status/type/sort) |
| User statistics | `src/app/(dashboard)/statistics/page.tsx` (cohorts, engagement, spread) |
| App version management | `src/app/(dashboard)/versions/page.tsx` |
| Basic reports | `src/app/(dashboard)/reports/page.tsx` + CSV exports |
| Settings management | `src/app/(dashboard)/settings/page.tsx` |

### User features

Automatic music scan · search · play · pause · resume · next · previous · shuffle · repeat
(off/all/one) · seek bar · album view · artist view · folder view · genre view · playlist
creation · playlist management · favourites · hidden music · sleep timer · equalizer ·
background playback · notification controls · lock screen controls — all implemented and
listed in the tables above.

---

## Architecture

```
┌──────────────────────── Android app ────────────────────────┐
│  React Native (JS)                                          │
│    SettingsProvider → AuthProvider → LibraryProvider         │
│                                    → PlayerProvider          │
│                                                              │
│    expo-sqlite ....... playlists, favourites, hidden,        │
│                        history, settings, offline outbox     │
│    expo-audio ........ ExoPlayer + MediaSession              │
│                        (notification + lock screen)          │
│                                                              │
│  Kotlin (modules/expo-music-core)                            │
│    MediaStoreScanner ... full track metadata                 │
│    EqualizerController . AudioFx EQ/bass/virtualizer         │
│    ExpoMusicCoreModule . permissions, noisy + library events │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS, bearer token
┌───────────────────────────▼──────────────────────────────────┐
│  Next.js admin (/admin)                                      │
│    /api/mobile/*  register, login, guest, me, heartbeat,     │
│                   events, version, settings, logout          │
│    /(dashboard)/* server-rendered admin screens              │
│    Prisma 7 → SQLite (swap the adapter for Postgres)         │
└──────────────────────────────────────────────────────────────┘
```

The player is **fully usable offline**. Every network call degrades to
`{ ok: false, offline: true }`, analytics buffers in a local outbox table, and playback never
waits on the server.

More detail: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** ·
API reference: **[docs/API.md](docs/API.md)** ·
Database: **[docs/DATABASE.md](docs/DATABASE.md)**

---

## Why a custom native module

Two capabilities the spec requires have no Expo package:

1. **Library scanning with real metadata.** `expo-media-library` returns filename and duration
   for audio assets — not artist, album, genre or artwork — which is not enough to build the
   Albums / Artists / Genres / Folders browsers. `MediaStoreScanner.kt` queries `MediaStore`
   directly and returns a fully populated record per track.
2. **The equalizer.** `android.media.audiofx.Equalizer` is a platform API with no JS binding.
   `EqualizerController.kt` wraps it along with `BassBoost`, `Virtualizer` and
   `LoudnessEnhancer`, and degrades to an "unsupported" state on ROMs that refuse audio effects
   rather than crashing playback.

Playback itself uses `expo-audio`, which in SDK 57 already ships ExoPlayer with a Media3
`MediaSessionService` — that is what provides notification and lock screen controls.

---

## Security

Before deploying anywhere reachable from the internet:

1. **Replace `AUTH_SECRET`** in `admin/.env` with a fresh value:
   `openssl rand -base64 32`. The committed value is a development placeholder.
2. **Change the seeded admin password** — sign in and use Settings → Change password, or set
   `SEED_ADMIN_PASSWORD` before the first `npm run db:seed`.
3. **Serve over HTTPS.** Session cookies are marked `secure` when `NODE_ENV=production`.
4. **Remove `usesCleartextTraffic`** from the `expo-build-properties` block in `app.json`; it
   exists so the debug build can reach a local HTTP server.

Passwords are bcrypt-hashed (cost 12). Mobile tokens are opaque 256-bit values stored only as
SHA-256 hashes, so they can be revoked server-side when a user is suspended or signs out.
Admin sessions are 8-hour HS256 JWTs in httpOnly, SameSite=Lax cookies.

---

## Scripts

**Root (mobile)**

| Command | Purpose |
| ------- | ------- |
| `npx expo start` | Start Metro (needs a dev build, not Expo Go — the app has native code) |
| `npx expo run:android` | Build and install a debug APK |
| `npx expo prebuild --platform android --clean` | Regenerate `android/` from `app.json` |
| `cd android && ./gradlew assembleRelease` | Build the release APK |

**Admin**

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server on `0.0.0.0:3000` (reachable from a phone on the same network) |
| `npm run setup` | `prisma generate` + `db push` + seed |
| `npm run db:seed` | Re-seed admin, settings and version rows |
| `npm run db:studio` | Prisma Studio database browser |
| `npm run build` / `npm start` | Production build and server |

---

## Known limitations

- **Expo Go is not supported.** The app contains a custom native module, so it needs a
  development build or the release APK.
- **The equalizer attaches to the global output mix** (audio session 0). `expo-audio` does not
  expose its ExoPlayer session id. This works on the large majority of devices and has the
  side benefit of surviving track changes, but a few OEM ROMs refuse effects on the output mix —
  those devices fall back to the "Open system equalizer" button.
- **Crossfade is implemented as a volume ramp** between two player instances, because
  `expo-audio` has no native crossfade. Brief extra memory use during the overlap is expected.
- **RTL layout needs a restart.** Android applies `I18nManager` direction changes on next
  launch, so switching to Arabic re-renders text immediately but mirrors the layout after a
  relaunch.
- **iOS is not implemented.** The proposal scopes Android only; the native module declares
  `"platforms": ["android"]`.
- **The default release APK is ~111 MB**, because it ships native libraries for all four ABIs
  and includes the development client. Dropping the emulator ABIs and building an AAB brings a
  real install to roughly 35 MB — see
  [Reducing APK size](docs/INSTALL.md#reducing-apk-size).
