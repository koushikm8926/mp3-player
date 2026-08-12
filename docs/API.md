# API documentation

The admin panel exposes two surfaces:

- **`/api/mobile/*`** — consumed by the Android app, authenticated with bearer tokens.
- **`/api/reports/*`** — CSV exports, authenticated with the admin session cookie.

Base URL in development: `http://localhost:3000` (use `http://10.0.2.2:3000` from an Android
emulator).

---

## Authentication

### Mobile clients

`POST /api/mobile/register`, `/login` and `/guest` return an opaque 64-character hex token.
Send it on every authenticated request:

```
Authorization: Bearer 885e5869e0d11c6b2ad99f24ae172a233b2a29a427b1a350c8917185c7ede272
```

Tokens are valid for 180 days. Only a SHA-256 hash is stored server-side, so a token can be
revoked immediately when a user signs out or is suspended. A revoked or expired token gets
`401`; a suspended account gets `401` on `/me` (its sessions are deleted) and `403` on
`/login`.

### Admin clients

Admin routes use an httpOnly `minax_admin_session` cookie containing an 8-hour HS256 JWT,
issued by the login server action. There is no admin REST login endpoint by design — the
panel is server-rendered.

---

## Conventions

- All request and response bodies are JSON (`Content-Type: application/json`).
- Errors are `{ "error": "Human readable message" }` with a matching HTTP status.
- Timestamps are ISO 8601 strings in UTC.
- Durations are milliseconds; `listeningMs` is a number in JSON (stored as `BIGINT`).

| Status | Meaning |
| ------ | ------- |
| `200` | Success |
| `201` | Resource created |
| `400` | Malformed JSON body |
| `401` | Missing, invalid or revoked token |
| `403` | Action disabled by settings, or account suspended/deleted |
| `409` | Conflict (email already registered) |
| `422` | Body failed validation |

---

## Mobile endpoints

### `POST /api/mobile/register`

Creates an account. Rejected with `403` when `auth.allowRegistration` is off.

**Request**

```json
{
  "name": "Test Listener",
  "email": "test.listener@example.com",
  "password": "Password@123",
  "platform": "android",
  "osVersion": "14",
  "appVersion": "1.0.0",
  "buildNumber": 1,
  "deviceName": "Pixel 8",
  "installationId": "itest-001"
}
```

| Field | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `name` | string | yes | 2–80 characters |
| `email` | string | yes | Valid address, lowercased server-side |
| `password` | string | yes | At least `auth.minPasswordLength` (default 8) |
| `installationId` | string | no | Stable per install; keys the device row |
| `platform`, `osVersion`, `appVersion`, `buildNumber`, `deviceName` | — | no | Device metadata |

**Response `201`**

```json
{
  "token": "885e5869…",
  "user": {
    "id": "cmsq7x5n600000yyywjmo618r",
    "name": "Test Listener",
    "email": "test.listener@example.com",
    "isGuest": false,
    "status": "active",
    "createdAt": "2026-08-12T15:02:20.370Z",
    "stats": { "totalListens": 0, "listeningMs": 0, "uniqueTracks": 0 }
  }
}
```

**Errors** — `409` email already registered · `422` validation failed · `403` registration disabled

---

### `POST /api/mobile/login`

Same device fields as register, plus `email` and `password`.

**Response `200`** — identical shape to register.

**Errors** — `401` bad credentials · `403` account suspended or deleted

A missing account and a wrong password both run a bcrypt comparison and return the same
message, so timing does not reveal whether an address is registered.

---

### `POST /api/mobile/guest`

Backs "Continue without an account". Creates an anonymous user so install counts stay
accurate. Rejected with `403` when `auth.allowGuestMode` is off.

**Request**

```json
{ "installationId": "guest-xyz", "platform": "android", "appVersion": "1.0.0", "buildNumber": 1 }
```

**Response** — `201` for a new guest, `200` when an existing guest with the same
`installationId` is reused (so reopening the app does not inflate the user count).

---

### `GET /api/mobile/me` 🔒

Validates the token and returns the current profile. Used at launch to decide whether the
stored session is still good.

**Response `200`** — `{ "user": { … } }`

---

### `PATCH /api/mobile/me` 🔒

**Request** — `{ "name": "New Name" }` (2–80 characters)

**Response `200`** — `{ "user": { … } }`

---

### `POST /api/mobile/heartbeat` 🔒

Called on launch, on resume, and every five minutes. Drives the Active Users view and
refreshes the denormalised listening counters.

**Request**

```json
{
  "platform": "android",
  "appVersion": "1.0.0",
  "buildNumber": 1,
  "deviceName": "Pixel 8",
  "installationId": "itest-001",
  "listens": 42,
  "listeningMs": 8820000,
  "uniqueTracks": 17
}
```

Counters are **absolute lifetime totals** from the device, not deltas, so a retried or
out-of-order heartbeat cannot double-count.

**Response `200`**

```json
{
  "ok": true,
  "settings": {
    "app.name": "Minax Music",
    "app.maintenanceMode": false,
    "app.maintenanceMessage": "…",
    "player.defaultCrossfadeSeconds": 0,
    "player.maxPlaylistSize": 2000
  },
  "serverTime": "2026-08-12T15:02:31.481Z"
}
```

Public `app.*` and `player.*` settings ride along so the app picks up maintenance mode
without a second request.

---

### `POST /api/mobile/events` 🔒

Bulk endpoint for the app's offline outbox.

**Request**

```json
{
  "events": [
    { "type": "play", "value": 1 },
    { "type": "skip", "value": 1 },
    { "type": "search", "metadata": "beatles", "createdAt": 1786000000000 }
  ]
}
```

| Field | Type | Notes |
| ----- | ---- | ----- |
| `type` | enum | `play`, `skip`, `search`, `playlist_created`, `session`, `backup` |
| `value` | int | Defaults to 1 |
| `metadata` | string | Optional, max 500 characters |
| `createdAt` | int | Optional epoch ms; clamped to now so a wrong device clock cannot write a future timestamp |

Maximum 200 events per call.

**Response `200`** — `{ "accepted": 3 }`

**Errors** — `422` when any event has an unknown type; nothing is stored (all-or-nothing).

---

### `GET /api/mobile/version`

Unauthenticated on purpose: a client old enough to be blocked still needs to learn that it is
blocked.

**Query** — `platform` (default `android`), `version`, `build`

**Response `200`**

```json
{
  "updateAvailable": false,
  "mandatory": false,
  "supported": true,
  "latestVersion": "1.0.0",
  "latestBuild": 1,
  "minSupportedBuild": 1,
  "releaseNotes": "First release of Minax Music.",
  "downloadUrl": null,
  "releasedAt": "2026-08-12T14:45:49.356Z"
}
```

| Field | Meaning |
| ----- | ------- |
| `updateAvailable` | The caller's build is behind the current release |
| `mandatory` | The current release is flagged mandatory and the caller is behind it |
| `supported` | The caller's build is at or above `minSupportedBuild` |

When no release is published: `{ "updateAvailable": false, "mandatory": false, "supported": true }`.

---

### `GET /api/mobile/settings`

Unauthenticated. Returns only rows flagged `isPublic` — password policy and retention windows
are deliberately withheld.

**Response `200`**

```json
{
  "settings": {
    "app.name": "Minax Music",
    "app.supportEmail": "support@minaxdigital.com",
    "app.maintenanceMode": false,
    "auth.allowRegistration": true,
    "auth.allowGuestMode": true,
    "player.defaultCrossfadeSeconds": 0,
    "player.maxPlaylistSize": 2000
  },
  "serverTime": "2026-08-12T15:01:48.779Z"
}
```

Values are typed according to each setting's declared `type` — booleans come back as
booleans, numbers as numbers.

---

### `POST /api/mobile/logout` 🔒

Revokes only the calling device's session; other devices stay signed in.

**Response `200`** — `{ "ok": true }`

---

## Report endpoints (admin cookie required)

All three return `text/csv; charset=utf-8` with a `Content-Disposition` attachment header, or
`401` without a valid admin session.

| Endpoint | Contents |
| -------- | -------- |
| `GET /api/reports/users` | Every account: id, name, email, type, status, device count, listens, listening minutes, unique tracks, joined, last seen |
| `GET /api/reports/devices` | Every install: device and user ids, install id, platform, app version, build, Android version, first and last seen |
| `GET /api/reports/events?range=30` | Raw usage events for the period. `range` is 1–365 days (default 30), capped at 50 000 rows |

---

## Example session

```bash
BASE=http://localhost:3000/api/mobile

# Register
TOKEN=$(curl -s -X POST $BASE/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Listener","email":"a@example.com","password":"Password@123",
       "installationId":"dev-1","appVersion":"1.0.0","buildNumber":1}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

# Heartbeat
curl -s -X POST $BASE/heartbeat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"installationId":"dev-1","appVersion":"1.0.0","buildNumber":1,
       "listens":42,"listeningMs":8820000,"uniqueTracks":17}'

# Flush the offline outbox
curl -s -X POST $BASE/events \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"events":[{"type":"play"},{"type":"search","metadata":"beatles"}]}'

# Update check (no auth)
curl -s "$BASE/version?platform=android&version=1.0.0&build=1"
```

---

## Client implementation notes

The app's client is `src/services/api.js`. Behaviour worth mirroring in any other client:

- **12-second timeout** via `AbortController` on every request.
- **Network failures never throw.** They resolve to `{ ok: false, offline: true }`, so the
  player keeps working with no server.
- **Analytics is buffered.** Events go to the local `pending_events` table first and are
  flushed after a successful heartbeat, then deleted only once the server accepts them.
- **The base URL is user-configurable** at runtime (Settings → Server URL), stored in
  `expo-secure-store` alongside the token.
