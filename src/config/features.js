/**
 * Build-time feature flags.
 *
 * Online mode (the admin-panel catalogue, streaming, everything that needs the
 * server) ships in v2. Version 1 on the Play Store is offline-only, so the flag
 * stays off: the Offline/Online switch then only announces the feature instead
 * of turning it on.
 */
export const ONLINE_FEATURES_ENABLED = true;
