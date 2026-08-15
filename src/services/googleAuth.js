import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useCallback } from 'react';

import { firebaseAuth } from './firebase';

/**
 * Google sign-in through Play Services.
 *
 * This runs natively rather than through a browser: the native SDK returns a Google ID token
 * directly, which is exchanged for a Firebase credential. The earlier expo-auth-session flow
 * opened a Chrome Custom Tab and came back through a `com.minaxdigital.mp3player:/oauthredirect`
 * custom URI scheme — Google now blocks that on newly created Android OAuth clients, because a
 * custom scheme can be claimed by any app on the device. Nothing here registers a scheme, so
 * that restriction no longer applies.
 */

const clientIds = Constants.expoConfig?.extra?.google ?? {};

/**
 * Only the web client id is needed on Android. The native SDK identifies the app by package
 * name plus signing certificate rather than by an Android client id, but Firebase requires the
 * ID token's audience to be the *web* client, so that is the value handed to `configure`.
 */
const webClientId = clientIds.webClientId ?? '';
const iosClientId = clientIds.iosClientId ?? '';

export const isGoogleConfigured = Boolean(webClientId) && !webClientId.startsWith('REPLACE');

// Configuration is synchronous and has to happen before the first `signIn` call. Doing it at
// import time keeps the hook free of setup effects; a half-configured build skips it entirely
// so the SDK never sees a placeholder client id.
if (isGoogleConfigured) {
  GoogleSignin.configure({
    webClientId,
    ...(iosClientId && !iosClientId.startsWith('REPLACE') ? { iosClientId } : {}),
  });
}

/**
 * Maps the SDK's thrown error codes onto the app's translated copy. A cancellation is reported
 * as `{ cancelled: true }` rather than an error because the auth screen treats it as a no-op.
 */
function resultForError(error) {
  switch (error?.code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return { ok: false, cancelled: true };
    case statusCodes.IN_PROGRESS:
      // A second tap while the account picker is already open — not worth an error banner.
      return { ok: false, cancelled: true };
    default:
      return { ok: false, errorKey: 'signInFailed' };
  }
}

/**
 * Returns `{ signInWithGoogle, ready }`.
 *
 * Unlike the previous browser-based implementation there is no auth request to build, so
 * `ready` reflects configuration alone and is true from the first render.
 */
export function useGoogleSignIn() {
  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleConfigured) return { ok: false, errorKey: 'googleNotConfigured' };

    try {
      // Throws on devices without a usable Play Services install, which is the one hard
      // requirement of this approach.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return { ok: false, cancelled: true };

      const idToken = response.data?.idToken;
      if (!idToken) return { ok: false, errorKey: 'signInFailed' };

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(firebaseAuth(), credential);
      return { ok: true, user: result.user };
    } catch (error) {
      return resultForError(error);
    }
  }, []);

  return { signInWithGoogle, ready: isGoogleConfigured };
}

/**
 * Clears the cached Google session so the next sign-in shows the account picker again.
 * Firebase sign-out is handled separately by AuthContext; this only drops the Google side.
 */
export async function signOutGoogle() {
  if (!isGoogleConfigured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Never block the app's sign-out on the Google SDK failing to clear its cache.
  }
}
