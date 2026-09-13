import { act, renderHook } from '@testing-library/react-native';
import { deleteUser, reauthenticateWithCredential } from 'firebase/auth';
import React from 'react';

import { AuthProvider, useAuth } from '../../context/AuthContext';
import { getDatabase } from '../../db/database';
import {
  favoritesRepo,
  historyRepo,
  outboxRepo,
  playlistsRepo,
  queueRepo,
  searchRepo,
  settingsRepo,
} from '../../db/repositories';
import { api, setToken } from '../../services/api';
import { firebaseAuth } from '../../services/firebase';
import { getGoogleCredential, revokeGoogleAccess } from '../../services/googleAuth';

jest.mock('expo-application', () => ({ getAndroidId: () => 'test-android-id', nativeBuildVersion: '1' }));
jest.mock('firebase/app', () => ({ getApps: () => [], getApp: jest.fn(), initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, callback) => {
    auth.listener = callback;
    return () => {};
  },
  reauthenticateWithCredential: jest.fn(async () => ({})),
  deleteUser: jest.fn(async () => undefined),
  EmailAuthProvider: { credential: (email, password) => ({ providerId: 'password', email, password }) },
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  getAuth: jest.fn(),
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}));
jest.mock('../../services/firebase', () => {
  const actual = jest.requireActual('../../services/firebase');
  const auth = { currentUser: null, listener: null };
  return { ...actual, isFirebaseConfigured: true, firebaseAuth: () => auth };
});
jest.mock('../../services/googleAuth', () => ({
  useGoogleSignIn: () => ({ signInWithGoogle: jest.fn(), ready: true }),
  signOutGoogle: jest.fn(async () => {}),
  getGoogleCredential: jest.fn(),
  revokeGoogleAccess: jest.fn(async () => {}),
}));
jest.mock('../../services/api', () => {
  const offline = async () => ({ ok: false, offline: true });
  return {
    api: {
      session: jest.fn(offline),
      guest: jest.fn(offline),
      me: jest.fn(offline),
      heartbeat: jest.fn(offline),
      syncEvents: jest.fn(offline),
      logout: jest.fn(offline),
      deleteAccount: jest.fn(offline),
    },
    setToken: jest.fn(async () => {}),
  };
});

const EMAIL_USER = { uid: 'u1', email: 'listener@example.com', displayName: 'Listener', providerData: [{ providerId: 'password' }] };
const GOOGLE_USER = { uid: 'u2', email: 'listener@gmail.com', displayName: 'Listener', providerData: [{ providerId: 'google.com' }] };

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper }).result;
}

async function signInAs(firebaseUser) {
  const auth = firebaseAuth();
  auth.currentUser = firebaseUser;
  await act(async () => {
    await auth.listener(firebaseUser);
  });
}

async function seedLocalData() {
  const id = await playlistsRepo.create('Road Trip');
  await playlistsRepo.addTracks(id, [{ id: '1', title: 'One' }]);
  await favoritesRepo.add({ id: '1', title: 'One' });
  await historyRepo.record('1', 200000, true);
  await queueRepo.save(['1'], 0, 1000);
  await searchRepo.record('arijit');
  await outboxRepo.enqueue('play', { trackId: '1' });
  await settingsRepo.set('themeMode', 'dark');
}

async function localData() {
  return {
    playlists: (await playlistsRepo.list()).length,
    favorites: (await favoritesRepo.ids()).length,
    listens: (await historyRepo.summary()).listens,
    queue: await queueRepo.load(),
    searches: (await searchRepo.recent()).length,
    pendingEvents: (await outboxRepo.peek()).length,
    settings: await settingsRepo.all(),
  };
}

const untouched = { playlists: 1, favorites: 1, listens: 1, searches: 1, pendingEvents: 1 };

beforeEach(async () => {
  jest.clearAllMocks();
  firebaseAuth().currentUser = null;
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM playlist_tracks; DELETE FROM playlists; DELETE FROM favorites; DELETE FROM play_history;
    DELETE FROM track_stats; DELETE FROM queue_state; DELETE FROM search_history; DELETE FROM pending_events;
    DELETE FROM settings;
  `);
  await seedLocalData();
});

describe('who can delete an account', () => {
  it('reports the sign-in method of email and Google accounts', async () => {
    const result = renderAuth();
    await signInAs(EMAIL_USER);
    expect(result.current.accountProvider).toBe('password');
    await signInAs(GOOGLE_USER);
    expect(result.current.accountProvider).toBe('google');
  });

  it('gives guests nothing to delete', async () => {
    const result = renderAuth();
    await act(async () => {
      await firebaseAuth().listener(null);
    });
    await act(async () => {
      await result.current.continueAsGuest();
    });
    expect(result.current.user).toMatchObject({ isGuest: true });
    expect(result.current.accountProvider).toBeNull();

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount({ password: 'secret' });
    });
    expect(outcome).toEqual({ ok: false, errorKey: 'deleteAccountFailed' });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(await localData()).toMatchObject(untouched);
  });
});

describe('email accounts', () => {
  it('confirms the password, deletes the account and wipes this device', async () => {
    const result = renderAuth();
    await signInAs(EMAIL_USER);
    const order = [];
    const beforeLocalWipe = jest.fn(async () => {
      order.push('beforeLocalWipe');
      expect((await favoritesRepo.ids()).length).toBe(1);
    });
    api.deleteAccount.mockImplementation(async () => {
      order.push('server');
      return { ok: true };
    });
    deleteUser.mockImplementation(async () => {
      order.push('firebase');
    });

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount({ password: 'secret', beforeLocalWipe });
    });

    expect(outcome).toEqual({ ok: true });
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(EMAIL_USER, {
      providerId: 'password',
      email: 'listener@example.com',
      password: 'secret',
    });
    expect(deleteUser).toHaveBeenCalledWith(EMAIL_USER);
    expect(order).toEqual(['server', 'firebase', 'beforeLocalWipe']);
    expect(setToken).toHaveBeenCalledWith(null);
    expect(revokeGoogleAccess).not.toHaveBeenCalled();

    expect(await localData()).toEqual({
      playlists: 0,
      favorites: 0,
      listens: 0,
      queue: null,
      searches: 0,
      pendingEvents: 0,
      settings: { themeMode: 'dark' },
    });
  });

  it('asks for the password before contacting Firebase', async () => {
    const result = renderAuth();
    await signInAs(EMAIL_USER);
    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount({ password: '' });
    });
    expect(outcome).toEqual({ ok: false, errorKey: 'passwordRequired' });
    expect(reauthenticateWithCredential).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it.each([
    ['auth/invalid-credential', 'invalidCredentials'],
    ['auth/wrong-password', 'invalidCredentials'],
    ['auth/too-many-requests', 'tooManyAttempts'],
  ])('keeps everything when re-authentication fails with %s', async (code, errorKey) => {
    reauthenticateWithCredential.mockRejectedValueOnce(Object.assign(new Error(code), { code }));
    const result = renderAuth();
    await signInAs(EMAIL_USER);

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount({ password: 'wrong' });
    });

    expect(outcome).toEqual({ ok: false, errorKey });
    expect(api.deleteAccount).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(setToken).not.toHaveBeenCalledWith(null);
    expect(await localData()).toMatchObject(untouched);
  });

  it('keeps local data and explains the problem when Firebase cannot be reached', async () => {
    deleteUser.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'auth/network-request-failed' }));
    const result = renderAuth();
    await signInAs(EMAIL_USER);

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount({ password: 'secret' });
    });

    expect(outcome).toEqual({ ok: false, errorKey: 'deleteAccountFailed' });
    expect(await localData()).toMatchObject(untouched);
  });

  it('still deletes the Firebase account when the admin server fails', async () => {
    api.deleteAccount.mockRejectedValueOnce(new Error('server down'));
    const result = renderAuth();
    await signInAs(EMAIL_USER);

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount({ password: 'secret' });
    });

    expect(outcome).toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalledWith(EMAIL_USER);
  });
});

describe('Google accounts', () => {
  const credential = { providerId: 'google.com', idToken: 'fresh-token' };

  it('confirms through the Google picker, deletes the account and revokes access', async () => {
    getGoogleCredential.mockResolvedValue({ ok: true, credential });
    const result = renderAuth();
    await signInAs(GOOGLE_USER);

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount();
    });

    expect(outcome).toEqual({ ok: true });
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(GOOGLE_USER, credential);
    expect(deleteUser).toHaveBeenCalledWith(GOOGLE_USER);
    expect(revokeGoogleAccess).toHaveBeenCalled();
    expect(await localData()).toMatchObject({ playlists: 0, favorites: 0, pendingEvents: 0 });
  });

  it('does nothing when the Google picker is dismissed', async () => {
    getGoogleCredential.mockResolvedValue({ ok: false, cancelled: true });
    const result = renderAuth();
    await signInAs(GOOGLE_USER);

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount();
    });

    expect(outcome).toEqual({ ok: false, cancelled: true });
    expect(reauthenticateWithCredential).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
    expect(await localData()).toMatchObject(untouched);
  });

  it('refuses when a different Google account is picked', async () => {
    getGoogleCredential.mockResolvedValue({ ok: true, credential });
    reauthenticateWithCredential.mockRejectedValueOnce(
      Object.assign(new Error('mismatch'), { code: 'auth/user-mismatch' })
    );
    const result = renderAuth();
    await signInAs(GOOGLE_USER);

    let outcome;
    await act(async () => {
      outcome = await result.current.deleteAccount();
    });

    expect(outcome).toEqual({ ok: false, errorKey: 'wrongGoogleAccount' });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(revokeGoogleAccess).not.toHaveBeenCalled();
  });
});
