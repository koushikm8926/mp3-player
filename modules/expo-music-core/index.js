import { NativeModule, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Thin JS facade over the `expo-music-core` native module.
 *
 * The module is optional so the JS bundle still runs in environments where the native side is
 * absent (Expo Go, web preview, unit tests); every entry point degrades to an empty/unsupported
 * result instead of throwing.
 */
const Native = requireOptionalNativeModule('ExpoMusicCore');

export const isAvailable = Native != null && Platform.OS === 'android';

const UNSUPPORTED_EQ = {
  supported: false,
  enabled: false,
  bands: [],
  presets: [],
  bandLevelRange: [-1500, 1500],
  currentPreset: -1,
  bassBoost: 0,
  virtualizer: 0,
  loudness: 0,
  reverb: 0,
  hasBassBoost: false,
  hasVirtualizer: false,
  hasLoudnessEnhancer: false,
  hasReverb: false,
};

const GRANTED = { status: 'granted', granted: true, canAskAgain: true, expires: 'never' };

export async function getPermissionsAsync() {
  if (!isAvailable) return GRANTED;
  return Native.getPermissionsAsync();
}

export async function requestPermissionsAsync() {
  if (!isAvailable) return GRANTED;
  return Native.requestPermissionsAsync();
}

/**
 * @param {{ minDurationMs?: number, includeAllFileTypes?: boolean }} [options]
 * @returns {Promise<Array<object>>} one record per track, already carrying album/artist/genre/folder.
 */
export async function scanAudioAsync(options = {}) {
  if (!isAvailable) return [];
  return Native.scanAudioAsync(options);
}

/** Asks the system media scanner to re-index storage (the "Refresh library" action). */
export async function refreshMediaStoreAsync(paths = []) {
  if (!isAvailable) return false;
  return Native.refreshMediaStoreAsync(paths);
}

export function getAlbumArtworkUri(albumId) {
  if (!isAvailable || albumId == null) return null;
  return Native.getAlbumArtworkUri(String(albumId));
}

// ---------------------------------------------------------------------------- equalizer

export function isEqualizerSupported() {
  return isAvailable ? Native.isEqualizerSupported() : false;
}

export function getEqualizerState() {
  return isAvailable ? Native.getEqualizerState() : UNSUPPORTED_EQ;
}

export function setEqualizerEnabled(enabled) {
  return isAvailable ? Native.setEqualizerEnabled(enabled) : UNSUPPORTED_EQ;
}

export function setBandLevel(band, millibels) {
  if (isAvailable) Native.setBandLevel(band, Math.round(millibels));
}

export function setBandLevels(levels) {
  if (isAvailable) Native.setBandLevels(levels.map((l) => Math.round(l)));
}

export function usePreset(preset) {
  return isAvailable ? Native.usePreset(preset) : UNSUPPORTED_EQ;
}

export function setBassBoost(strength) {
  if (isAvailable) Native.setBassBoost(Math.round(strength));
}

export function setVirtualizer(strength) {
  if (isAvailable) Native.setVirtualizer(Math.round(strength));
}

export function setLoudness(millibels) {
  if (isAvailable) Native.setLoudness(Math.round(millibels));
}

export function setReverb(preset) {
  if (isAvailable) Native.setReverb(preset);
}

export function attachEqualizerToSession(sessionId) {
  if (isAvailable) Native.attachEqualizerToSession(sessionId);
}

export function openSystemEqualizer(sessionId = 0) {
  return isAvailable ? Native.openSystemEqualizer(sessionId) : false;
}

// ---------------------------------------------------------------------------- device + events

export function isWiredHeadsetConnected() {
  return isAvailable ? Native.isWiredHeadsetConnected() : false;
}

/** @returns {{ remove: () => void }} */
export function addAudioBecomingNoisyListener(listener) {
  if (!isAvailable) return { remove: () => {} };
  return Native.addListener('onAudioBecomingNoisy', listener);
}

/** @returns {{ remove: () => void }} */
export function addMediaLibraryChangeListener(listener) {
  if (!isAvailable) return { remove: () => {} };
  return Native.addListener('onMediaLibraryChanged', listener);
}

export { NativeModule };
export default Native;
