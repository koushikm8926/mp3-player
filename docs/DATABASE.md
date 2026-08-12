# Database reference

Two independent databases:

- **On-device SQLite** (`expo-sqlite`) — the user's own data, never uploaded.
- **Server SQLite** (Prisma) — accounts, devices and analytics for the admin panel.

The split is deliberate: playlists and listening history are private and must work offline, so
they never leave the phone. Only account details and aggregate counters are reported to the
server.

---

## 1. On-device database

File: `minax_music.db` · Schema: `src/db/database.js` · Access layer: `src/db/repositories.js`

`PRAGMA user_version` carries the schema version (currently `1`); `migrate()` is a no-op once
the device is already at that version.

### `playlists`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | INTEGER PK AUTOINCREMENT | |
| `name` | TEXT NOT NULL | Unique, case-insensitive (`idx_playlists_name`) |
| `description` | TEXT | Defaults to `''` |
| `cover_uri` | TEXT | Reserved for a custom cover |
| `created_at`, `updated_at` | INTEGER | Epoch ms |

### `playlist_tracks`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | INTEGER PK | |
| `playlist_id` | INTEGER | FK → `playlists.id`, `ON DELETE CASCADE` |
| `track_id` | TEXT | MediaStore `_ID` |
| `position` | INTEGER | Explicit order; rewritten by `reorder()` |
| `added_at` | INTEGER | Epoch ms |
| `title`, `artist`, `path` | TEXT | Denormalised so a row still renders if the file is deleted |

Unique on `(playlist_id, track_id)` — a track cannot appear twice in one playlist, and
`INSERT OR IGNORE` makes re-adding a no-op.

### `favorites`

`track_id` (PK) · `added_at` · denormalised `title`, `artist`, `path`.

### `hidden_items`

| Column | Notes |
| ------ | ----- |
| `kind` | `'track'` or `'folder'` |
| `value` | Track id, or absolute folder path |
| `label` | Human-readable name for the Hidden Music screen |

Unique on `(kind, value)`. Hiding a folder also hides everything beneath it — the scanner
prefix-matches on `folderPath`.

### `play_history`

One row per listen: `track_id`, `played_at`, `duration_ms`, `completed` (1 = played through,
0 = skipped). Trimmed to the most recent 1000 rows after each insert; the durable aggregate
lives in `track_stats`.

### `track_stats`

`track_id` (PK) · `play_count` · `skip_count` · `last_played` · `total_ms`. Maintained with an
`ON CONFLICT … DO UPDATE` upsert, so a play and its aggregate update in one statement.

### `settings`

`key` (PK) · `value` (JSON-encoded). Every entry in `DEFAULT_SETTINGS`
(`src/context/SettingsContext.js`) — theme, accent, crossfade, gapless, equalizer curve,
language, and the rest.

### `queue_state`

Single row (`id = 1` enforced by CHECK) holding `track_ids` (JSON array), `current_index` and
`position_ms`, so the app reopens exactly where the user left off. Written on a 1.5-second
debounce.

### `search_history`

`term` (PK) · `searched_at`. Backs the recent-searches list.

### `pending_events`

The offline outbox: `type`, `payload` (JSON), `created_at`. Rows are deleted only after the
server confirms receipt, so a listening session offline still lands in the reports later.

---

## 2. Server database

Schema: `admin/prisma/schema.prisma` · Default file: `admin/dev.db`

### Moving to PostgreSQL

Three changes, no model edits:

1. `schema.prisma` → `datasource db { provider = "postgresql" }`
2. `admin/.env` → `DATABASE_URL="postgresql://user:pass@host:5432/minax"`
3. `admin/src/lib/prisma.ts` → swap `PrismaBetterSqlite3` for `@prisma/adapter-pg`

Then `npx prisma migrate deploy`.

> Prisma 7 reads the connection URL from `admin/prisma.config.ts`, not from `schema.prisma`.

### `Admin`

Panel operators. `email` (unique), `name`, `passwordHash` (bcrypt cost 12), `role`
(`admin` | `superadmin`), `isActive`, `lastLoginAt`.

### `User`

An app user.

| Field | Notes |
| ----- | ----- |
| `email` | Unique, **nullable** — guests have none |
| `passwordHash` | Nullable, for the same reason |
| `isGuest` | Anonymous install from "Continue without an account" |
| `status` | `active` \| `suspended` \| `deleted` |
| `lastSeenAt` | Updated on every heartbeat; drives Active Users |
| `totalListens`, `listeningMs` (BigInt), `uniqueTracks` | Denormalised counters so the dashboard never aggregates the event table |

Indexed on `createdAt`, `lastSeenAt` and `status` — the three columns the panel filters and
sorts by.

Deleting a user from the panel is a **soft delete**: the row stays (so historical counts remain
correct) but is anonymised, marked `deleted`, and stripped of credentials and sessions.

### `Device`

One physical install; a user may have several. Unique on `(userId, installationId)`, so
reinstalling updates the existing row instead of inflating the device count. Carries
`platform`, `osVersion`, `appVersion`, `buildNumber`, `deviceName`, `lastSeenAt`.

### `Session`

An issued mobile token. Only `tokenHash` (SHA-256) is stored, never the token, so a leaked
database cannot be used to impersonate users. Rows are deleted on sign-out, on suspension, and
when found expired. Cascades on user delete.

### `UsageEvent`

Analytics forwarded by the app: `type`, `value`, optional `metadata` JSON, `createdAt`.
Indexed on `createdAt`, `type` and `(userId, createdAt)`.

### `AppVersion`

Releases the update check reads. Unique on `(platform, buildNumber)`. `isCurrent` marks the
one release the API reports as latest — publishing a new current release demotes the previous
one inside a transaction, so there is never more than one. `minSupported` sets the floor below
which a build is told it is unsupported.

### `Setting`

Key/value application config with a declared `type` (`string` | `number` | `boolean` | `json`)
that the settings form validates against, a `group` for the UI, and `isPublic` controlling
whether the mobile settings endpoint exposes it.

### `AuditLog`

Every state-changing admin action: `adminId` (nullable, `SetNull` on admin delete), `action`,
`target`, `detail`, `ip`, `createdAt`.

---

## Entity relationships

```
Admin ──< AuditLog

User ──< Device        (cascade)
     ──< Session       (cascade)
     ──< UsageEvent    (cascade)

AppVersion   (standalone)
Setting      (standalone)
```

---

## Backup format

**Settings → Backup & restore** writes a single JSON file:

```json
{
  "signature": "minax-music-backup",
  "version": 1,
  "createdAt": 1786000000000,
  "counts": { "playlists": 4, "playlistTracks": 132, "favorites": 58, "hidden": 3 },
  "data": {
    "playlists": [], "playlistTracks": [], "favorites": [],
    "hidden": [], "stats": [], "history": [], "settings": {}
  }
}
```

Audio files are never copied. Restore clears the local tables and re-inserts, preserving
playlist ids so `playlist_tracks` rows still point at the right list; tracks re-bind by
MediaStore id, and the denormalised `title`/`artist` remain as a record of anything since
deleted. A file without the exact `signature` is rejected. `history` is capped at the most
recent 500 rows.
