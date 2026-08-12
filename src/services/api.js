import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

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
      const token = await getToken();
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
  register: (payload) => request('/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/login', { method: 'POST', body: payload, auth: false }),
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
  remoteSettings: () => request('/settings', { auth: false }),
  logout: () => request('/logout', { method: 'POST' }),
};
