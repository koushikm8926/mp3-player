import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getDatabase, resetUserData } from '../db/database';
import { settingsRepo } from '../db/repositories';

export const BACKUP_SIGNATURE = 'minax-music-backup';
export const BACKUP_VERSION = 1;

/**
 * Backup & restore.
 *
 * Only user-owned data is exported — playlists, favourites, hidden items, history and
 * settings. Audio files are never copied; a restored backup re-binds to whatever tracks the
 * device currently has by MediaStore id, with title/artist kept as a human-readable record of
 * anything that has since been deleted.
 */
export async function createBackup() {
  const db = await getDatabase();

  const [playlists, playlistTracks, favorites, hidden, stats, history, settings] =
    await Promise.all([
      db.getAllAsync('SELECT * FROM playlists'),
      db.getAllAsync('SELECT * FROM playlist_tracks'),
      db.getAllAsync('SELECT * FROM favorites'),
      db.getAllAsync('SELECT * FROM hidden_items'),
      db.getAllAsync('SELECT * FROM track_stats'),
      db.getAllAsync('SELECT * FROM play_history ORDER BY played_at DESC LIMIT 500'),
      settingsRepo.all(),
    ]);

  const payload = {
    signature: BACKUP_SIGNATURE,
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    counts: {
      playlists: playlists.length,
      playlistTracks: playlistTracks.length,
      favorites: favorites.length,
      hidden: hidden.length,
    },
    data: { playlists, playlistTracks, favorites, hidden, stats, history, settings },
  };

  const fileName = `minax-music-backup-${new Date(payload.createdAt)
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-')}.json`;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { uri, fileName, createdAt: payload.createdAt, counts: payload.counts };
}

/** Opens the system share sheet so the user can put the backup wherever they like. */
export async function shareBackup(uri) {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Minax Music backup',
    UTI: 'public.json',
  });
  return true;
}

export async function pickAndRestoreBackup() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.length) return { ok: false, canceled: true };

  const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  if (payload?.signature !== BACKUP_SIGNATURE) return { ok: false, error: 'invalid' };

  await restoreBackup(payload);
  return { ok: true, counts: payload.counts, createdAt: payload.createdAt };
}

export async function restoreBackup(payload) {
  const db = await getDatabase();
  const { playlists = [], playlistTracks = [], favorites = [], hidden = [], stats = [], history = [], settings = {} } =
    payload.data ?? {};

  await resetUserData();

  await db.withTransactionAsync(async () => {
    // Playlist ids are preserved so playlist_tracks rows keep pointing at the right list.
    for (const row of playlists) {
      await db.runAsync(
        'INSERT INTO playlists (id, name, description, cover_uri, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [row.id, row.name, row.description ?? '', row.cover_uri ?? null, row.created_at, row.updated_at]
      );
    }
    for (const row of playlistTracks) {
      await db.runAsync(
        `INSERT OR IGNORE INTO playlist_tracks
           (playlist_id, track_id, position, added_at, title, artist, path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.playlist_id, row.track_id, row.position, row.added_at, row.title ?? '', row.artist ?? '', row.path ?? '']
      );
    }
    for (const row of favorites) {
      await db.runAsync(
        'INSERT OR REPLACE INTO favorites (track_id, added_at, title, artist, path) VALUES (?, ?, ?, ?, ?)',
        [row.track_id, row.added_at, row.title ?? '', row.artist ?? '', row.path ?? '']
      );
    }
    for (const row of hidden) {
      await db.runAsync(
        'INSERT OR IGNORE INTO hidden_items (kind, value, label, created_at) VALUES (?, ?, ?, ?)',
        [row.kind, row.value, row.label ?? '', row.created_at]
      );
    }
    for (const row of stats) {
      await db.runAsync(
        'INSERT OR REPLACE INTO track_stats (track_id, play_count, skip_count, last_played, total_ms) VALUES (?, ?, ?, ?, ?)',
        [row.track_id, row.play_count, row.skip_count, row.last_played, row.total_ms]
      );
    }
    for (const row of history) {
      await db.runAsync(
        'INSERT INTO play_history (track_id, played_at, duration_ms, completed) VALUES (?, ?, ?, ?)',
        [row.track_id, row.played_at, row.duration_ms, row.completed]
      );
    }
  });

  if (settings && typeof settings === 'object') {
    await settingsRepo.setMany(settings);
  }
}
