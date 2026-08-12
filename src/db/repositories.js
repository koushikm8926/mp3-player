import { getDatabase } from './database';

const now = () => Date.now();

// ---------------------------------------------------------------------------- playlists

export const playlistsRepo = {
  async list() {
    const db = await getDatabase();
    return db.getAllAsync(`
      SELECT p.*, COUNT(pt.id) AS track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `);
  },

  async get(id) {
    const db = await getDatabase();
    return db.getFirstAsync('SELECT * FROM playlists WHERE id = ?', [id]);
  },

  async create(name, description = '') {
    const db = await getDatabase();
    const timestamp = now();
    const result = await db.runAsync(
      'INSERT INTO playlists (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [name.trim(), description, timestamp, timestamp]
    );
    return result.lastInsertRowId;
  },

  async exists(name) {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT id FROM playlists WHERE name = ? COLLATE NOCASE',
      [name.trim()]
    );
    return row != null;
  },

  async rename(id, name) {
    const db = await getDatabase();
    await db.runAsync('UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?', [
      name.trim(),
      now(),
      id,
    ]);
  },

  async remove(id) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM playlists WHERE id = ?', [id]);
  },

  async trackIds(playlistId) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
      [playlistId]
    );
    return rows.map((r) => r.track_id);
  },

  async entries(playlistId) {
    const db = await getDatabase();
    return db.getAllAsync(
      'SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
      [playlistId]
    );
  },

  /** Appends tracks, skipping any already present (the unique index would reject them). */
  async addTracks(playlistId, tracks) {
    if (!tracks.length) return 0;
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT COALESCE(MAX(position), -1) AS max_position FROM playlist_tracks WHERE playlist_id = ?',
      [playlistId]
    );
    let position = (row?.max_position ?? -1) + 1;
    let inserted = 0;

    await db.withTransactionAsync(async () => {
      for (const track of tracks) {
        const result = await db.runAsync(
          `INSERT OR IGNORE INTO playlist_tracks
             (playlist_id, track_id, position, added_at, title, artist, path)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            playlistId,
            String(track.id),
            position,
            now(),
            track.title ?? '',
            track.artist ?? '',
            track.path ?? '',
          ]
        );
        if (result.changes > 0) {
          position += 1;
          inserted += 1;
        }
      }
      await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', [now(), playlistId]);
    });

    return inserted;
  },

  async removeTrack(playlistId, trackId) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', [
      playlistId,
      String(trackId),
    ]);
    await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', [now(), playlistId]);
  },

  /** Persists a new order after a drag-and-drop reorder. */
  async reorder(playlistId, orderedTrackIds) {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (let index = 0; index < orderedTrackIds.length; index += 1) {
        await db.runAsync(
          'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?',
          [index, playlistId, String(orderedTrackIds[index])]
        );
      }
      await db.runAsync('UPDATE playlists SET updated_at = ? WHERE id = ?', [now(), playlistId]);
    });
  },
};

// ---------------------------------------------------------------------------- favourites

export const favoritesRepo = {
  async ids() {
    const db = await getDatabase();
    const rows = await db.getAllAsync('SELECT track_id FROM favorites ORDER BY added_at DESC');
    return rows.map((r) => r.track_id);
  },

  async all() {
    const db = await getDatabase();
    return db.getAllAsync('SELECT * FROM favorites ORDER BY added_at DESC');
  },

  async add(track) {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO favorites (track_id, added_at, title, artist, path) VALUES (?, ?, ?, ?, ?)',
      [String(track.id), now(), track.title ?? '', track.artist ?? '', track.path ?? '']
    );
  },

  async remove(trackId) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM favorites WHERE track_id = ?', [String(trackId)]);
  },

  async toggle(track) {
    const db = await getDatabase();
    const row = await db.getFirstAsync('SELECT track_id FROM favorites WHERE track_id = ?', [
      String(track.id),
    ]);
    if (row) {
      await favoritesRepo.remove(track.id);
      return false;
    }
    await favoritesRepo.add(track);
    return true;
  },
};

// ---------------------------------------------------------------------------- hidden music

export const HIDDEN_KIND = { TRACK: 'track', FOLDER: 'folder' };

export const hiddenRepo = {
  async all() {
    const db = await getDatabase();
    return db.getAllAsync('SELECT * FROM hidden_items ORDER BY created_at DESC');
  },

  async add(kind, value, label = '') {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR IGNORE INTO hidden_items (kind, value, label, created_at) VALUES (?, ?, ?, ?)',
      [kind, String(value), label, now()]
    );
  },

  async remove(kind, value) {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM hidden_items WHERE kind = ? AND value = ?', [
      kind,
      String(value),
    ]);
  },

  async clear() {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM hidden_items');
  },
};

// ---------------------------------------------------------------------------- history + stats

export const historyRepo = {
  /**
   * Records a listen. `completed` distinguishes a real play from a skip, which keeps
   * "Most played" honest and feeds the skip counter used by the admin reports.
   */
  async record(trackId, durationMs, completed) {
    const db = await getDatabase();
    const timestamp = now();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO play_history (track_id, played_at, duration_ms, completed) VALUES (?, ?, ?, ?)',
        [String(trackId), timestamp, Math.round(durationMs), completed ? 1 : 0]
      );
      await db.runAsync(
        `INSERT INTO track_stats (track_id, play_count, skip_count, last_played, total_ms)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (track_id) DO UPDATE SET
           play_count  = play_count + excluded.play_count,
           skip_count  = skip_count + excluded.skip_count,
           last_played = excluded.last_played,
           total_ms    = total_ms + excluded.total_ms`,
        [String(trackId), completed ? 1 : 0, completed ? 0 : 1, timestamp, Math.round(durationMs)]
      );
    });

    // Keep the raw history bounded; the aggregate in track_stats is what the UI reads.
    await db.runAsync(
      'DELETE FROM play_history WHERE id NOT IN (SELECT id FROM play_history ORDER BY played_at DESC LIMIT 1000)'
    );
  },

  /** Distinct track ids, most recently played first. */
  async recentTrackIds(limit = 100) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT track_id, MAX(played_at) AS played_at
       FROM play_history
       GROUP BY track_id
       ORDER BY played_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows.map((r) => r.track_id);
  },

  async stats() {
    const db = await getDatabase();
    return db.getAllAsync('SELECT * FROM track_stats ORDER BY play_count DESC');
  },

  async statsMap() {
    const rows = await historyRepo.stats();
    const map = new Map();
    for (const row of rows) map.set(row.track_id, row);
    return map;
  },

  async mostPlayedIds(limit = 50) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      'SELECT track_id FROM track_stats WHERE play_count > 0 ORDER BY play_count DESC, last_played DESC LIMIT ?',
      [limit]
    );
    return rows.map((r) => r.track_id);
  },

  async clear() {
    const db = await getDatabase();
    await db.execAsync('DELETE FROM play_history; DELETE FROM track_stats;');
  },

  /** Aggregate counters reported to the admin panel. */
  async summary() {
    const db = await getDatabase();
    const totals = await db.getFirstAsync(
      `SELECT
         COUNT(*)                AS listens,
         COALESCE(SUM(duration_ms), 0) AS total_ms,
         COUNT(DISTINCT track_id) AS unique_tracks
       FROM play_history`
    );
    return {
      listens: totals?.listens ?? 0,
      totalMs: totals?.total_ms ?? 0,
      uniqueTracks: totals?.unique_tracks ?? 0,
    };
  },
};

// ---------------------------------------------------------------------------- settings

export const settingsRepo = {
  async all() {
    const db = await getDatabase();
    const rows = await db.getAllAsync('SELECT key, value FROM settings');
    const result = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch {
        result[row.key] = row.value;
      }
    }
    return result;
  },

  async set(key, value) {
    const db = await getDatabase();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      key,
      JSON.stringify(value),
    ]);
  },

  async setMany(entries) {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const [key, value] of Object.entries(entries)) {
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
          key,
          JSON.stringify(value),
        ]);
      }
    });
  },
};

// ---------------------------------------------------------------------------- queue

export const queueRepo = {
  async load() {
    const db = await getDatabase();
    const row = await db.getFirstAsync('SELECT * FROM queue_state WHERE id = 1');
    if (!row) return null;
    try {
      return {
        trackIds: JSON.parse(row.track_ids),
        currentIndex: row.current_index,
        positionMs: row.position_ms,
      };
    } catch {
      return null;
    }
  },

  async save(trackIds, currentIndex, positionMs) {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO queue_state (id, track_ids, current_index, position_ms, updated_at)
       VALUES (1, ?, ?, ?, ?)`,
      [JSON.stringify(trackIds), currentIndex, Math.round(positionMs), now()]
    );
  },
};

// ---------------------------------------------------------------------------- search history

export const searchRepo = {
  async recent(limit = 8) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      'SELECT term FROM search_history ORDER BY searched_at DESC LIMIT ?',
      [limit]
    );
    return rows.map((r) => r.term);
  },

  async record(term) {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    const db = await getDatabase();
    await db.runAsync('INSERT OR REPLACE INTO search_history (term, searched_at) VALUES (?, ?)', [
      trimmed,
      now(),
    ]);
  },

  async clear() {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM search_history');
  },
};

// ---------------------------------------------------------------------------- outbox

/**
 * Analytics the app owes the admin server. Buffered locally so a listening session on a
 * plane still lands in the reports once the device is back online.
 */
export const outboxRepo = {
  async enqueue(type, payload) {
    const db = await getDatabase();
    await db.runAsync('INSERT INTO pending_events (type, payload, created_at) VALUES (?, ?, ?)', [
      type,
      JSON.stringify(payload),
      now(),
    ]);
  },

  async peek(limit = 50) {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      'SELECT * FROM pending_events ORDER BY created_at ASC LIMIT ?',
      [limit]
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      createdAt: row.created_at,
      payload: safeParse(row.payload),
    }));
  },

  async drop(ids) {
    if (!ids.length) return;
    const db = await getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM pending_events WHERE id IN (${placeholders})`, ids);
  },
};

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
