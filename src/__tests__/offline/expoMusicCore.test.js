import * as MusicCore from '../../../modules/expo-music-core';

/**
 * Without the native module (Expo Go, tests) every entry point must degrade to a harmless
 * result instead of throwing, otherwise the whole offline app crashes on start.
 */
describe('expo-music-core fallback when the native module is absent', () => {
  it('reports itself unavailable', () => {
    expect(MusicCore.isAvailable).toBe(false);
  });

  it('treats permissions as granted and scans nothing', async () => {
    await expect(MusicCore.getPermissionsAsync()).resolves.toMatchObject({ granted: true });
    await expect(MusicCore.requestPermissionsAsync()).resolves.toMatchObject({ granted: true });
    await expect(MusicCore.scanAudioAsync({ minDurationMs: 0 })).resolves.toEqual([]);
    await expect(MusicCore.refreshMediaStoreAsync()).resolves.toBe(false);
  });

  it('returns an unsupported equalizer instead of throwing', () => {
    expect(MusicCore.isEqualizerSupported()).toBe(false);
    expect(MusicCore.getEqualizerState()).toMatchObject({ supported: false, bands: [] });
    expect(MusicCore.setEqualizerEnabled(true)).toMatchObject({ supported: false });
    expect(MusicCore.usePreset(2)).toMatchObject({ supported: false });
    expect(() => {
      MusicCore.setBandLevel(0, 300);
      MusicCore.setBandLevels([100, 200]);
      MusicCore.setBassBoost(500);
      MusicCore.setVirtualizer(500);
      MusicCore.setLoudness(100);
      MusicCore.setReverb(1);
      MusicCore.attachEqualizerToSession(1);
    }).not.toThrow();
    expect(MusicCore.openSystemEqualizer()).toBe(false);
  });

  it('hands back removable no-op listeners', () => {
    expect(() => MusicCore.addAudioBecomingNoisyListener(() => {}).remove()).not.toThrow();
    expect(() => MusicCore.addMediaLibraryChangeListener(() => {}).remove()).not.toThrow();
    expect(MusicCore.isWiredHeadsetConnected()).toBe(false);
    expect(MusicCore.getAlbumArtworkUri(12)).toBeNull();
  });
});
