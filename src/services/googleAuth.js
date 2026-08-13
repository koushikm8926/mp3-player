import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import { firebaseAuth } from './firebase';

/**
 * Google sign-in on the Firebase JS SDK.
 *
 * The JS SDK's `signInWithPopup` has no React Native implementation, so the OAuth leg runs
 * through expo-auth-session and the resulting Google ID token is exchanged for a Firebase
 * credential. That keeps everything in the managed workflow — no native module, no rebuild.
 */

// Required so the auth session's browser tab closes and returns control to the app.
WebBrowser.maybeCompleteAuthSession();

const clientIds = Constants.expoConfig?.extra?.google ?? {};

/**
 * expo-auth-session throws during render if the current platform's client id is undefined,
 * which would take down the whole auth screen — including guest sign-in. A placeholder keeps
 * the hook constructible; `isGoogleConfigured` is what actually gates the button.
 */
const PLACEHOLDER = 'unconfigured.apps.googleusercontent.com';

const androidClientId = clientIds.androidClientId || PLACEHOLDER;
const webClientId = clientIds.webClientId || PLACEHOLDER;
const iosClientId = clientIds.iosClientId || PLACEHOLDER;

export const isGoogleConfigured = [androidClientId, webClientId].some(
  (id) => id !== PLACEHOLDER && !id.startsWith('REPLACE')
);

/**
 * Returns `{ signInWithGoogle, ready }`.
 *
 * `ready` is false until the auth request has been built; the button stays disabled until
 * then, because calling promptAsync before that silently no-ops.
 */
export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId,
    webClientId,
    iosClientId,
  });

  const [pending, setPending] = useState(null);

  // The hook reports the OAuth result asynchronously rather than resolving promptAsync with
  // it, so the promise handed to the caller is settled here.
  useEffect(() => {
    if (!pending || !response) return;

    const finish = async () => {
      if (response.type !== 'success') {
        pending.resolve(
          response.type === 'dismiss' || response.type === 'cancel'
            ? { ok: false, cancelled: true }
            : { ok: false, errorKey: 'signInFailed' }
        );
        setPending(null);
        return;
      }

      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        pending.resolve({ ok: false, errorKey: 'signInFailed' });
        setPending(null);
        return;
      }

      try {
        const auth = firebaseAuth();
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        pending.resolve({ ok: true, user: result.user });
      } catch {
        pending.resolve({ ok: false, errorKey: 'signInFailed' });
      }
      setPending(null);
    };

    finish();
  }, [response, pending]);

  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleConfigured) return { ok: false, errorKey: 'googleNotConfigured' };
    if (!request) return { ok: false, errorKey: 'signInFailed' };

    return new Promise((resolve) => {
      setPending({ resolve });
      promptAsync().catch(() => {
        resolve({ ok: false, errorKey: 'signInFailed' });
        setPending(null);
      });
    });
  }, [request, promptAsync]);

  return { signInWithGoogle, ready: Boolean(request) && isGoogleConfigured };
}
