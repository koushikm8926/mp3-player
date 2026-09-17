import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { LibraryProvider, useLibrary } from '../../context/LibraryContext';
import { resetUserData } from '../../db/database';
import { favoritesRepo, HIDDEN_KIND } from '../../db/repositories';

const mockScan = jest.fn();
const mockGetPermission = jest.fn();
const mockRequestPermission = jest.fn();

jest.mock('../../../modules/expo-music-core', () => ({
  getPermissionsAsync: (...args) => mockGetPermission(...args),
  requestPermissionsAsync: (...args) => mockRequestPermission(...args),
  scanAudioAsync: (...args) => mockScan(...args),
  refreshMediaStoreAsync: jest.fn(async () => true),
  addMediaLibraryChangeListener: () => ({ remove: () => {} }),
}));

const mockApiSongs = jest.fn();
jest.mock('../../services/api', () => ({ api: { songs: (...args) => mockApiSongs(...args) } }));

const mockSettings = { minDurationMs: 30000, settings: { autoRefreshLibrary: false } };
jest.mock('../../context/SettingsContext', () => ({ useSettings: () => mockSettings }));

const ADMIN_MODE_KEY = 'minax.library.adminMode';

const DEVICE_FILES = [
  { id: 1, uri: 'file:///Music/one.mp3', title: 'One', artist: 'Alpha', album: 'First', albumId: '11', genre: 'Pop', fileName: 'one.mp3', folderPath: '/Music', folderName: 'Music', duration: 200000, trackNumber: 1, dateAdded: 100 },
  { id: 2, uri: 'file:///Music/two.mp3', title: 'Two', artist: 'Alpha', album: 'First', albumId: '11', genre: 'Pop', fileName: 'two.mp3', folderPath: '/Music', folderName: 'Music', duration: 210000, trackNumber: 2, dateAdded: 300 },
  { id: 3, uri: 'file:///Music/Old/three.mp3', title: 'Three', artist: 'Beta', album: 'Second', albumId: '12', genre: 'Rock', fileName: 'three.mp3', folderPath: '/Music/Old', folderName: 'Old', duration: 190000, trackNumber: 1, dateAdded: 200 },
  { id: 4, uri: 'file:///Recordings/memo.mp3', title: 'Voice Note', artist: 'Me', album: 'Recordings', albumId: '0', genre: '', fileName: 'memo.mp3', folderPath: '/Recordings', folderName: 'Recordings', duration: 60000, trackNumber: 0, dateAdded: 50 },
];

const wrapper = ({ children }) => <LibraryProvider>{children}</LibraryProvider>;

async function renderLibrary() {
  const hook = renderHook(() => useLibrary(), { wrapper });
  await waitFor(() => expect(hook.result.current.initialised).toBe(true));
  return hook;
}

const titles = (tracks) => tracks.map((t) => t.title);
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

beforeEach(async () => {
  jest.clearAllMocks();
  mockGetPermission.mockResolvedValue({ granted: true, status: 'granted' });
  mockScan.mockImplementation(async () => DEVICE_FILES.map((file) => ({ ...file })));
  await resetUserData();
  await AsyncStorage.clear();
});

describe('device library', () => {
  it('scans on start, skipping tracks shorter than the setting', async () => {
    const { result } = await renderLibrary();
    expect(mockScan).toHaveBeenCalledWith({ minDurationMs: 30000, includeAllFileTypes: true });
    expect(result.current.permission).toBe('granted');
    expect(titles(result.current.tracks)).toEqual(['One', 'Two', 'Three', 'Voice Note']);
    expect(result.current.albums.map((a) => [a.name, a.trackCount])).toEqual([
      ['First', 2],
      ['Recordings', 1],
      ['Second', 1],
    ]);
    expect(result.current.folders.map((f) => f.name)).toEqual(['Music', 'Old', 'Recordings']);
    expect(titles(result.current.recentlyAddedTracks)).toEqual(['Two', 'Three', 'One', 'Voice Note']);
  });

  it('waits for permission before scanning', async () => {
    mockGetPermission.mockResolvedValue({ granted: false, status: 'denied' });
    const { result } = await renderLibrary();
    expect(result.current.permission).toBe('denied');
    expect(result.current.tracks).toEqual([]);
    expect(mockScan).not.toHaveBeenCalled();

    mockRequestPermission.mockResolvedValue({ granted: true, status: 'granted' });
    let granted;
    await act(async () => {
      granted = await result.current.requestPermission();
    });
    expect(granted).toBe(true);
    expect(result.current.permission).toBe('granted');
    expect(result.current.tracks).toHaveLength(4);
  });

  it('shows an empty library instead of crashing when the scan fails', async () => {
    mockScan.mockRejectedValue(new Error('MediaStore unavailable'));
    const { result } = await renderLibrary();
    expect(result.current.tracks).toEqual([]);
    expect(result.current.scanning).toBe(false);
  });

  it('resolves ids to tracks, dropping ones that no longer exist', async () => {
    const { result } = await renderLibrary();
    expect(titles(result.current.resolveTracks(['3', '999', 1]))).toEqual(['Three', 'One']);
  });
});

describe('favourites', () => {
  it('adds and removes a favourite and saves it', async () => {
    const { result } = await renderLibrary();
    const one = result.current.tracks[0];

    await act(async () => {
      expect(await result.current.toggleFavorite(one)).toBe(true);
    });
    expect(result.current.isFavorite('1')).toBe(true);
    expect(titles(result.current.favoriteTracks)).toEqual(['One']);
    expect(await favoritesRepo.ids()).toEqual(['1']);

    await act(async () => {
      expect(await result.current.toggleFavorite(one)).toBe(false);
    });
    expect(result.current.isFavorite('1')).toBe(false);
    expect(result.current.favoriteTracks).toEqual([]);
  });

  it('remembers favourites after a restart', async () => {
    const first = await renderLibrary();
    await act(async () => {
      await first.result.current.toggleFavorite(first.result.current.tracks[2]);
    });
    first.unmount();
    const { result } = await renderLibrary();
    expect(titles(result.current.favoriteTracks)).toEqual(['Three']);
  });
});

describe('playlists', () => {
  it('creates, fills, renames, edits and deletes a playlist', async () => {
    const { result } = await renderLibrary();
    const [one, two, three] = result.current.tracks;
    let id;

    await act(async () => {
      id = await result.current.createPlaylist('Road Trip', '');
    });
    expect(result.current.playlists.map((p) => p.name)).toEqual(['Road Trip']);

    await act(async () => {
      expect(await result.current.addTracksToPlaylist(id, [one, three, two])).toBe(3);
    });
    expect(result.current.playlists[0].track_count).toBe(3);
    await expect(result.current.getPlaylistTracks(id).then(titles)).resolves.toEqual(['One', 'Three', 'Two']);

    await act(async () => {
      await result.current.reorderPlaylist(id, ['2', '1', '3']);
      await result.current.removeTrackFromPlaylist(id, '1');
      await result.current.renamePlaylist(id, 'Night Drive');
    });
    await expect(result.current.getPlaylistTracks(id).then(titles)).resolves.toEqual(['Two', 'Three']);
    expect(result.current.playlists[0]).toMatchObject({ name: 'Night Drive', track_count: 2 });

    await act(async () => {
      await result.current.deletePlaylist(id);
    });
    expect(result.current.playlists).toEqual([]);
  });

  it('skips songs that are missing from the device when opening a playlist', async () => {
    const { result } = await renderLibrary();
    let id;
    await act(async () => {
      id = await result.current.createPlaylist('Old', '');
      await result.current.addTracksToPlaylist(id, [result.current.tracks[0], { id: 'deleted-file', title: 'Gone' }]);
    });
    await expect(result.current.getPlaylistTracks(id).then(titles)).resolves.toEqual(['One']);
  });
});

describe('hidden music', () => {
  it('hides and unhides a single track', async () => {
    const { result } = await renderLibrary();
    await act(async () => {
      await result.current.hideTrack(result.current.tracks[1]);
    });
    expect(titles(result.current.tracks)).toEqual(['One', 'Three', 'Voice Note']);
    expect(titles(result.current.hiddenTracks)).toEqual(['Two']);
    expect(result.current.hiddenItems.map((h) => [h.kind, h.value])).toEqual([[HIDDEN_KIND.TRACK, '2']]);

    await act(async () => {
      await result.current.unhide(HIDDEN_KIND.TRACK, '2');
    });
    expect(result.current.tracks).toHaveLength(4);
    expect(result.current.hiddenItems).toEqual([]);
  });

  it('hides a folder including its sub-folders, and unhide-all restores it', async () => {
    const { result } = await renderLibrary();
    await act(async () => {
      await result.current.hideFolder({ path: '/Music', name: 'Music' });
    });
    expect(titles(result.current.tracks)).toEqual(['Voice Note']);
    expect(result.current.hiddenTracks).toHaveLength(3);

    await act(async () => {
      await result.current.unhideAll();
    });
    expect(result.current.tracks).toHaveLength(4);
  });

  it('keeps hidden music hidden after a restart', async () => {
    const first = await renderLibrary();
    await act(async () => {
      await first.result.current.hideTrack(first.result.current.tracks[3]);
    });
    first.unmount();
    const { result } = await renderLibrary();
    expect(titles(result.current.tracks)).toEqual(['One', 'Two', 'Three']);
  });
});

describe('listening history', () => {
  it('updates recently played and most played', async () => {
    const { result } = await renderLibrary();

    await act(async () => {
      await result.current.recordPlay('3', 190000, true);
      await tick();
      await result.current.recordPlay('3', 190000, true);
      await tick();
      await result.current.recordPlay('1', 200000, true);
      await tick();
      await result.current.recordPlay('2', 5000, false);
    });

    expect(titles(result.current.recentTracks)).toEqual(['Two', 'One', 'Three']);
    expect(titles(result.current.mostPlayedTracks)).toEqual(['Three', 'One']);
    expect(result.current.statsMap.get('3')).toMatchObject({ play_count: 2 });
  });
});

describe('online mode', () => {
  it('switches to online mode and fetches published songs from server', async () => {
    mockApiSongs.mockResolvedValueOnce({
      ok: true,
      data: {
        songs: [
          {
            id: 'admin-1',
            title: 'Cloud Song',
            artist: 'Server Artist',
            album: 'Online Album',
            category: 'Pop',
            url: 'https://api.kogilu.com/stream/1',
            durationMs: 180000,
          },
        ],
      },
    });

    const { result } = await renderLibrary();
    await act(async () => {
      await result.current.setAdminMode(true);
    });

    expect(result.current.adminMode).toBe(true);
    expect(await AsyncStorage.getItem(ADMIN_MODE_KEY)).toBe('1');
    expect(mockApiSongs).toHaveBeenCalledTimes(1);
    expect(titles(result.current.tracks)).toEqual(['Cloud Song']);
  });

  it('restores online mode choice across restarts and refreshes songs', async () => {
    mockApiSongs.mockResolvedValue({
      ok: true,
      data: {
        songs: [
          {
            id: 'admin-1',
            title: 'Cloud Song',
            artist: 'Server Artist',
            album: 'Online Album',
            category: 'Pop',
            url: 'https://api.kogilu.com/stream/1',
            durationMs: 180000,
          },
        ],
      },
    });

    await AsyncStorage.setItem(ADMIN_MODE_KEY, '1');
    const { result } = await renderLibrary();
    await waitFor(() => expect(result.current.adminMode).toBe(true));
    expect(mockApiSongs).toHaveBeenCalled();
  });
});
