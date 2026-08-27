import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as MusicCore from '../../modules/expo-music-core';
import {
  favoritesRepo,
  HIDDEN_KIND,
  hiddenRepo,
  historyRepo,
  playlistsRepo,
} from '../db/repositories';
import { api } from '../services/api';
import {
  adminSongsToLibrary,
  buildIndexes,
  getLibraryPermission,
  requestLibraryPermission,
  scanLibrary,
} from '../services/musicLibrary';
import { useSettings } from './SettingsContext';

const LibraryContext = createContext(null);

const EMPTY_LIBRARY = {
  tracks: [],
  hiddenTracks: [],
  albums: [],
  artists: [],
  genres: [],
  folders: [],
};

/**
 * Single source of truth for "what music exists".
 *
 * Owns the MediaStore scan plus the user-owned overlays (favourites, playlists, hidden items,
 * play counts) and re-derives the browse indexes whenever any of them change.
 */
export function LibraryProvider({ children }) {
  const { minDurationMs, settings } = useSettings();

  const [permission, setPermission] = useState('undetermined');
  const [scanning, setScanning] = useState(false);
  const [initialised, setInitialised] = useState(false);
  const [library, setLibrary] = useState(EMPTY_LIBRARY);

  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [playlists, setPlaylists] = useState([]);
  const [hiddenItems, setHiddenItems] = useState([]);
  const [recentIds, setRecentIds] = useState([]);
  const [statsMap, setStatsMap] = useState(() => new Map());

  // Admin songs mode: the panel's catalogue replaces the device's own while it is on.
  const [adminMode, setAdminModeState] = useState(false);
  const [adminLibrary, setAdminLibrary] = useState(EMPTY_LIBRARY);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  const scanInFlight = useRef(false);
  const refreshDebounce = useRef(null);

  /**
   * What the rest of the app treats as "the library".
   *
   * Swapping it here rather than in each screen means Home, Library, Search and every browse
   * list follow the switch without knowing the mode exists.
   */
  const activeLibrary = adminMode ? adminLibrary : library;

  const trackById = useMemo(() => {
    const map = new Map();
    for (const track of activeLibrary.tracks) map.set(track.id, track);
    return map;
  }, [activeLibrary.tracks]);

  const hiddenTrackById = useMemo(() => {
    const map = new Map();
    for (const track of library.hiddenTracks) map.set(track.id, track);
    return map;
  }, [library.hiddenTracks]);

  const resolveTracks = useCallback(
    (ids) => ids.map((id) => trackById.get(String(id))).filter(Boolean),
    [trackById]
  );

  // ------------------------------------------------------------------ loading

  const loadOverlays = useCallback(async () => {
    const [favIds, lists, hidden, recents, stats] = await Promise.all([
      favoritesRepo.ids().catch(() => []),
      playlistsRepo.list().catch(() => []),
      hiddenRepo.all().catch(() => []),
      historyRepo.recentTrackIds(150).catch(() => []),
      historyRepo.statsMap().catch(() => new Map()),
    ]);
    setFavoriteIds(new Set(favIds));
    setPlaylists(lists);
    setHiddenItems(hidden);
    setRecentIds(recents);
    setStatsMap(stats);
    return hidden;
  }, []);

  const runScan = useCallback(
    async (hiddenOverride) => {
      if (scanInFlight.current) return;
      scanInFlight.current = true;
      setScanning(true);
      try {
        const hidden = hiddenOverride ?? (await hiddenRepo.all().catch(() => []));
        const hiddenTrackIds = new Set(
          hidden.filter((h) => h.kind === HIDDEN_KIND.TRACK).map((h) => h.value)
        );
        const hiddenFolders = new Set(
          hidden.filter((h) => h.kind === HIDDEN_KIND.FOLDER).map((h) => h.value)
        );
        const result = await scanLibrary({ minDurationMs, hiddenTrackIds, hiddenFolders });
        setLibrary(result);
      } catch {
        setLibrary(EMPTY_LIBRARY);
      } finally {
        scanInFlight.current = false;
        setScanning(false);
        setInitialised(true);
      }
    },
    [minDurationMs]
  );

  const initialise = useCallback(async () => {
    const current = await getLibraryPermission().catch(() => ({ status: 'denied', granted: false }));
    setPermission(current.granted ? 'granted' : current.status);
    const hidden = await loadOverlays();
    if (current.granted) {
      await runScan(hidden);
    } else {
      setInitialised(true);
    }
  }, [loadOverlays, runScan]);

  useEffect(() => {
    initialise();
    // Intentionally runs once — later rescans go through refresh()/requestPermission().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-scan when the "ignore short tracks" threshold changes.
  useEffect(() => {
    if (!initialised || permission !== 'granted') return;
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDurationMs]);

  // Auto-refresh when Android reports the media store changed (file copied, deleted, …).
  useEffect(() => {
    if (!settings.autoRefreshLibrary || permission !== 'granted') return undefined;
    const subscription = MusicCore.addMediaLibraryChangeListener(() => {
      clearTimeout(refreshDebounce.current);
      // MediaStore fires a burst of notifications per file; coalesce them.
      refreshDebounce.current = setTimeout(() => runScan(), 2500);
    });
    return () => {
      clearTimeout(refreshDebounce.current);
      subscription.remove();
    };
  }, [settings.autoRefreshLibrary, permission, runScan]);

  const requestPermission = useCallback(async () => {
    const response = await requestLibraryPermission();
    setPermission(response.granted ? 'granted' : response.status);
    if (response.granted) await runScan();
    return response.granted;
  }, [runScan]);

  const refresh = useCallback(
    async ({ rescanMediaStore = false } = {}) => {
      if (rescanMediaStore) {
        await MusicCore.refreshMediaStoreAsync([]).catch(() => {});
      }
      const hidden = await loadOverlays();
      await runScan(hidden);
      return library.tracks.length;
    },
    [loadOverlays, runScan, library.tracks.length]
  );

  // ------------------------------------------------------------------ admin songs

  const ADMIN_MODE_KEY = 'minax.library.adminMode';

  /** Pulls the panel's published catalogue. Safe to call when the mode is off. */
  const refreshAdminSongs = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await api.songs();

      // `api` never throws — a dead server, a timeout or a 401 all come back as
      // `{ ok: false }`. Without this check every one of those reads as "the panel has
      // published nothing", which is the wrong thing to tell the user and hides the cause.
      if (!response.ok) {
        setAdminError(
          response.offline
            ? 'Could not reach the admin panel. Check the server URL in Settings → Server.'
            : (response.error ?? 'The admin panel refused the request.')
        );
        return -1;
      }

      // The payload is the envelope's `data`, not the envelope itself.
      const songs = Array.isArray(response.data?.songs) ? response.data.songs : [];
      setAdminLibrary(adminSongsToLibrary(songs));
      return songs.length;
    } catch (error) {
      // The catalogue lives on the admin panel, so this fails whenever the phone cannot
      // reach it. Keep whatever was fetched last rather than blanking the screen.
      setAdminError(error?.message ?? 'Could not reach the admin panel.');
      return -1;
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const setAdminMode = useCallback(
    async (enabled) => {
      setAdminModeState(enabled);
      await AsyncStorage.setItem(ADMIN_MODE_KEY, enabled ? '1' : '0').catch(() => {});
      if (enabled) await refreshAdminSongs();
    },
    [refreshAdminSongs]
  );

  // Restore the mode across restarts, and fetch once if it was left on.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ADMIN_MODE_KEY)
      .then((stored) => {
        if (cancelled || stored !== '1') return;
        setAdminModeState(true);
        return refreshAdminSongs();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshAdminSongs]);

  // ------------------------------------------------------------------ favourites

  const isFavorite = useCallback((trackId) => favoriteIds.has(String(trackId)), [favoriteIds]);

  const toggleFavorite = useCallback(async (track) => {
    const added = await favoritesRepo.toggle(track);
    setFavoriteIds((previous) => {
      const next = new Set(previous);
      if (added) next.add(String(track.id));
      else next.delete(String(track.id));
      return next;
    });
    return added;
  }, []);

  const favoriteTracks = useMemo(() => {
    const ordered = [];
    for (const id of favoriteIds) {
      const track = trackById.get(id);
      if (track) ordered.push(track);
    }
    return ordered;
  }, [favoriteIds, trackById]);

  // ------------------------------------------------------------------ playlists

  const reloadPlaylists = useCallback(async () => {
    setPlaylists(await playlistsRepo.list().catch(() => []));
  }, []);

  const createPlaylist = useCallback(
    async (name, description) => {
      const id = await playlistsRepo.create(name, description);
      await reloadPlaylists();
      return id;
    },
    [reloadPlaylists]
  );

  const addTracksToPlaylist = useCallback(
    async (playlistId, tracks) => {
      const inserted = await playlistsRepo.addTracks(playlistId, tracks);
      await reloadPlaylists();
      return inserted;
    },
    [reloadPlaylists]
  );

  const removeTrackFromPlaylist = useCallback(
    async (playlistId, trackId) => {
      await playlistsRepo.removeTrack(playlistId, trackId);
      await reloadPlaylists();
    },
    [reloadPlaylists]
  );

  const renamePlaylist = useCallback(
    async (playlistId, name) => {
      await playlistsRepo.rename(playlistId, name);
      await reloadPlaylists();
    },
    [reloadPlaylists]
  );

  const deletePlaylist = useCallback(
    async (playlistId) => {
      await playlistsRepo.remove(playlistId);
      await reloadPlaylists();
    },
    [reloadPlaylists]
  );

  const reorderPlaylist = useCallback(
    async (playlistId, orderedIds) => {
      await playlistsRepo.reorder(playlistId, orderedIds);
      await reloadPlaylists();
    },
    [reloadPlaylists]
  );

  /** Resolves a playlist's stored track ids against the live library. */
  const getPlaylistTracks = useCallback(
    async (playlistId) => {
      const entries = await playlistsRepo.entries(playlistId);
      return entries
        .map((entry) => trackById.get(entry.track_id))
        .filter(Boolean);
    },
    [trackById]
  );

  // ------------------------------------------------------------------ hidden music

  const hideTrack = useCallback(
    async (track) => {
      await hiddenRepo.add(HIDDEN_KIND.TRACK, track.id, track.title);
      const hidden = await hiddenRepo.all();
      setHiddenItems(hidden);
      await runScan(hidden);
    },
    [runScan]
  );

  const hideFolder = useCallback(
    async (folder) => {
      await hiddenRepo.add(HIDDEN_KIND.FOLDER, folder.path, folder.name);
      const hidden = await hiddenRepo.all();
      setHiddenItems(hidden);
      await runScan(hidden);
    },
    [runScan]
  );

  const unhide = useCallback(
    async (kind, value) => {
      await hiddenRepo.remove(kind, value);
      const hidden = await hiddenRepo.all();
      setHiddenItems(hidden);
      await runScan(hidden);
    },
    [runScan]
  );

  const unhideAll = useCallback(async () => {
    await hiddenRepo.clear();
    setHiddenItems([]);
    await runScan([]);
  }, [runScan]);

  // ------------------------------------------------------------------ history

  const recordPlay = useCallback(async (trackId, listenedMs, completed) => {
    await historyRepo.record(trackId, listenedMs, completed).catch(() => {});
    const [recents, stats] = await Promise.all([
      historyRepo.recentTrackIds(150).catch(() => []),
      historyRepo.statsMap().catch(() => new Map()),
    ]);
    setRecentIds(recents);
    setStatsMap(stats);
  }, []);

  const recentTracks = useMemo(() => resolveTracks(recentIds), [recentIds, resolveTracks]);

  const mostPlayedTracks = useMemo(() => {
    const scored = [...statsMap.entries()]
      .filter(([, stat]) => stat.play_count > 0)
      .sort((a, b) => b[1].play_count - a[1].play_count)
      .map(([id]) => id);
    return resolveTracks(scored).slice(0, 50);
  }, [statsMap, resolveTracks]);

  const recentlyAddedTracks = useMemo(
    () => [...activeLibrary.tracks].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 50),
    [activeLibrary.tracks]
  );

  const value = useMemo(
    () => ({
      // state
      permission,
      scanning,
      initialised,
      ...activeLibrary,
      trackById,
      hiddenTrackById,
      statsMap,
      playlists,
      hiddenItems,

      // derived collections
      favoriteTracks,
      recentTracks,
      mostPlayedTracks,
      recentlyAddedTracks,

      // admin songs mode
      adminMode,
      setAdminMode,
      adminLoading,
      adminError,
      refreshAdminSongs,

      // actions
      requestPermission,
      refresh,
      resolveTracks,
      isFavorite,
      toggleFavorite,
      createPlaylist,
      addTracksToPlaylist,
      removeTrackFromPlaylist,
      renamePlaylist,
      deletePlaylist,
      reorderPlaylist,
      getPlaylistTracks,
      reloadPlaylists,
      hideTrack,
      hideFolder,
      unhide,
      unhideAll,
      recordPlay,
      rebuildIndexes: buildIndexes,
    }),
    [
      permission,
      scanning,
      initialised,
      activeLibrary,
      adminMode,
      setAdminMode,
      adminLoading,
      adminError,
      refreshAdminSongs,
      trackById,
      hiddenTrackById,
      statsMap,
      playlists,
      hiddenItems,
      favoriteTracks,
      recentTracks,
      mostPlayedTracks,
      recentlyAddedTracks,
      requestPermission,
      refresh,
      resolveTracks,
      isFavorite,
      toggleFavorite,
      createPlaylist,
      addTracksToPlaylist,
      removeTrackFromPlaylist,
      renamePlaylist,
      deletePlaylist,
      reorderPlaylist,
      getPlaylistTracks,
      reloadPlaylists,
      hideTrack,
      hideFolder,
      unhide,
      unhideAll,
      recordPlay,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  return context;
}
