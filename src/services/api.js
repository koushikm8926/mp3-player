import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

import { currentIdToken } from './firebase';

/**
 * Client for the Next.js admin backend.
 *
 * Every call is best-effort: the player is fully usable offline, so a network failure
 * surfaces as `{ ok: false, offline: true }` rather than an exception the UI must catch.
 */

const TOKEN_KEY = 'minax.auth.token';
const BASE_URL_KEY = 'minax.api.baseUrl';
const REQUEST_TIMEOUT_MS = 12000;

/**
 * Empty in shipping builds: no public backend is deployed, so the app runs offline-first and
 * every call short-circuits below rather than waiting out the timeout against an address that
 * cannot answer. There is no in-app screen for changing it; `setBaseUrl` is kept for v2.
 */
const DEFAULT_BASE_URL = Constants.expoConfig?.extra?.adminApiUrl ?? '';

let cachedBaseUrl = null;
// Tracked separately from the value, which is legitimately '' when no server is configured.
let baseUrlResolved = false;
let cachedToken = null;

export async function getBaseUrl() {
  if (baseUrlResolved) return cachedBaseUrl;
  const stored = await SecureStore.getItemAsync(BASE_URL_KEY).catch(() => null);
  cachedBaseUrl = stored || DEFAULT_BASE_URL;
  baseUrlResolved = true;
  return cachedBaseUrl;
}

export async function setBaseUrl(url) {
  const cleaned = url.trim().replace(/\/+$/, '');
  cachedBaseUrl = cleaned || DEFAULT_BASE_URL;
  baseUrlResolved = true;
  if (cachedBaseUrl) {
    await SecureStore.setItemAsync(BASE_URL_KEY, cachedBaseUrl);
  } else {
    await SecureStore.deleteItemAsync(BASE_URL_KEY).catch(() => {});
  }
}

export async function getToken() {
  if (cachedToken != null) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  return cachedToken;
}

export async function setToken(token) {
  cachedToken = token;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const baseUrl = await getBaseUrl();
  // No server configured — report the shape a network failure produces, immediately, instead
  // of holding the caller for REQUEST_TIMEOUT_MS on a connection that cannot succeed.
  if (!baseUrl) return { ok: false, offline: true, error: 'No server configured' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      // Signed-in users authenticate with a Firebase ID token, which the SDK refreshes for
      // us. Guests have no Firebase identity, so they fall back to the opaque device token
      // this server issued them.
      const token = (await currentIdToken()) ?? (await getToken());
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/api/mobile${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? safeJson(text) : {};

    if (!response.ok) {
      return { ok: false, status: response.status, error: data?.error ?? 'Request failed', data };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    // Timeout, DNS failure, server down — all treated the same by callers.
    return { ok: false, offline: true, error: error?.message ?? 'Network error' };
  } finally {
    clearTimeout(timeout);
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export const api = {
  /**
   * Exchanges the current Firebase ID token for the server-side user record. Called right
   * after sign-in and on every cold start, so the admin panel sees the account.
   */
  session: (payload) => request('/session', { method: 'POST', body: payload }),
  guest: (payload) => request('/guest', { method: 'POST', body: payload, auth: false }),
  me: () => request('/me'),
  updateProfile: (payload) => request('/me', { method: 'PATCH', body: payload }),
  /** Removes the caller's account, with its devices, sessions and events, from the admin panel. */
  deleteAccount: () => request('/me', { method: 'DELETE' }),
  heartbeat: (payload) => request('/heartbeat', { method: 'POST', body: payload }),
  syncEvents: (events) => request('/events', { method: 'POST', body: { events } }),
  checkVersion: (payload) =>
    request(
      `/version?platform=android&version=${encodeURIComponent(payload.version)}&build=${payload.build}`,
      { auth: false }
    ),
  /** Published tracks for Admin songs mode. Each carries an absolute streaming URL. */
  songs: () => request('/songs'),
  /** Published carousel banners uploaded from the admin panel. */
  banners: () => request('/banners', { auth: false }),
  /**
   * Reports a measured track length. The panel cannot decode audio server-side, so uploads
   * have no duration until a device that has played one sends the value back.
   */
  reportSongDuration: (id, durationMs) =>
    request(`/songs/${encodeURIComponent(id)}/duration`, {
      method: 'POST',
      body: { durationMs },
    }),
  remoteSettings: () => request('/settings', { auth: false }),
  getBaseUrl: () => getBaseUrl(),
  logout: () => request('/logout', { method: 'POST' }),
};
