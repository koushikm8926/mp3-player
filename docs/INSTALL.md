# Installation guide

Covers a clean setup of both deliverables, from prerequisites to a signed release APK.

---

## 1. Prerequisites

| Tool | Version used | Notes |
| ---- | ------------ | ----- |
| Node.js | 20 LTS or newer (built on 26) | `node --version` |
| npm | 10+ | ships with Node |
| JDK | 17 | `java -version`; Temurin or Zulu both fine |
| Android SDK | Platform 36, Build-Tools 36 | via Android Studio |
| Android Studio | Latest | for the emulator and SDK manager |

Set the SDK location (add to `~/.zshrc` or `~/.bashrc`):

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"        # macOS
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

On Windows the path is `%LOCALAPPDATA%\Android\Sdk`; on Linux, `~/Android/Sdk`.

Confirm the toolchain:

```bash
adb --version
java -version
```

---

## 2. Admin panel and API

The mobile app talks to this server, so start here.

```bash
cd admin
npm install
```

### Configure the environment

`admin/.env` is created for you with development defaults. For anything beyond local work,
replace the secret:

```bash
# admin/.env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<paste output of: openssl rand -base64 32>"

SEED_ADMIN_EMAIL="admin@minaxdigital.com"
SEED_ADMIN_PASSWORD="<choose a strong password>"
SEED_ADMIN_NAME="Minax Administrator"
```

`AUTH_SECRET` must be at least 32 characters — the server refuses to start otherwise.

### Create and seed the database

```bash
npm run setup
```

That runs three steps: `prisma generate`, `prisma db push` (creates `admin/dev.db` and all
tables), and the seed (first admin, 11 default settings, app version 1.0.0 build 1).

To also create 48 sample users with devices and usage events:

```bash
npx tsx prisma/seed.ts --demo
```

The seed is idempotent — re-running it will not duplicate anything, and it preserves setting
values you have edited in the panel.

### Run it

```bash
npm run dev          # development, http://localhost:3000
# or
npm run build && npm start   # production
```

Sign in at <http://localhost:3000/login>.

`npm run dev` binds to `0.0.0.0` so a physical phone on the same Wi-Fi can reach it.

---

## 3. Android application

```bash
cd ..          # back to the repository root
npm install
```

### Point the app at your server

The default is `http://10.0.2.2:3000`, which is how the Android **emulator** reaches
`localhost` on the host machine. Change it in `app.json` under `expo.extra.adminApiUrl`, or at
runtime from **Settings → Server URL** inside the app.

| Running on | Use |
| ---------- | --- |
| Android emulator | `http://10.0.2.2:3000` |
| Physical device, same Wi-Fi | `http://<your-machine-LAN-ip>:3000` (e.g. `http://192.168.1.20:3000`) |
| Deployed server | `https://admin.yourdomain.com` |

Find your LAN IP with `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux).

### Generate the native project

```bash
npx expo prebuild --platform android --clean
```

This writes the `android/` directory from `app.json`. It is regenerated rather than
hand-edited — if you need a native change, change `app.json` or the config plugin and re-run.

### Debug build

Start an emulator (or plug in a device with USB debugging on), then:

```bash
npx expo run:android
```

The first build takes several minutes; later builds are incremental.

> **Expo Go will not work.** The app includes a custom native module, so it needs a
> development build or the release APK.

---

## 4. Release APK

### Unsigned (testing)

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

### Signed (distribution)

Create a keystore once and keep it somewhere safe — losing it means you cannot ship updates
to an existing installation.

```bash
keytool -genkeypair -v \
  -keystore minax-release.keystore \
  -alias minax \
  -keyalg RSA -keysize 2048 -validity 10000
```

Put the credentials in `android/gradle.properties` (this file is generated; add the entries
after prebuild, and never commit real values):

```properties
MINAX_UPLOAD_STORE_FILE=/absolute/path/to/minax-release.keystore
MINAX_UPLOAD_KEY_ALIAS=minax
MINAX_UPLOAD_STORE_PASSWORD=********
MINAX_UPLOAD_KEY_PASSWORD=********
```

Then add the signing config to `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('MINAX_UPLOAD_STORE_FILE')) {
                storeFile file(MINAX_UPLOAD_STORE_FILE)
                storePassword MINAX_UPLOAD_STORE_PASSWORD
                keyAlias MINAX_UPLOAD_KEY_ALIAS
                keyPassword MINAX_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...leave the rest of the generated block as-is
        }
    }
}
```

Build and install:

```bash
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

For a Play Store bundle instead: `./gradlew bundleRelease` →
`android/app/build/outputs/bundle/release/app-release.aab`.

### Reducing APK size

A default `assembleRelease` produces roughly **111 MB**, because it ships native libraries for
all four ABIs (91 MB of the total) plus the development client.

| Lever | Saving | How |
| ----- | ------ | --- |
| Drop emulator ABIs | ~50 MB | In `android/gradle.properties`: `reactNativeArchitectures=arm64-v8a,armeabi-v7a` |
| Ship an AAB instead | ~60 MB per install | `./gradlew bundleRelease` — Play delivers only the device's ABI |
| Enable ProGuard/R8 | ~5–10 MB | Set `enableProguardInReleaseBuilds: true` in the `expo-build-properties` block in `app.json` |
| Remove `expo-dev-client` | ~8 MB | `npm uninstall expo-dev-client` once you no longer need development builds |

Keep the x86 ABIs while you are still testing on an emulator — dropping them means the app
will not install there.

If you enable ProGuard, test the release build on a real device before shipping: R8 can strip
classes that React Native and Expo modules reach through reflection.

### Registering the release in the admin panel

So installed apps see the update:

1. Sign in to the panel → **App versions**.
2. Fill in version (e.g. `1.1.0`), build number, and release notes.
3. Optionally paste the APK download URL and tick **Mandatory update**.
4. **Publish release.**

Bump `expo.version` and `expo.android.versionCode` in `app.json` to match before building.

---

## 5. First run on the device

1. The splash screen appears while the library is scanned.
2. Register, sign in, or choose **Continue without an account**.
3. Grant the media permission when Android asks — the library stays empty without it.
   (Android 13+ asks for `READ_MEDIA_AUDIO`; older versions ask for storage access.)
4. If no music appears, copy some audio files to the device, then pull to refresh on Home, or
   use **Settings → Refresh music library**.

---

## 6. Troubleshooting

**`AUTH_SECRET is missing or shorter than 32 characters`**
Set a longer value in `admin/.env` and restart the server.

**The app shows "Server unreachable — continuing offline"**
The API base URL is wrong or the server is not running. Emulators must use `10.0.2.2`, not
`localhost` — `localhost` inside the emulator is the emulator itself. Check
**Settings → Server URL**.

**Library is empty after granting permission**
Only files indexed by Android's MediaStore are visible. Copy audio through MTP or the Files
app (which triggers indexing), then use **Settings → Refresh music library**. Files shorter
than the "Ignore short clips" threshold are skipped by design — that setting is in
**Settings → Library**.

**Equalizer shows "This device does not expose an equalizer to apps"**
Some OEM ROMs refuse audio effects on the global output mix. Use the **Open system
equalizer** button, which hands off to the manufacturer's own equalizer.

**Gradle fails with a Java version error**
Confirm `java -version` reports 17. If several JDKs are installed, point Gradle at the right
one in `android/gradle.properties`:
`org.gradle.java.home=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home`

**`prisma generate` complains about the datasource url**
Prisma 7 reads the connection string from `admin/prisma.config.ts`, not from
`schema.prisma`. Make sure `DATABASE_URL` is set in `admin/.env`.

**Build fails after editing `app.json`**
Re-run `npx expo prebuild --platform android --clean` — the `android/` directory is generated
output and does not pick up config changes on its own.
