import * as MusicCore from '../../modules/expo-music-core';
import { normalizeForSearch } from '../utils/format';

/**
 * Turns the flat MediaStore track list into the browse structures the UI needs.
 *
 * Grouping happens once per scan (not per render) because a 5000-track library would
 * otherwise re-group on every keystroke in Search.
 */

export const SORT_KEYS = {
  TITLE: 'title',
  ARTIST: 'artist',
  ALBUM: 'album',
  DURATION: 'duration',
  DATE_ADDED: 'dateAdded',
  YEAR: 'year',
  SIZE: 'size',
  PLAY_COUNT: 'playCount',
  TRACK_NUMBER: 'trackNumber',
};

export async function requestLibraryPermission() {
  const current = await MusicCore.getPermissionsAsync();
  if (current.granted) return current;
  return MusicCore.requestPermissionsAsync();
}

export async function getLibraryPermission() {
  return MusicCore.getPermissionsAsync();
}

/**
 * @param {{ minDurationMs?: number, hiddenTrackIds?: Set<string>, hiddenFolders?: Set<string> }} options
 */
export async function scanLibrary({
  minDurationMs = 0,
  hiddenTrackIds = new Set(),
  hiddenFolders = new Set(),
} = {}) {
  const raw = await MusicCore.scanAudioAsync({ minDurationMs, includeAllFileTypes: true });

  const tracks = [];
  const hiddenTracks = [];

  for (const item of raw) {
    const track = decorate(item);
    const isHidden =
      hiddenTrackIds.has(track.id) || isInsideHiddenFolder(track.folderPath, hiddenFolders);
    if (isHidden) {
      hiddenTracks.push(track);
    } else {
      tracks.push(track);
    }
  }

  return { tracks, hiddenTracks, ...buildIndexes(tracks) };
}

function isInsideHiddenFolder(folderPath, hiddenFolders) {
  if (!folderPath || hiddenFolders.size === 0) return false;
  if (hiddenFolders.has(folderPath)) return true;
  // A hidden parent hides everything beneath it.
  for (const hidden of hiddenFolders) {
    if (folderPath.startsWith(`${hidden}/`)) return true;
  }
  return false;
}

function decorate(item) {
  return {
    ...item,
    id: String(item.id),
    duration: Number(item.duration) || 0,
    size: Number(item.size) || 0,
    year: Number(item.year) || 0,
    trackNumber: Number(item.trackNumber) || 0,
    discNumber: Number(item.discNumber) || 1,
    dateAdded: Number(item.dateAdded) || 0,
    searchKey: normalizeForSearch(
      `${item.title} ${item.artist} ${item.album} ${item.genre} ${item.fileName}`
    ),
  };
}

export function buildIndexes(tracks) {
  const albumMap = new Map();
  const artistMap = new Map();
  const genreMap = new Map();
  const folderMap = new Map();

  for (const track of tracks) {
    // Albums are keyed by MediaStore album id, falling back to name+artist for files
    // that carry no album id at all.
    const albumKey = track.albumId && track.albumId !== '0'
      ? `id:${track.albumId}`
      : `name:${normalizeForSearch(track.album)}|${normalizeForSearch(track.artist)}`;
    push(albumMap, albumKey, track, () => ({
      id: albumKey,
      albumId: track.albumId,
      name: track.album,
      artist: track.artist,
      artworkUri: track.artworkUri,
      year: track.year,
      tracks: [],
    }));

    const artistKey = normalizeForSearch(track.artist);
    push(artistMap, artistKey, track, () => ({
      id: artistKey,
      name: track.artist,
      artworkUri: track.artworkUri,
      albums: new Set(),
      tracks: [],
    }));
    artistMap.get(artistKey).albums.add(track.album);

    const genreKey = normalizeForSearch(track.genre || 'Unknown genre');
    push(genreMap, genreKey, track, () => ({
      id: genreKey,
      name: track.genre || 'Unknown genre',
      artworkUri: track.artworkUri,
      tracks: [],
    }));

    const folderKey = track.folderPath || '/';
    push(folderMap, folderKey, track, () => ({
      id: folderKey,
      name: track.folderName || folderKey,
      path: folderKey,
      tracks: [],
    }));
  }

  const albums = [...albumMap.values()]
    .map((album) => ({
      ...album,
      trackCount: album.tracks.length,
      duration: album.tracks.reduce((sum, t) => sum + t.duration, 0),
      tracks: album.tracks.sort(byTrackNumber),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const artists = [...artistMap.values()]
    .map((artist) => ({
      ...artist,
      albumCount: artist.albums.size,
      albums: [...artist.albums],
      trackCount: artist.tracks.length,
      duration: artist.tracks.reduce((sum, t) => sum + t.duration, 0),
      tracks: artist.tracks.sort(byAlbumThenTrack),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const genres = [...genreMap.values()]
    .map((genre) => ({ ...genre, trackCount: genre.tracks.length }))
    .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name));

  const folders = [...folderMap.values()]
    .map((folder) => ({ ...folder, trackCount: folder.tracks.length }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { albums, artists, genres, folders };
}

function push(map, key, track, factory) {
  if (!map.has(key)) map.set(key, factory());
  map.get(key).tracks.push(track);
}

function byTrackNumber(a, b) {
  if (a.discNumber !== b.discNumber) return a.discNumber - b.discNumber;
  if (a.trackNumber !== b.trackNumber) return a.trackNumber - b.trackNumber;
  return a.title.localeCompare(b.title);
}

function byAlbumThenTrack(a, b) {
  const albumCompare = a.album.localeCompare(b.album);
  return albumCompare !== 0 ? albumCompare : byTrackNumber(a, b);
}

/**
 * @param {Array} tracks
 * @param {string} key one of SORT_KEYS
 * @param {boolean} ascending
 * @param {Map<string, {play_count: number}>} [stats] required only for PLAY_COUNT
 */
export function sortTracks(tracks, key, ascending = true, stats) {
  const direction = ascending ? 1 : -1;
  const sorted = [...tracks].sort((a, b) => {
    switch (key) {
      case SORT_KEYS.ARTIST:
        return a.artist.localeCompare(b.artist) * direction || a.title.localeCompare(b.title);
      case SORT_KEYS.ALBUM:
        return a.album.localeCompare(b.album) * direction || byTrackNumber(a, b);
      case SORT_KEYS.DURATION:
        return (a.duration - b.duration) * direction;
      case SORT_KEYS.DATE_ADDED:
        return (a.dateAdded - b.dateAdded) * direction;
      case SORT_KEYS.YEAR:
        return (a.year - b.year) * direction || a.title.localeCompare(b.title);
      case SORT_KEYS.SIZE:
        return (a.size - b.size) * direction;
      case SORT_KEYS.TRACK_NUMBER:
        return byTrackNumber(a, b) * direction;
      case SORT_KEYS.PLAY_COUNT: {
        const aCount = stats?.get(a.id)?.play_count ?? 0;
        const bCount = stats?.get(b.id)?.play_count ?? 0;
        return (aCount - bCount) * direction || a.title.localeCompare(b.title);
      }
      case SORT_KEYS.TITLE:
      default:
        return a.title.localeCompare(b.title) * direction;
    }
  });
  return sorted;
}

/** Filters the whole library across titles, artists, albums, genres and file names. */
export function searchLibrary({ tracks, albums, artists, genres, folders }, term) {
  const needle = normalizeForSearch(term).trim();
  if (needle.length === 0) {
    return { tracks: [], albums: [], artists: [], genres: [], folders: [] };
  }

  const matches = (value) => normalizeForSearch(value).includes(needle);

  return {
    tracks: tracks.filter((track) => track.searchKey.includes(needle)).slice(0, 200),
    albums: albums.filter((album) => matches(album.name) || matches(album.artist)).slice(0, 40),
    artists: artists.filter((artist) => matches(artist.name)).slice(0, 40),
    genres: genres.filter((genre) => matches(genre.name)).slice(0, 20),
    folders: folders.filter((folder) => matches(folder.name)).slice(0, 20),
  };
}

/** Asks Android to re-index storage, used by Settings > Refresh music library. */
export async function refreshMediaStore() {
  return MusicCore.refreshMediaStoreAsync([]);
}
