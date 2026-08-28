import { createReadStream } from 'node:fs';
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

const UPLOADS_DIR = process.env.SONG_UPLOADS_DIR
  ? path.resolve(process.env.SONG_UPLOADS_DIR)
  : path.join(process.cwd(), 'uploads');

export const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function resolveStoredPath(storageKey: string): string | null {
  if (!storageKey || storageKey.includes('/') || storageKey.includes('\\')) return null;
  const resolved = path.join(UPLOADS_DIR, storageKey);
  if (path.dirname(resolved) !== UPLOADS_DIR) return null;
  return resolved;
}

/** Saves an uploaded banner cover image file. */
export async function saveBannerImage(
  file: File,
  bannerId: string
): Promise<{ storageKey: string; mimeType: string }> {
  const extension = path.extname(file.name).toLowerCase();
  const mimeType = IMAGE_TYPES[extension] || 'image/jpeg';

  await mkdir(UPLOADS_DIR, { recursive: true });

  const storageKey = `banner_${bannerId}${extension || '.jpg'}`;
  const target = resolveStoredPath(storageKey);
  if (!target) throw new Error('Could not resolve a storage path for banner image.');

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(target, bytes);

  return { storageKey, mimeType };
}

/** Resolves an existing banner image stream and MIME type. */
export async function openBannerImage(bannerId: string): Promise<{
  stream: Readable;
  mimeType: string;
  sizeBytes: number;
} | null> {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const entries = await readdir(UPLOADS_DIR);
    const prefix = `banner_${bannerId}.`;
    const found = entries.find((e) => e.startsWith(prefix));
    if (!found) return null;

    const target = resolveStoredPath(found);
    if (!target) return null;

    const fileStat = await stat(target);
    const extension = path.extname(found).toLowerCase();
    const mimeType = IMAGE_TYPES[extension] || 'image/jpeg';
    const stream = createReadStream(target) as unknown as Readable;

    return { stream, mimeType, sizeBytes: fileStat.size };
  } catch {
    return null;
  }
}

/** Removes an uploaded banner image. */
export async function deleteBannerImage(storageKey: string): Promise<void> {
  const target = resolveStoredPath(storageKey);
  if (target) {
    await unlink(target).catch(() => {});
  }
}
