import * as MusicCore from '../../../modules/expo-music-core';
import {
  buildIndexes,
  getLibraryPermission,
  requestLibraryPermission,
  scanLibrary,
  searchLibrary,
  SORT_KEYS,
  sortTracks,
} from '../../services/musicLibrary';

jest.mock('../../../modules/expo-music-core', () => ({
  scanAudioAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  refreshMediaStoreAsync: jest.fn(),
}));

const track = (overrides) => ({
  id: '1',
  uri: 'file:///storage/Music/a.mp3',
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  albumId: '10',
  genre: 'Pop',
  fileName: 'a.mp3',
  folderPath: '/storage/Music',
  folderName: 'Music',
  duration: 1000,
  size: 100,
  year: 2020,
  trackNumber: 1,
  discNumber: 1,
  dateAdded: 1,
  searchKey: '',
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('scanLibrary', () => {
  it('passes the minimum length to the scanner', async () => {
    MusicCore.scanAudioAsync.mockResolvedValue([]);
    await scanLibrary({ minDurationMs: 30000 });
    expect(MusicCore.scanAudioAsync).toHaveBeenCalledWith({
      minDurationMs: 30000,
      includeAllFileTypes: true,
    });
  });

  it('normalises raw MediaStore records', async () => {
    MusicCore.scanAudioAsync.mockResolvedValue([
      {
        id: 5,
        title: 'Café del Mar',
        artist: 'Energy 52',
        album: 'Trance',
        genre: 'Electronic',
        fileName: 'cafe.mp3',
        folderPath: '/Music',
        duration: '215000',
        size: 'oops',
      },
    ]);
    const { tracks } = await scanLibrary();
    expect(tracks[0]).toMatchObject({
      id: '5',
      duration: 215000,
      size: 0,
      year: 0,
      trackNumber: 0,
      discNumber: 1,
      dateAdded: 0,
    });
    expect(tracks[0].searchKey).toContain('cafe del mar');
    expect(tracks[0].searchKey).toContain('energy 52');
  });

  it('moves hidden tracks out of the library', async () => {
    MusicCore.scanAudioAsync.mockResolvedValue([
      track({ id: '1', title: 'Keep' }),
      track({ id: '2', title: 'Hide me' }),
    ]);
    const result = await scanLibrary({ hiddenTrackIds: new Set(['2']) });
    expect(result.tracks.map((t) => t.title)).toEqual(['Keep']);
    expect(result.hiddenTracks.map((t) => t.title)).toEqual(['Hide me']);
    expect(result.albums[0].trackCount).toBe(1);
  });

  it('hides a folder and everything beneath it, but not look-alike siblings', async () => {
    MusicCore.scanAudioAsync.mockResolvedValue([
      track({ id: '1', folderPath: '/storage/Music' }),
      track({ id: '2', folderPath: '/storage/Music/Old' }),
      track({ id: '3', folderPath: '/storage/MusicVideos' }),
      track({ id: '4', folderPath: null }),
    ]);
    const result = await scanLibrary({ hiddenFolders: new Set(['/storage/Music']) });
    expect(result.tracks.map((t) => t.id)).toEqual(['3', '4']);
    expect(result.hiddenTracks.map((t) => t.id)).toEqual(['1', '2']);
  });
});

describe('buildIndexes', () => {
  it('returns empty lists for an empty library', () => {
    expect(buildIndexes([])).toEqual({ albums: [], artists: [], genres: [], folders: [] });
  });

  it('groups albums by id and sorts their tracks by disc then track number', () => {
    const { albums } = buildIndexes([
      track({ id: 'a', title: 'Third', trackNumber: 1, discNumber: 2, duration: 3000 }),
      track({ id: 'b', title: 'Second', trackNumber: 2, duration: 2000 }),
      track({ id: 'c', title: 'First', trackNumber: 1, duration: 1000 }),
    ]);
    expect(albums).toHaveLength(1);
    expect(albums[0]).toMatchObject({ name: 'Album', trackCount: 3, duration: 6000 });
    expect(albums[0].tracks.map((t) => t.title)).toEqual(['First', 'Second', 'Third']);
  });

  it('keeps same-named albums by different artists apart when there is no album id', () => {
    const { albums } = buildIndexes([
      track({ id: '1', album: 'Greatest Hits', artist: 'Queen', albumId: '0' }),
      track({ id: '2', album: 'Greatest Hits', artist: 'ABBA', albumId: null }),
      track({ id: '3', album: 'greatest hits', artist: 'queen', albumId: null }),
    ]);
    expect(albums).toHaveLength(2);
    expect(albums.map((a) => a.trackCount).sort()).toEqual([1, 2]);
  });

  it('builds artists with distinct album counts, sorted by name', () => {
    const { artists } = buildIndexes([
      track({ id: '1', artist: 'Zed', album: 'One' }),
      track({ id: '2', artist: 'Adele', album: '21', albumId: '1' }),
      track({ id: '3', artist: 'Adele', album: '25', albumId: '2' }),
      track({ id: '4', artist: 'Adele', album: '25', albumId: '2' }),
    ]);
    expect(artists.map((a) => a.name)).toEqual(['Adele', 'Zed']);
    expect(artists[0]).toMatchObject({ albumCount: 2, trackCount: 3 });
    expect(artists[0].albums.sort()).toEqual(['21', '25']);
  });

  it('orders genres by size and labels missing genres', () => {
    const { genres } = buildIndexes([
      track({ id: '1', genre: 'Rock' }),
      track({ id: '2', genre: 'Jazz' }),
      track({ id: '3', genre: 'Jazz' }),
      track({ id: '4', genre: '' }),
    ]);
    expect(genres.map((g) => [g.name, g.trackCount])).toEqual([
      ['Jazz', 2],
      ['Rock', 1],
      ['Unknown genre', 1],
    ]);
  });

  it('builds folders, using "/" when a track has no folder', () => {
    const { folders } = buildIndexes([
      track({ id: '1', folderPath: '/Music', folderName: 'Music' }),
      track({ id: '2', folderPath: '', folderName: '' }),
    ]);
    expect(folders.map((f) => f.path).sort()).toEqual(['/', '/Music']);
  });
});

describe('sortTracks', () => {
  const list = [
    track({ id: '1', title: 'Bravo', artist: 'Xena', duration: 300, dateAdded: 10, year: 2001, size: 5 }),
    track({ id: '2', title: 'alpha', artist: 'Adam', duration: 100, dateAdded: 30, year: 1999, size: 9 }),
    track({ id: '3', title: 'Charlie', artist: 'Adam', duration: 200, dateAdded: 20, year: 2001, size: 1 }),
  ];
  const ids = (tracks) => tracks.map((t) => t.id);

  it('sorts by title both ways', () => {
    expect(ids(sortTracks(list, SORT_KEYS.TITLE))).toEqual(['2', '1', '3']);
    expect(ids(sortTracks(list, SORT_KEYS.TITLE, false))).toEqual(['3', '1', '2']);
  });

  it('sorts by artist with title as tie-breaker', () => {
    expect(ids(sortTracks(list, SORT_KEYS.ARTIST))).toEqual(['2', '3', '1']);
  });

  it('sorts by duration, date added, year and size', () => {
    expect(ids(sortTracks(list, SORT_KEYS.DURATION))).toEqual(['2', '3', '1']);
    expect(ids(sortTracks(list, SORT_KEYS.DATE_ADDED, false))).toEqual(['2', '3', '1']);
    expect(ids(sortTracks(list, SORT_KEYS.YEAR))).toEqual(['2', '1', '3']);
    expect(ids(sortTracks(list, SORT_KEYS.SIZE))).toEqual(['3', '1', '2']);
  });

  it('sorts by play count from the stats map, unplayed last', () => {
    const stats = new Map([
      ['1', { play_count: 2 }],
      ['3', { play_count: 7 }],
    ]);
    expect(ids(sortTracks(list, SORT_KEYS.PLAY_COUNT, false, stats))).toEqual(['3', '1', '2']);
  });

  it('falls back to title for an unknown key and never mutates the input', () => {
    const before = ids(list);
    expect(ids(sortTracks(list, 'nonsense'))).toEqual(['2', '1', '3']);
    expect(ids(list)).toEqual(before);
  });
});

describe('searchLibrary', () => {
  const tracks = [
    track({ id: '1', title: 'Halo', artist: 'Beyoncé', album: 'I Am', albumId: '1', searchKey: 'halo beyonce i am pop a.mp3' }),
    track({ id: '2', title: 'Yellow', artist: 'Coldplay', album: 'Parachutes', albumId: '2', genre: 'Rock', searchKey: 'yellow coldplay parachutes rock b.mp3' }),
  ];
  const library = { tracks, ...buildIndexes(tracks) };

  it('returns nothing for an empty or blank term', () => {
    expect(searchLibrary(library, '')).toEqual({ tracks: [], albums: [], artists: [], genres: [], folders: [] });
    expect(searchLibrary(library, '   ').tracks).toEqual([]);
  });

  it('ignores case and accents', () => {
    const result = searchLibrary(library, 'BEYONCE');
    expect(result.tracks.map((t) => t.title)).toEqual(['Halo']);
    expect(result.artists.map((a) => a.name)).toEqual(['Beyoncé']);
  });

  it('matches albums, genres and folders', () => {
    expect(searchLibrary(library, 'parach').albums.map((a) => a.name)).toEqual(['Parachutes']);
    expect(searchLibrary(library, 'pop').genres.map((g) => g.name)).toEqual(['Pop']);
    expect(searchLibrary(library, 'music').folders.map((f) => f.name)).toEqual(['Music']);
  });

  it('caps track results at 200', () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      track({ id: String(i), title: `Song ${i}`, searchKey: `song ${i}` })
    );
    const result = searchLibrary({ tracks: many, ...buildIndexes(many) }, 'song');
    expect(result.tracks).toHaveLength(200);
  });
});

describe('library permission', () => {
  it('does not prompt again when access is already granted', async () => {
    MusicCore.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
    await expect(requestLibraryPermission()).resolves.toMatchObject({ granted: true });
    expect(MusicCore.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts when access has not been granted', async () => {
    MusicCore.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined' });
    MusicCore.requestPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
    await expect(requestLibraryPermission()).resolves.toMatchObject({ granted: true });
    expect(MusicCore.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('reads the current permission without prompting', async () => {
    MusicCore.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' });
    await expect(getLibraryPermission()).resolves.toMatchObject({ status: 'denied' });
    expect(MusicCore.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
