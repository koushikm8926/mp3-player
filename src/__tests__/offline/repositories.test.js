/**
 * Runs the real repositories against an in-memory SQLite database (see helpers/sqliteMock).
 * Modules are reloaded per test so every test starts from an empty, freshly migrated database.
 */

let repos;
let database;
let clock;

beforeEach(() => {
  jest.resetModules();
  clock = 1_700_000_000_000;
  // Deterministic, strictly increasing timestamps so "most recent first" orderings are stable.
  jest.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  database = require('../../db/database');
  repos = require('../../db/repositories');
});

afterEach(() => jest.restoreAllMocks());

const song = (id, extra = {}) => ({ id, title: `Song ${id}`, artist: 'Artist', path: `/Music/${id}.mp3`, ...extra });

describe('database', () => {
  it('opens once and creates every table', async () => {
    const db = await database.getDatabase();
    expect(await database.getDatabase()).toBe(db);
    const tables = (await db.getAllAsync("SELECT name FROM sqlite_master WHERE type = 'table'")).map((r) => r.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'playlists',
        'playlist_tracks',
        'favorites',
        'hidden_items',
        'play_history',
        'track_stats',
        'settings',
        'queue_state',
        'search_history',
        'pending_events',
      ])
    );
    expect((await db.getFirstAsync('PRAGMA user_version;')).user_version).toBe(1);
  });

  it('resetUserData wipes user data but keeps settings', async () => {
    await repos.favoritesRepo.add(song('1'));
    await repos.playlistsRepo.create('Mix');
    await repos.settingsRepo.set('themeMode', 'dark');
    await database.resetUserData();
    expect(await repos.favoritesRepo.ids()).toEqual([]);
    expect(await repos.playlistsRepo.list()).toEqual([]);
    expect(await repos.settingsRepo.all()).toEqual({ themeMode: 'dark' });
  });
});

describe('playlistsRepo', () => {
  it('creates a playlist with a trimmed name and no tracks', async () => {
    const id = await repos.playlistsRepo.create('  Road Trip  ', 'Summer');
    const [row] = await repos.playlistsRepo.list();
    expect(row).toMatchObject({ id, name: 'Road Trip', description: 'Summer', track_count: 0 });
    expect(await repos.playlistsRepo.get(id)).toMatchObject({ name: 'Road Trip' });
  });

  it('treats names case-insensitively and rejects duplicates', async () => {
    await repos.playlistsRepo.create('Chill');
    expect(await repos.playlistsRepo.exists(' chill ')).toBe(true);
    expect(await repos.playlistsRepo.exists('Party')).toBe(false);
    await expect(repos.playlistsRepo.create('CHILL')).rejects.toThrow();
  });

  it('appends tracks in order and skips ones already in the playlist', async () => {
    const id = await repos.playlistsRepo.create('Mix');
    expect(await repos.playlistsRepo.addTracks(id, [])).toBe(0);
    expect(await repos.playlistsRepo.addTracks(id, [song('1'), song('2')])).toBe(2);
    expect(await repos.playlistsRepo.addTracks(id, [song('2'), song('3')])).toBe(1);
    expect(await repos.playlistsRepo.trackIds(id)).toEqual(['1', '2', '3']);
    const entries = await repos.playlistsRepo.entries(id);
    expect(entries.map((e) => e.position)).toEqual([0, 1, 2]);
    expect(entries[0]).toMatchObject({ title: 'Song 1', artist: 'Artist', path: '/Music/1.mp3' });
    expect((await repos.playlistsRepo.list())[0].track_count).toBe(3);
  });

  it('removes and reorders tracks', async () => {
    const id = await repos.playlistsRepo.create('Mix');
    await repos.playlistsRepo.addTracks(id, [song('1'), song('2'), song('3')]);
    await repos.playlistsRepo.removeTrack(id, 2);
    expect(await repos.playlistsRepo.trackIds(id)).toEqual(['1', '3']);
    await repos.playlistsRepo.reorder(id, ['3', '1']);
    expect(await repos.playlistsRepo.trackIds(id)).toEqual(['3', '1']);
  });

  it('renames, lists most recently changed first, and deletes with its tracks', async () => {
    const a = await repos.playlistsRepo.create('A');
    const b = await repos.playlistsRepo.create('B');
    expect((await repos.playlistsRepo.list()).map((p) => p.id)).toEqual([b, a]);
    await repos.playlistsRepo.addTracks(a, [song('1')]);
    expect((await repos.playlistsRepo.list()).map((p) => p.id)).toEqual([a, b]);

    await repos.playlistsRepo.rename(a, ' Renamed ');
    expect((await repos.playlistsRepo.get(a)).name).toBe('Renamed');

    await repos.playlistsRepo.remove(a);
    expect(await repos.playlistsRepo.get(a)).toBeNull();
    expect(await repos.playlistsRepo.entries(a)).toEqual([]);
  });
});

describe('favoritesRepo', () => {
  it('toggles a favourite on and off', async () => {
    expect(await repos.favoritesRepo.toggle(song('7'))).toBe(true);
    expect(await repos.favoritesRepo.ids()).toEqual(['7']);
    expect(await repos.favoritesRepo.toggle(song('7'))).toBe(false);
    expect(await repos.favoritesRepo.ids()).toEqual([]);
  });

  it('lists newest first and keeps readable metadata', async () => {
    await repos.favoritesRepo.add(song('1'));
    await repos.favoritesRepo.add(song('2'));
    expect(await repos.favoritesRepo.ids()).toEqual(['2', '1']);
    expect((await repos.favoritesRepo.all())[1]).toMatchObject({ track_id: '1', title: 'Song 1' });
    await repos.favoritesRepo.remove(2);
    expect(await repos.favoritesRepo.ids()).toEqual(['1']);
  });
});

describe('hiddenRepo', () => {
  it('adds tracks and folders once, removes and clears them', async () => {
    const { HIDDEN_KIND } = repos;
    await repos.hiddenRepo.add(HIDDEN_KIND.TRACK, 12, 'Voice memo');
    await repos.hiddenRepo.add(HIDDEN_KIND.TRACK, '12', 'Voice memo');
    await repos.hiddenRepo.add(HIDDEN_KIND.FOLDER, '/WhatsApp/Audio', 'Audio');
    const all = await repos.hiddenRepo.all();
    expect(all).toHaveLength(2);
    expect(all.map((h) => [h.kind, h.value])).toEqual([
      ['folder', '/WhatsApp/Audio'],
      ['track', '12'],
    ]);

    await repos.hiddenRepo.remove(HIDDEN_KIND.TRACK, 12);
    expect((await repos.hiddenRepo.all()).map((h) => h.kind)).toEqual(['folder']);
    await repos.hiddenRepo.clear();
    expect(await repos.hiddenRepo.all()).toEqual([]);
  });
});

describe('historyRepo', () => {
  it('counts completed plays and skips separately', async () => {
    await repos.historyRepo.record('1', 1234.6, true);
    await repos.historyRepo.record('1', 5000, false);
    await repos.historyRepo.record('1', 1000, true);
    const [stat] = await repos.historyRepo.stats();
    expect(stat).toMatchObject({ track_id: '1', play_count: 2, skip_count: 1, total_ms: 7235 });
  });

  it('lists recent tracks once each, most recent first', async () => {
    await repos.historyRepo.record('1', 1000, true);
    await repos.historyRepo.record('2', 1000, true);
    await repos.historyRepo.record('1', 1000, true);
    expect(await repos.historyRepo.recentTrackIds()).toEqual(['1', '2']);
    expect(await repos.historyRepo.recentTrackIds(1)).toEqual(['1']);
  });

  it('ranks most played and leaves out tracks that were only skipped', async () => {
    await repos.historyRepo.record('a', 1000, true);
    await repos.historyRepo.record('b', 1000, true);
    await repos.historyRepo.record('b', 1000, true);
    await repos.historyRepo.record('c', 1000, false);
    expect(await repos.historyRepo.mostPlayedIds()).toEqual(['b', 'a']);
    const map = await repos.historyRepo.statsMap();
    expect(map.get('c')).toMatchObject({ play_count: 0, skip_count: 1 });
  });

  it('summarises listening and can be cleared', async () => {
    await repos.historyRepo.record('a', 60000, true);
    await repos.historyRepo.record('b', 30000, false);
    expect(await repos.historyRepo.summary()).toEqual({ listens: 2, totalMs: 90000, uniqueTracks: 2 });
    await repos.historyRepo.clear();
    expect(await repos.historyRepo.summary()).toEqual({ listens: 0, totalMs: 0, uniqueTracks: 0 });
    expect(await repos.historyRepo.stats()).toEqual([]);
  });

  it('keeps raw history bounded to the latest 1000 listens', async () => {
    for (let i = 0; i < 1005; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await repos.historyRepo.record(String(i % 3), 1, true);
    }
    expect((await repos.historyRepo.summary()).listens).toBe(1000);
    const total = [...(await repos.historyRepo.statsMap()).values()].reduce((n, s) => n + s.play_count, 0);
    expect(total).toBe(1005);
  });
});

describe('settingsRepo', () => {
  it('round-trips JSON values', async () => {
    await repos.settingsRepo.set('crossfadeSeconds', 4);
    await repos.settingsRepo.set('gaplessPlayback', false);
    await repos.settingsRepo.set('equalizerBands', [100, -200]);
    await repos.settingsRepo.set('language', null);
    expect(await repos.settingsRepo.all()).toEqual({
      crossfadeSeconds: 4,
      gaplessPlayback: false,
      equalizerBands: [100, -200],
      language: null,
    });
  });

  it('writes several values at once and overwrites existing ones', async () => {
    await repos.settingsRepo.set('themeMode', 'light');
    await repos.settingsRepo.setMany({ themeMode: 'dark', accentColor: 'teal' });
    expect(await repos.settingsRepo.all()).toEqual({ themeMode: 'dark', accentColor: 'teal' });
  });

  it('keeps a value that is not valid JSON as plain text', async () => {
    const db = await database.getDatabase();
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('legacy', 'not json')");
    expect((await repos.settingsRepo.all()).legacy).toBe('not json');
  });
});

describe('queueRepo', () => {
  it('returns null until a queue is saved', async () => {
    expect(await repos.queueRepo.load()).toBeNull();
  });

  it('saves and restores the last queue, keeping a single row', async () => {
    await repos.queueRepo.save(['1', '2'], 0, 10);
    await repos.queueRepo.save(['3', '4', '5'], 2, 42123.7);
    expect(await repos.queueRepo.load()).toEqual({ trackIds: ['3', '4', '5'], currentIndex: 2, positionMs: 42124 });
    const db = await database.getDatabase();
    expect((await db.getFirstAsync('SELECT COUNT(*) AS n FROM queue_state')).n).toBe(1);
  });

  it('ignores a corrupted saved queue', async () => {
    const db = await database.getDatabase();
    await db.runAsync("INSERT INTO queue_state (id, track_ids) VALUES (1, '{broken')");
    expect(await repos.queueRepo.load()).toBeNull();
  });
});

describe('searchRepo', () => {
  it('records trimmed terms, ignores very short ones, and lists newest first', async () => {
    await repos.searchRepo.record(' a ');
    await repos.searchRepo.record('  arijit ');
    await repos.searchRepo.record('lofi');
    await repos.searchRepo.record('arijit');
    expect(await repos.searchRepo.recent()).toEqual(['arijit', 'lofi']);
    expect(await repos.searchRepo.recent(1)).toEqual(['arijit']);
    await repos.searchRepo.clear();
    expect(await repos.searchRepo.recent()).toEqual([]);
  });
});

describe('outboxRepo (events buffered while offline)', () => {
  it('queues events in order, parses payloads and drops sent ones', async () => {
    await repos.outboxRepo.enqueue('play', { trackId: '1' });
    await repos.outboxRepo.enqueue('skip', { trackId: '2' });
    const pending = await repos.outboxRepo.peek();
    expect(pending.map((e) => [e.type, e.payload])).toEqual([
      ['play', { trackId: '1' }],
      ['skip', { trackId: '2' }],
    ]);
    await repos.outboxRepo.drop([pending[0].id]);
    await repos.outboxRepo.drop([]);
    expect((await repos.outboxRepo.peek()).map((e) => e.type)).toEqual(['skip']);
  });
});
