import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'minax_music.db';
const SCHEMA_VERSION = 1;

let databasePromise = null;

/**
 * Opens (once) and migrates the local database.
 *
 * Everything the app owns lives here: playlists, favourites, hidden items, listening history
 * and key/value settings. The music files themselves are never copied — only MediaStore ids
 * plus enough denormalised metadata to render a row if a file temporarily disappears.
 */
export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    });
  }
  return databasePromise;
}

async function migrate(db) {
  const row = await db.getFirstAsync('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS playlists (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      description  TEXT    NOT NULL DEFAULT '',
      cover_uri    TEXT,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_name ON playlists (name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id  INTEGER NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
      track_id     TEXT    NOT NULL,
      position     INTEGER NOT NULL,
      added_at     INTEGER NOT NULL,
      title        TEXT    NOT NULL DEFAULT '',
      artist       TEXT    NOT NULL DEFAULT '',
      path         TEXT    NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist
      ON playlist_tracks (playlist_id, position);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_tracks_unique
      ON playlist_tracks (playlist_id, track_id);

    CREATE TABLE IF NOT EXISTS favorites (
      track_id   TEXT PRIMARY KEY,
      added_at   INTEGER NOT NULL,
      title      TEXT NOT NULL DEFAULT '',
      artist     TEXT NOT NULL DEFAULT '',
      path       TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS hidden_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      kind       TEXT NOT NULL,
      value      TEXT NOT NULL,
      label      TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hidden_unique ON hidden_items (kind, value);

    CREATE TABLE IF NOT EXISTS play_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id   TEXT    NOT NULL,
      played_at  INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      completed  INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_history_played_at ON play_history (played_at DESC);
    CREATE INDEX IF NOT EXISTS idx_history_track ON play_history (track_id);

    CREATE TABLE IF NOT EXISTS track_stats (
      track_id     TEXT PRIMARY KEY,
      play_count   INTEGER NOT NULL DEFAULT 0,
      skip_count   INTEGER NOT NULL DEFAULT 0,
      last_played  INTEGER,
      total_ms     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_state (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      track_ids     TEXT    NOT NULL DEFAULT '[]',
      current_index INTEGER NOT NULL DEFAULT 0,
      position_ms   INTEGER NOT NULL DEFAULT 0,
      updated_at    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS search_history (
      term        TEXT PRIMARY KEY,
      searched_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL,
      payload    TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

/** Drops all user data. Used by "restore backup" before importing. */
export async function resetUserData() {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM playlist_tracks;
    DELETE FROM playlists;
    DELETE FROM favorites;
    DELETE FROM hidden_items;
    DELETE FROM play_history;
    DELETE FROM track_stats;
    DELETE FROM search_history;
    DELETE FROM queue_state;
  `);
}
