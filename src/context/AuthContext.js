import Constants from 'expo-constants';
import * as Application from 'expo-application';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { historyRepo, outboxRepo } from '../db/repositories';
import { api, setToken } from '../services/api';

const AuthContext = createContext(null);

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Owns the signed-in user and the reporting channel back to the admin panel.
 *
 * The app never blocks on the network: if the server is unreachable the user continues in
 * "local" mode and any analytics is buffered in `pending_events` until a later heartbeat.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | signedOut
  const [serverReachable, setServerReachable] = useState(true);
  const heartbeatTimer = useRef(null);

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

  const bootstrap = useCallback(async () => {
    const response = await api.me();
    if (response.ok && response.data?.user) {
      setUser(response.data.user);
      setStatus('authenticated');
      setServerReachable(true);
      return;
    }
    if (response.offline) {
      setServerReachable(false);
      // A stored token that we cannot validate right now still counts as signed in;
      // the next successful heartbeat will correct this if the token was revoked.
      setStatus((previous) => (previous === 'loading' ? 'signedOut' : previous));
      return;
    }
    setServerReachable(true);
    await setToken(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

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

  const signIn = useCallback(async (email, password) => {
    const response = await api.login({ email: email.trim().toLowerCase(), password, ...deviceInfo });
    if (response.ok && response.data?.token) {
      await setToken(response.data.token);
      setUser(response.data.user);
      setStatus('authenticated');
      setServerReachable(true);
      return { ok: true };
    }
    if (response.offline) {
      setServerReachable(false);
      return { ok: false, offline: true, error: response.error };
    }
    return { ok: false, error: response.error ?? 'Sign in failed' };
  }, [deviceInfo]);

  const signUp = useCallback(async (name, email, password) => {
    const response = await api.register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      ...deviceInfo,
    });
    if (response.ok && response.data?.token) {
      await setToken(response.data.token);
      setUser(response.data.user);
      setStatus('authenticated');
      setServerReachable(true);
      return { ok: true };
    }
    if (response.offline) {
      setServerReachable(false);
      return { ok: false, offline: true, error: response.error };
    }
    return { ok: false, error: response.error ?? 'Registration failed' };
  }, [deviceInfo]);

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
    setServerReachable(!response.offline ? true : false);
    setUser({ id: null, name: 'Guest', email: null, isGuest: true, local: true });
    setStatus('authenticated');
    return { ok: true, local: true };
  }, [deviceInfo]);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => {});
    await setToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      serverReachable,
      deviceInfo,
      signIn,
      signUp,
      continueAsGuest,
      signOut,
      sendHeartbeat,
      flushOutbox,
    }),
    [user, status, serverReachable, deviceInfo, signIn, signUp, continueAsGuest, signOut, sendHeartbeat, flushOutbox]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
