/**
 * Backup & restore round trip against the real database schema, with the file system,
 * share sheet and document picker faked.
 */

const mockFiles = new Map();

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(async (uri, content) => {
    mockFiles.set(uri, content);
  }),
  readAsStringAsync: jest.fn(async (uri) => {
    if (!mockFiles.has(uri)) throw new Error(`ENOENT: ${uri}`);
    return mockFiles.get(uri);
  }),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

let backup;
let repos;
let DocumentPicker;
let Sharing;
let clock;

beforeEach(() => {
  jest.resetModules();
  mockFiles.clear();
  clock = Date.UTC(2026, 8, 13, 10, 30, 15);
  jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  backup = require('../../services/backup');
  repos = require('../../db/repositories');
  DocumentPicker = require('expo-document-picker');
  Sharing = require('expo-sharing');
});

afterEach(() => jest.restoreAllMocks());

const song = (id) => ({ id, title: `Song ${id}`, artist: 'Artist', path: `/Music/${id}.mp3` });

async function seed() {
  const mix = await repos.playlistsRepo.create('Mix', 'Everyday');
  const gym = await repos.playlistsRepo.create('Gym');
  await repos.playlistsRepo.addTracks(mix, [song('1'), song('2'), song('3')]);
  await repos.playlistsRepo.reorder(mix, ['3', '1', '2']);
  await repos.playlistsRepo.addTracks(gym, [song('4')]);
  await repos.favoritesRepo.add(song('2'));
  await repos.hiddenRepo.add(repos.HIDDEN_KIND.FOLDER, '/Recordings', 'Recordings');
  await repos.historyRepo.record('1', 180000, true);
  await repos.historyRepo.record('2', 5000, false);
  await repos.settingsRepo.setMany({ themeMode: 'dark', crossfadeSeconds: 3 });
  return { mix, gym };
}

async function snapshot() {
  const playlists = await repos.playlistsRepo.list();
  const tracks = {};
  for (const p of playlists) {
    // eslint-disable-next-line no-await-in-loop
    tracks[p.name] = await repos.playlistsRepo.trackIds(p.id);
  }
  return {
    playlists: playlists.map((p) => ({ id: p.id, name: p.name, description: p.description })),
    tracks,
    favorites: await repos.favoritesRepo.ids(),
    hidden: (await repos.hiddenRepo.all()).map((h) => [h.kind, h.value, h.label]),
    stats: (await repos.historyRepo.stats()).map((s) => [s.track_id, s.play_count, s.skip_count]),
    settings: await repos.settingsRepo.all(),
  };
}

describe('createBackup', () => {
  it('writes a signed JSON file with counts to the cache folder', async () => {
    await seed();
    const result = await backup.createBackup();

    expect(result.fileName).toMatch(/^minax-music-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
    expect(result.uri).toBe(`file:///cache/${result.fileName}`);
    expect(result.counts).toEqual({ playlists: 2, playlistTracks: 4, favorites: 1, hidden: 1 });

    const payload = JSON.parse(mockFiles.get(result.uri));
    expect(payload).toMatchObject({ signature: 'minax-music-backup', version: 1 });
    expect(payload.data.settings).toMatchObject({ themeMode: 'dark', crossfadeSeconds: 3 });
    expect(payload.data.history).toHaveLength(2);
  });

  it('backs up an empty library without failing', async () => {
    const result = await backup.createBackup();
    expect(result.counts).toEqual({ playlists: 0, playlistTracks: 0, favorites: 0, hidden: 0 });
  });
});

describe('pickAndRestoreBackup', () => {
  it('restores exactly what was backed up, replacing later changes', async () => {
    const { gym } = await seed();
    const before = await snapshot();
    const { uri } = await backup.createBackup();

    // Changes made after the backup must be discarded by the restore.
    await repos.playlistsRepo.remove(gym);
    await repos.favoritesRepo.add(song('99'));
    await repos.hiddenRepo.clear();
    await repos.settingsRepo.set('themeMode', 'light');
    expect(await snapshot()).not.toEqual(before);

    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ uri }] });
    const result = await backup.pickAndRestoreBackup();

    expect(result).toMatchObject({ ok: true, counts: { playlists: 2, favorites: 1 } });
    expect(await snapshot()).toEqual(before);
  });

  it('reports a cancelled picker and changes nothing', async () => {
    await seed();
    const before = await snapshot();
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: [] });
    await expect(backup.pickAndRestoreBackup()).resolves.toEqual({ ok: false, canceled: true });
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    ['a file that is not JSON', 'this is not json'],
    ['JSON from another app', JSON.stringify({ signature: 'something-else', data: {} })],
  ])('rejects %s without touching existing data', async (_label, content) => {
    await seed();
    const before = await snapshot();
    mockFiles.set('file:///picked.json', content);
    DocumentPicker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///picked.json' }] });
    await expect(backup.pickAndRestoreBackup()).resolves.toEqual({ ok: false, error: 'invalid' });
    expect(await snapshot()).toEqual(before);
  });
});

describe('shareBackup', () => {
  it('opens the share sheet when sharing is available', async () => {
    await expect(backup.shareBackup('file:///cache/b.json')).resolves.toBe(true);
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/b.json', expect.objectContaining({ mimeType: 'application/json' }));
  });

  it('returns false when the device cannot share', async () => {
    Sharing.isAvailableAsync.mockResolvedValue(false);
    await expect(backup.shareBackup('file:///cache/b.json')).resolves.toBe(false);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
