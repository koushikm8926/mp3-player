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

const DEFAULT_BASE_URL =
  Constants.expoConfig?.extra?.adminApiUrl ?? 'http://10.0.2.2:3000';

let cachedBaseUrl = null;
let cachedToken = null;

export async function getBaseUrl() {
  if (cachedBaseUrl != null) return cachedBaseUrl;
  const stored = await SecureStore.getItemAsync(BASE_URL_KEY).catch(() => null);
  cachedBaseUrl = stored || DEFAULT_BASE_URL;
  return cachedBaseUrl;
}

export async function setBaseUrl(url) {
  const cleaned = url.trim().replace(/\/+$/, '');
  cachedBaseUrl = cleaned || DEFAULT_BASE_URL;
  await SecureStore.setItemAsync(BASE_URL_KEY, cachedBaseUrl);
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
  banners: () => request('/banners'),
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
  logout: () => request('/logout', { method: 'POST' }),
};
