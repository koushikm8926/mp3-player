import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

/**
 * Firebase Authentication for the app.
 *
 * Config lives in `app.json` under `extra.firebase` rather than in source, so the same build
 * pipeline can point at a staging project without a code change. These values are not
 * secrets — Firebase treats the API key as a public project identifier and enforces access
 * through Authentication settings and security rules.
 *
 * `initializeAuth` with AsyncStorage persistence is required on React Native: the default
 * `getAuth` uses in-memory persistence there, which signs the user out on every cold start.
 */

const config = Constants.expoConfig?.extra?.firebase ?? {};

/** True once the placeholders in app.json have been replaced with a real project. */
export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId && !String(config.apiKey).startsWith('REPLACE')
);

let authInstance = null;

function firebaseApp() {
  return getApps().length ? getApp() : initializeApp(config);
}

/**
 * Returns the Auth instance, or null when Firebase has not been configured yet — callers
 * surface a setup message instead of crashing on a half-configured build.
 */
export function firebaseAuth() {
  if (!isFirebaseConfigured) return null;
  if (authInstance) return authInstance;

  const app = firebaseApp();
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if it already ran for this app (fast refresh, double import).
    authInstance = getAuth(app);
  }
  return authInstance;
}

/**
 * Current user's ID token, refreshed automatically by the SDK when close to expiry.
 * Null when signed out or unconfigured.
 */
export async function currentIdToken(forceRefresh = false) {
  const auth = firebaseAuth();
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/** Maps Firebase error codes onto the app's translated copy. */
export function authErrorKey(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'invalidEmail';
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'passwordTooShort';
    case 'auth/email-already-in-use':
      return 'emailAlreadyInUse';
    case 'auth/user-disabled':
      return 'accountDisabled';
    case 'auth/too-many-requests':
      return 'tooManyAttempts';
    case 'auth/network-request-failed':
      return 'offlineNotice';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'invalidCredentials';
    default:
      return 'signInFailed';
  }
}
