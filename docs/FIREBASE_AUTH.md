# Firebase Authentication setup

App users sign in through Firebase Authentication (email/password and Google). The admin
backend does not store or verify passwords any more — it verifies the Firebase ID token the
app sends and maps the UID onto a local `User` row so the dashboard still has something to
report on.

Guests ("continue without an account") are the one exception: they have no Firebase
credential, so they keep the opaque device-bound session token the server issues.

Nothing below is optional — until it is filled in, the sign-in form is disabled and only
guest mode works.

---

## 1. Create the Firebase project

1. <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started**.
3. Enable **Email/Password**.
4. Enable **Google**, and set a support email.

## 2. Register the Android app

**Project settings → Your apps → Add app → Android.**

- Android package name: `com.minaxdigital.mp3player` (must match `android.package` in `app.json`)
- Debug signing certificate SHA-1 — required for Google sign-in. Get it with:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

Add the release keystore's SHA-1 too before you ship.

## 3. Fill in the app config

Copy the web app config from **Project settings → General → Your apps → SDK setup and
configuration** into `app.json` under `extra.firebase`:

```json
"extra": {
  "firebase": {
    "apiKey": "AIza...",
    "authDomain": "your-project.firebaseapp.com",
    "projectId": "your-project",
    "storageBucket": "your-project.appspot.com",
    "messagingSenderId": "1234567890",
    "appId": "1:1234567890:android:abcdef"
  }
}
```

These values are not secrets — Firebase treats the API key as a public project identifier and
enforces access through Authentication settings and security rules.

## 4. Google OAuth client IDs

Google sign-in runs through `expo-auth-session`, which needs OAuth client IDs from
**Google Cloud console → APIs & Services → Credentials** (the Firebase project creates them
automatically once Google sign-in is enabled):

```json
"google": {
  "androidClientId": "....apps.googleusercontent.com",
  "webClientId": "....apps.googleusercontent.com"
}
```

- **androidClientId** — the "Android" OAuth client, bound to the package name + SHA-1.
- **webClientId** — the "Web application" client. Firebase needs this one to accept the
  resulting ID token, so it is required even though there is no web build.

## 5. Server-side verification credentials

**Project settings → Service accounts → Generate new private key** produces a JSON file.
Copy three fields into `admin/.env`:

```
FIREBASE_PROJECT_ID="your-project"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

Keep the literal `\n` escapes — the server expands them back into newlines. **This file is a
real secret**: it can mint tokens for any user. Never commit it.

If these are missing the server returns `503` from `POST /api/mobile/session` and every
authenticated mobile route rejects Firebase tokens.

## 6. Rebuild

`expo-auth-session` pulls in the native `expo-web-browser` and `expo-crypto` modules, so a
JS reload is not enough the first time:

```bash
npx expo run:android
```

---

## How it fits together

```
app                          admin backend                  Firebase
────────────────────────────────────────────────────────────────────────────
signInWithEmailAndPassword ─────────────────────────────────► verifies password
   or signInWithCredential                                    mints ID token
            │
            ├─ ID token ──► POST /api/mobile/session ──► verifyIdToken() ──►┘
            │                        │
            │                        └─ upsert User by firebaseUid
            │                           upsert Device
            │
            └─ every later call sends the same ID token as `Authorization: Bearer`
```

`authenticateMobileRequest` decides which verifier to use by shape: Firebase ID tokens are
JWTs (three dot-separated segments), guest tokens are 64 hex characters.

### Account linking

`POST /api/mobile/session` adopts an existing row when the email already exists — from the
pre-Firebase password era, or from a guest who later signed up — instead of creating a
duplicate. That keeps listening history and device records attached to the same person.

### Suspend / delete / revoke

The admin actions reach into Firebase as well as the local database:

| Action | Local | Firebase |
| --- | --- | --- |
| Suspend | `status = suspended`, sessions deleted | refresh tokens revoked, account disabled |
| Reactivate | `status = active` | account re-enabled |
| Delete | soft-delete, anonymised, `firebaseUid` **kept** | tokens revoked, account disabled |
| Revoke sessions | session rows deleted | refresh tokens revoked |

`verifyIdToken` is called with `checkRevoked`, which is what makes revocation take effect on
the next request rather than whenever the ID token would have expired on its own.

`firebaseUid` is deliberately retained on delete: it is the only thing that lets a returning
sign-in be recognised as a deleted account instead of silently creating a fresh row.
