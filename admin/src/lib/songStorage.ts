import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

/**
 * Where uploaded audio lives.
 *
 * Files sit on the same disk as the panel, so serving them costs no bandwidth beyond the
 * server's own. Everything storage-specific is confined to this module: swapping to S3/R2
 * later means reimplementing these four functions, not touching routes or actions.
 *
 * `SONG_UPLOADS_DIR` overrides the location — set it to a mounted volume in production so
 * uploads survive a redeploy.
 */

const UPLOADS_DIR = process.env.SONG_UPLOADS_DIR
  ? path.resolve(process.env.SONG_UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');

/** Extensions the panel accepts, mapped to the type the app is told to expect. */
export const AUDIO_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
};

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Resolves a stored file, refusing anything that escapes the uploads directory.
 *
 * Storage keys are generated here, never supplied by a client, but the streaming route takes
 * an id from the URL — so this stays defensive regardless.
 */
export function resolveStoredPath(storageKey: string): string | null {
  if (!storageKey || storageKey.includes('/') || storageKey.includes('\\')) return null;
  const resolved = path.join(UPLOADS_DIR, storageKey);
  if (path.dirname(resolved) !== UPLOADS_DIR) return null;
  return resolved;
}

/** Writes an uploaded file and returns the key needed to read it back. */
export async function saveAudio(
  file: File,
  id: string
): Promise<{ storageKey: string; sizeBytes: number; mimeType: string }> {
  const extension = path.extname(file.name).toLowerCase();
  const mimeType = AUDIO_TYPES[extension];
  if (!mimeType) throw new Error(`Unsupported audio format "${extension || file.name}".`);

  await mkdir(UPLOADS_DIR, { recursive: true });

  const storageKey = `${id}${extension}`;
  const target = resolveStoredPath(storageKey);
  if (!target) throw new Error('Could not resolve a storage path for this file.');

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(target, bytes);

  return { storageKey, sizeBytes: bytes.byteLength, mimeType };
}

/** Removes a stored file. A missing file is not an error — the row is going away regardless. */
export async function deleteAudio(storageKey: string): Promise<void> {
  const target = resolveStoredPath(storageKey);
  if (!target) return;
  await unlink(target).catch(() => undefined);
}

/**
 * Opens a stored file for streaming, honouring a byte range when one is asked for.
 *
 * Range support is what makes seeking work in the app: the player asks for the slice around
 * the new position instead of refetching the whole track.
 */
export async function openAudio(
  storageKey: string,
  rangeHeader: string | null
): Promise<
  | { ok: true; stream: ReadableStream; size: number; start: number; end: number; partial: boolean }
  | { ok: false; reason: 'missing' | 'unsatisfiable'; size?: number }
> {
  const target = resolveStoredPath(storageKey);
  if (!target) return { ok: false, reason: 'missing' };

  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) return { ok: false, reason: 'missing' };

  const size = info.size;
  let start = 0;
  let end = size - 1;
  let partial = false;

  const match = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
  if (match) {
    const [, rawStart, rawEnd] = match;
    if (rawStart === '' && rawEnd === '') return { ok: false, reason: 'unsatisfiable', size };

    if (rawStart === '') {
      // "bytes=-500" means the final 500 bytes.
      const suffix = Number(rawEnd);
      start = Math.max(0, size - suffix);
    } else {
      start = Number(rawStart);
      if (rawEnd !== '') end = Math.min(Number(rawEnd), size - 1);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      return { ok: false, reason: 'unsatisfiable', size };
    }
    partial = true;
  }

  const nodeStream = createReadStream(target, { start, end });
  return {
    ok: true,
    stream: Readable.toWeb(nodeStream) as ReadableStream,
    size,
    start,
    end,
    partial,
  };
}
