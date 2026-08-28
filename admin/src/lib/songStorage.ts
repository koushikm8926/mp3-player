import { createReadStream } from 'node:fs';
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

/**
 * Where uploaded audio and artwork live.
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

/** Image extensions accepted for song artwork. */
export const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Resolves a stored file, refusing anything that escapes the uploads directory.
 */
export function resolveStoredPath(storageKey: string): string | null {
  if (!storageKey || storageKey.includes('/') || storageKey.includes('\\')) return null;
  const resolved = path.join(UPLOADS_DIR, storageKey);
  if (path.dirname(resolved) !== UPLOADS_DIR) return null;
  return resolved;
}

/** Writes an uploaded audio file and returns the key needed to read it back. */
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
  await writeFile(/*turbopackIgnore: true*/ target, bytes);

  return { storageKey, sizeBytes: bytes.byteLength, mimeType };
}

/** Saves an uploaded artwork image file and returns its storage key. */
export async function saveArtwork(
  file: File,
  id: string
): Promise<{ artworkKey: string; mimeType: string }> {
  const extension = path.extname(file.name).toLowerCase() || '.jpg';
  const mimeType = IMAGE_TYPES[extension] || 'image/jpeg';

  await mkdir(UPLOADS_DIR, { recursive: true });

  // Clean up any old artwork files for this song id
  const existingFiles = await readdir(UPLOADS_DIR).catch(() => []);
  for (const existing of existingFiles) {
    if (existing.startsWith(`art_${id}.`)) {
      await unlink(path.join(UPLOADS_DIR, existing)).catch(() => undefined);
    }
  }

  const artworkKey = `art_${id}${extension}`;
  const target = resolveStoredPath(artworkKey);
  if (!target) throw new Error('Could not resolve a storage path for artwork.');

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(/*turbopackIgnore: true*/ target, bytes);

  return { artworkKey, mimeType };
}

/** Removes a stored file. */
export async function deleteAudio(storageKey: string): Promise<void> {
  const target = resolveStoredPath(storageKey);
  if (!target) return;
  await unlink(/*turbopackIgnore: true*/ target).catch(() => undefined);
}

/** Opens a stored audio file for streaming. */
export async function openAudio(
  storageKey: string,
  rangeHeader: string | null
): Promise<
  | { ok: true; stream: ReadableStream; size: number; start: number; end: number; partial: boolean }
  | { ok: false; reason: 'missing' | 'unsatisfiable'; size?: number }
> {
  const target = resolveStoredPath(storageKey);
  if (!target) return { ok: false, reason: 'missing' };

  const info = await stat(/*turbopackIgnore: true*/ target).catch(() => null);
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

  const nodeStream = createReadStream(/*turbopackIgnore: true*/ target, { start, end });
  return {
    ok: true,
    stream: Readable.toWeb(nodeStream) as ReadableStream,
    size,
    start,
    end,
    partial,
  };
}

/** Opens an artwork image file for serving. */
export async function openArtwork(
  id: string
): Promise<
  | { ok: true; stream: ReadableStream; mimeType: string; size: number }
  | { ok: false; reason: 'missing' }
> {
  const files = await readdir(UPLOADS_DIR).catch(() => []);
  const match = files.find((f) => f.startsWith(`art_${id}.`) || f === id || f.startsWith(`${id}.`));
  if (!match) return { ok: false, reason: 'missing' };

  const target = resolveStoredPath(match);
  if (!target) return { ok: false, reason: 'missing' };

  const info = await stat(/*turbopackIgnore: true*/ target).catch(() => null);
  if (!info?.isFile()) return { ok: false, reason: 'missing' };

  const extension = path.extname(target).toLowerCase();
  const mimeType = IMAGE_TYPES[extension] || 'image/jpeg';

  const nodeStream = createReadStream(/*turbopackIgnore: true*/ target);
  return {
    ok: true,
    stream: Readable.toWeb(nodeStream) as ReadableStream,
    mimeType,
    size: info.size,
  };
}
