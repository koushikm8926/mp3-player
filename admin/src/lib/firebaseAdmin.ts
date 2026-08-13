import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

/**
 * Firebase Admin, used only to verify ID tokens minted by the app.
 *
 * Credentials come from the environment rather than a checked-in service-account file.
 * `FIREBASE_PRIVATE_KEY` is stored with literal "\n" sequences (that is how the key survives
 * a single-line .env), so they are expanded back into real newlines here.
 */

const APP_NAME = 'melophile-admin';

let cached: App | null = null;

function credentialsFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/** Returns the admin app, or null when Firebase has not been configured yet. */
function firebaseApp(): App | null {
  if (cached) return cached;

  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) {
    cached = existing;
    return cached;
  }

  const credentials = credentialsFromEnv();
  if (!credentials) return null;

  cached = initializeApp({ credential: cert(credentials), projectId: credentials.projectId }, APP_NAME);
  return cached;
}

export function isFirebaseConfigured(): boolean {
  return credentialsFromEnv() !== null;
}

/**
 * Verifies a Firebase ID token. Returns null for anything invalid, expired or revoked —
 * callers treat that as "not signed in" rather than distinguishing the failure modes.
 */
export async function verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
  const app = firebaseApp();
  if (!app) return null;

  try {
    return await getAuth(app).verifyIdToken(idToken, true);
  } catch {
    return null;
  }
}

/**
 * Invalidates every refresh token for a user, so their app sessions end.
 *
 * `verifyIdToken` above is called with `checkRevoked`, which is what makes this take effect
 * on the next request rather than whenever the current ID token would have expired.
 *
 * Returns false when Firebase is unconfigured or the UID is unknown; callers treat that as
 * "nothing to revoke" since guests have no Firebase identity.
 */
export async function revokeUserTokens(uid: string): Promise<boolean> {
  const app = firebaseApp();
  if (!app) return false;
  try {
    await getAuth(app).revokeRefreshTokens(uid);
    return true;
  } catch {
    return false;
  }
}

/** Disables a Firebase account so it can no longer sign in. Reversible from the console. */
export async function setUserDisabled(uid: string, disabled: boolean): Promise<boolean> {
  const app = firebaseApp();
  if (!app) return false;
  try {
    await getAuth(app).updateUser(uid, { disabled });
    return true;
  } catch {
    return false;
  }
}

export { getApp };
