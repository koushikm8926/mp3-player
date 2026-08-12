# Architecture

How the two applications are put together, and why the significant decisions were made.

---

## 1. Mobile application

### Provider tree

`App.js` composes four context providers in dependency order:

```
GestureHandlerRootView
└── SafeAreaProvider
    └── SettingsProvider     theme, language, every user preference
        └── AuthProvider     session + reporting to the admin panel
            └── LibraryProvider   scanned music, playlists, favourites, history
                └── PlayerProvider    playback engine
                    └── RootNavigator
```

Each layer only reads from the ones above it. `LibraryProvider` needs
`settings.minTrackSeconds` to filter the scan; `PlayerProvider` needs the library to resolve
queue ids and the settings for crossfade, gapless and headphone behaviour.

### Navigation

`RootNavigator` picks one of three flows from state rather than imperative navigation:

| Condition | Screen |
| --------- | ------ |
| Settings, auth or library still loading | `SplashScreen` |
| Not authenticated | `AuthScreen` |
| Media permission not granted | `PermissionScreen` |
| Otherwise | Tabs + modal stack |

Because the choice is derived from state, signing out or losing permission returns the user to
the right place with no navigation side effects.

Inside the app: three bottom tabs (Home, Library, Playlists), with Library holding five
swipeable top tabs (Songs, Albums, Artists, Genres, Folders). Everything else — detail screens,
Now Playing, Queue, Settings, Equalizer — is a stack screen above the tabs.

### The playback engine

`src/context/PlayerContext.js` is the heart of the app. `expo-audio` owns one `AudioPlayer`;
the queue, ordering, repeat and crossfade are all managed in JS so behaviour is identical
whether the user drives playback from the UI, the notification, or the lock screen.

**Queue and shuffle.** Two arrays: `queue` holds tracks in their natural order, `order` holds
indices into it in play order. Shuffle rebuilds `order` with Fisher-Yates while pinning the
currently playing track first, so toggling shuffle mid-song never interrupts it. Turning
shuffle off restores natural order and re-finds the current track's position.

**Repeat.** `nextOrderPosition(automatic)` centralises the decision. `automatic` distinguishes a
track ending naturally from the user pressing Next — repeat-one repeats on the former but
still advances on the latter, which is what users expect.

**Crossfade.** `expo-audio` has no native crossfade, so when a track is within the crossfade
window the outgoing player is moved to a second slot and both players' volumes are ramped on a
50 ms interval while the new track starts. The outgoing player is disposed once the ramp
completes.

**Gapless.** When crossfade is off, the next track's player is constructed and left paused as
soon as the current one starts, so switching costs no I/O. `loadOrderPosition` reuses that
preloaded instance if its track id matches.

**Stale listener guard.** Every player instance gets the same trampoline listener, whose body is
swapped on each render so it always closes over fresh state without re-subscribing. Each
callback checks the track id it was created for and returns early if the player has since been
replaced — otherwise a disposed player's final status update would corrupt the UI.

**Listening stats.** Time is accumulated only while `status.playing` is true, so a paused track
does not inflate the numbers. A listen under three seconds that did not complete is discarded
as an accidental tap. `completed` separates a real play from a skip, which keeps "Most played"
honest and feeds the admin skip counter.

### Library scanning

`MediaStoreScanner.kt` queries `MediaStore.Audio` once and returns a fully populated record per
track. The JS layer (`src/services/musicLibrary.js`) groups that flat list into albums,
artists, genres and folders **once per scan**, not per render — a 5000-track library would
otherwise re-group on every keystroke in Search.

Albums key on the MediaStore album id, falling back to a normalised `name|artist` pair for
files with no album id, so two different albums with the same title do not merge.

Hidden items are applied during the scan rather than filtered afterwards: hidden tracks and
folders go into a separate `hiddenTracks` array, so the Hidden Music screen can list them
while every other screen sees a library that simply does not contain them. Hiding a folder
prefix-matches, so it hides everything beneath it.

A `ContentObserver` on `MediaStore.Audio` fires when files are added or removed. MediaStore
emits a burst of notifications per file, so the handler is debounced by 2.5 seconds before
triggering a rescan.

### Local data

Everything the user owns lives in SQLite (`src/db/`) — playlists, favourites, hidden items,
play history, per-track stats, settings, the saved queue, search history, and the analytics
outbox. Audio files are never copied; only MediaStore ids are stored, plus denormalised
title/artist/path so a playlist row still renders if a file disappears.

`repositories.js` is the only module that writes SQL. Contexts call repositories; screens call
contexts.

### Offline behaviour

The player never waits on the network. `src/services/api.js` gives every call a 12-second
timeout and converts any failure into `{ ok: false, offline: true }` rather than throwing.
Analytics is written to `pending_events` first and flushed after a successful heartbeat, then
deleted only once the server confirms receipt.

---

## 2. Native module (`modules/expo-music-core`)

An Expo local module in Kotlin, autolinked from the `modules/` directory. Android only.

| File | Responsibility |
| ---- | -------------- |
| `MediaStoreScanner.kt` | MediaStore query returning title, artist, album, genre, folder, year, track/disc number, bitrate, mime type, size, artwork URI |
| `EqualizerController.kt` | `Equalizer`, `BassBoost`, `Virtualizer`, `LoudnessEnhancer`, `PresetReverb` |
| `ExpoMusicCoreModule.kt` | Permissions, the two event streams, system-equalizer intent |
| `index.js` | JS facade that degrades gracefully when the native module is absent |

**Genres before Android 10.** `MediaStore.Audio.Media.GENRE` only exists from API 29. Older
devices need the separate `Genres`/`Members` join tables, so `genreMapLegacy()` builds a
`trackId → genre` map in one pass rather than querying per track.

**Equalizer session.** Effects attach to audio session 0, the global output mix, because
`expo-audio` does not expose its ExoPlayer session id. This has the side benefit that the
user's curve survives track changes — a per-track session would be rebuilt each time. Band
levels are cached in `pendingBandLevels` and replayed if the session is ever rebuilt.

A few OEM ROMs refuse effects on the output mix. Rather than crash, `ensureCreated()` catches
the failure, reports `supported: false`, and the UI offers the system equalizer instead.

**Headphone disconnect** is surfaced as an event rather than handled natively, because it is a
user-toggleable setting — the JS layer decides whether to act on it.

**The JS facade is defensive.** `requireOptionalNativeModule` means the bundle still runs where
the native side is absent (Expo Go, web, tests); every entry point returns an empty or
unsupported result instead of throwing.

### Why not react-native-track-player

The obvious choice for a music player, but version 4.x does not support React Native's new
architecture, which is mandatory from RN 0.81 — and this project is on 0.86. `expo-audio` in
SDK 57 already ships ExoPlayer behind a Media3 `MediaSessionService`, which is exactly what
provides notification and lock screen controls, so the native work reduced to the two things
genuinely missing: metadata scanning and the equalizer.

---

## 3. Admin panel

### Rendering

Next.js App Router, server components by default. Pages query Prisma directly and render on
the server; only genuinely interactive pieces are client components — `UserFilters`,
`UserActions`, `VersionForms`, `SettingsForms`, `Sidebar`, `LoginForm`. Mutations go through
server actions with `revalidatePath`, so there is no client-side data-fetching layer at all.

Every dashboard page is `dynamic = 'force-dynamic'`: it is an operations tool where a cached
user count would be actively misleading.

### Authentication

Two independent schemes, because they have different requirements.

**Admins** get an 8-hour HS256 JWT in an httpOnly, SameSite=Lax cookie. `src/proxy.ts`
(Next.js 16 renamed `middleware.ts` to `proxy.ts`) redirects anonymous requests before a page
renders, but every page and action still calls `requireAdmin()` itself — a misconfigured
matcher must not be able to leak data.

**App users** get an opaque 256-bit token, stored only as a SHA-256 hash. Opaque beats JWT
here because tokens must be revocable server-side: suspending a user or signing out a device
has to take effect immediately, which a stateless token cannot do.

Both login paths run a bcrypt comparison even when the account does not exist, using a dummy
hash, so response timing does not reveal whether an address is registered.

### Filtering and search

The users table keeps its state in the URL (`?q=&status=&type=&sort=&page=`) so a filtered view
can be bookmarked and shared, and the server component re-renders from the query. Typing is
debounced 350 ms.

### Counters

`User.totalListens`, `listeningMs` and `uniqueTracks` are denormalised onto the user row and
refreshed by each heartbeat. The dashboard reads them directly instead of aggregating
`UsageEvent`, which would be a full table scan on every page load.

Heartbeat counters are **absolute lifetime totals from the device**, not deltas, so a retried
or out-of-order heartbeat cannot double-count.

### Deletion

Deleting a user is a soft delete: the row is retained so historical counts stay correct, but is
anonymised, marked `deleted`, and stripped of credentials and sessions.

---

## 4. Notable trade-offs

**SQLite on the server.** Keeps the deliverable self-contained — no database to provision.
Moving to PostgreSQL is a provider change, an adapter swap and a migration; no model edits.
See [DATABASE.md](DATABASE.md).

**Plain JavaScript on mobile, TypeScript on the server.** The existing Expo scaffold was
JavaScript, and the mobile layer's contracts are mostly runtime shapes from MediaStore. The
admin panel handles typed database models and API payloads where TypeScript pays for itself.

**A custom bottom sheet.** `src/components/Sheet.js` is built on the platform `Modal` rather
than pulling in a gesture-driven sheet library. Every sheet in this app is a short, tappable
list, not something the user drags — the dependency would not have earned its weight.

**No client state library.** Four contexts with `useMemo`-stable values cover it. Row
components are memoised on the fields that actually affect rendering, so a playback tick does
not re-render a 5000-row list.
