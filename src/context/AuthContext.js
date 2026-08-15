import * as Application from 'expo-application';
import Constants from 'expo-constants';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { historyRepo, outboxRepo } from '../db/repositories';
import { api, setToken } from '../services/api';
import { authErrorKey, firebaseAuth, isFirebaseConfigured } from '../services/firebase';
import { signOutGoogle, useGoogleSignIn } from '../services/googleAuth';

const AuthContext = createContext(null);

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Owns the signed-in user and the reporting channel back to the admin panel.
 *
 * Identity lives in Firebase Authentication: this provider mirrors `onAuthStateChanged` into
 * app state, then calls `POST /api/mobile/session` so the admin panel has a row to report on.
 * Guests are the exception — they have no Firebase credential and keep the server's opaque
 * device token.
 *
 * The app never blocks on the admin server: if it is unreachable the user stays signed in
 * (Firebase already vouched for them) and analytics buffers in `pending_events`.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | signedOut
  const [serverReachable, setServerReachable] = useState(true);
  const heartbeatTimer = useRef(null);
  const { signInWithGoogle: promptGoogle, ready: googleReady } = useGoogleSignIn();

  const deviceInfo = useMemo(
    () => ({
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
      buildNumber: Number(Application.nativeBuildVersion) || 1,
      deviceName: Constants.deviceName ?? 'Android device',
    }),
    []
  );

  /**
   * Trades the current Firebase ID token for the server-side profile. A failure here is not
   * a sign-in failure: Firebase has already authenticated the user, so we fall back to the
   * Firebase profile and let the next heartbeat reconcile.
   */
  const syncSession = useCallback(
    async (firebaseUser) => {
      const response = await api.session(deviceInfo);

      if (response.ok && response.data?.user) {
        setServerReachable(true);
        return response.data.user;
      }

      if (response.offline) setServerReachable(false);
      else setServerReachable(true);

      return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'Listener',
        email: firebaseUser.email,
        isGuest: false,
        local: true,
      };
    },
    [deviceInfo]
  );

  // Firebase is the source of truth for who is signed in, including across cold starts.
  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) {
      // Unconfigured build: guest mode still works, so land on the auth screen rather than
      // hanging on the splash forever.
      setStatus('signedOut');
      return undefined;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // A guest session is not a Firebase session; don't tear it down here.
        const guestToken = await api.me();
        if (guestToken.ok && guestToken.data?.user?.isGuest) {
          setUser(guestToken.data.user);
          setStatus('authenticated');
          return;
        }
        setUser(null);
        setStatus('signedOut');
        return;
      }

      const profile = await syncSession(firebaseUser);
      setUser(profile);
      setStatus('authenticated');
    });
  }, [syncSession]);

  const flushOutbox = useCallback(async () => {
    const pending = await outboxRepo.peek(100).catch(() => []);
    if (!pending.length) return;
    const response = await api.syncEvents(
      pending.map((event) => ({
        type: event.type,
        createdAt: event.createdAt,
        ...event.payload,
      }))
    );
    if (response.ok) {
      await outboxRepo.drop(pending.map((event) => event.id));
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (status !== 'authenticated') return;
    const summary = await historyRepo.summary().catch(() => null);
    const response = await api.heartbeat({
      ...deviceInfo,
      listens: summary?.listens ?? 0,
      listeningMs: summary?.totalMs ?? 0,
      uniqueTracks: summary?.uniqueTracks ?? 0,
    });
    setServerReachable(!response.offline);
    if (response.ok) await flushOutbox();
  }, [status, deviceInfo, flushOutbox]);

  // Heartbeat drives the admin panel's "Active users" view.
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    sendHeartbeat();
    heartbeatTimer.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') sendHeartbeat();
    });
    return () => {
      clearInterval(heartbeatTimer.current);
      subscription.remove();
    };
  }, [status, sendHeartbeat]);

  const requireFirebase = () =>
    isFirebaseConfigured ? null : { ok: false, errorKey: 'firebaseNotConfigured' };

  /**
   * The onAuthStateChanged listener above performs the state transition, so these actions
   * only report success or a translatable error key.
   */
  const signIn = useCallback(async (email, password) => {
    const missing = requireFirebase();
    if (missing) return missing;

    try {
      await signInWithEmailAndPassword(firebaseAuth(), email.trim().toLowerCase(), password);
      return { ok: true };
    } catch (error) {
      return { ok: false, errorKey: authErrorKey(error?.code) };
    }
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    const missing = requireFirebase();
    if (missing) return missing;

    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth(),
        email.trim().toLowerCase(),
        password
      );
      const displayName = name.trim();
      if (displayName) {
        await updateProfile(credential.user, { displayName }).catch(() => {});
        // The session sync reads displayName off the token's claims, which are only
        // refreshed on the next token fetch — force one so the server stores the real name.
        await credential.user.getIdToken(true).catch(() => {});
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, errorKey: authErrorKey(error?.code) };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const missing = requireFirebase();
    if (missing) return missing;
    return promptGoogle();
  }, [promptGoogle]);

  const resetPassword = useCallback(async (email) => {
    const missing = requireFirebase();
    if (missing) return missing;

    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim().toLowerCase());
      return { ok: true };
    } catch (error) {
      return { ok: false, errorKey: authErrorKey(error?.code) };
    }
  }, []);

  /**
   * "Continue without an account" still registers an anonymous device record so the admin
   * panel's user counts reflect real installs. If the server is down we fall through to a
   * purely local session.
   */
  const continueAsGuest = useCallback(async () => {
    const installationId =
      (await Application.getAndroidId?.()) ?? Constants.sessionId ?? String(Date.now());
    const response = await api.guest({ installationId, ...deviceInfo });

    if (response.ok && response.data?.token) {
      await setToken(response.data.token);
      setUser(response.data.user);
      setStatus('authenticated');
      setServerReachable(true);
      return { ok: true };
    }

    setServerReachable(!response.offline);
    setUser({ id: null, name: 'Guest', email: null, isGuest: true, local: true });
    setStatus('authenticated');
    return { ok: true, local: true };
  }, [deviceInfo]);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    await setToken(null);
    // Play Services caches the chosen account independently of Firebase; without this the
    // next Google sign-in silently reuses it instead of offering the account picker.
    await signOutGoogle();

    const auth = firebaseAuth();
    if (auth?.currentUser) {
      await firebaseSignOut(auth).catch(() => {});
      // onAuthStateChanged clears the rest.
      return;
    }

    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      serverReachable,
      deviceInfo,
      googleReady,
      firebaseReady: isFirebaseConfigured,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      continueAsGuest,
      signOut,
      sendHeartbeat,
      flushOutbox,
    }),
    [
      user,
      status,
      serverReachable,
      deviceInfo,
      googleReady,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      continueAsGuest,
      signOut,
      sendHeartbeat,
      flushOutbox,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
