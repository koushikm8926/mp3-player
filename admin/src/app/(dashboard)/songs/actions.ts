'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { recordAudit, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AUDIO_TYPES, MAX_UPLOAD_BYTES, deleteAudio, saveAudio } from '@/lib/songStorage';

export type UploadState = { error?: string; success?: string };

/** Falls back to the filename when a track carries no usable title. */
function titleFromFilename(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, '');
  return withoutExtension.replace(/[_-]+/g, ' ').trim() || name;
}

/**
 * Stores one or more uploaded files and records them as hidden tracks.
 *
 * Uploads start unpublished so a mistake never reaches listeners before it is reviewed —
 * publishing is a deliberate second step.
 */
export async function uploadSongs(
  _previous: UploadState,
  formData: FormData
): Promise<UploadState> {
  const admin = await requireAdmin();
  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) return { error: 'Choose at least one audio file to upload.' };

  const accepted = Object.keys(AUDIO_TYPES).join(', ');
  let stored = 0;

  for (const file of files) {
    if (file.size === 0) return { error: `"${file.name}" is empty.` };
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        error: `"${file.name}" is larger than ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
      };
    }

    // The id doubles as the filename on disk, so it is generated up front rather than
    // letting the database default fill it in after the write.
    const id = randomUUID();
    let saved;
    try {
      saved = await saveAudio(file, id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Could not store the file.';
      return { error: `${reason} Accepted formats: ${accepted}.` };
    }

    try {
      await prisma.song.create({
        data: {
          id,
          title: titleFromFilename(file.name),
          storageKey: saved.storageKey,
          originalName: file.name,
          mimeType: saved.mimeType,
          sizeBytes: saved.sizeBytes,
          uploadedBy: admin.sub,
        },
      });
    } catch (error) {
      // Never leave a file on disk that no row points at.
      await deleteAudio(saved.storageKey);
      throw error;
    }
    stored += 1;
  }

  await recordAudit(admin.sub, 'song.upload', '', `${stored} file(s)`);
  revalidatePath('/songs');
  return { success: `Uploaded ${stored} ${stored === 1 ? 'song' : 'songs'}.` };
}

/** Shows or hides a track from the app. */
export async function setPublished(id: string, isPublished: boolean): Promise<void> {
  const admin = await requireAdmin();
  await prisma.song.update({ where: { id }, data: { isPublished } });
  await recordAudit(admin.sub, isPublished ? 'song.publish' : 'song.hide', id);
  revalidatePath('/songs');
}

/** Updates the editable metadata fields. */
export async function updateSong(
  id: string,
  fields: { title: string; artist: string; album: string }
): Promise<void> {
  const admin = await requireAdmin();
  await prisma.song.update({
    where: { id },
    data: {
      title: fields.title.trim() || 'Untitled',
      artist: fields.artist.trim() || 'Unknown artist',
      album: fields.album.trim() || 'Unknown album',
    },
  });
  await recordAudit(admin.sub, 'song.update', id);
  revalidatePath('/songs');
}

/** Deletes the row and the file behind it. */
export async function deleteSong(id: string): Promise<void> {
  const admin = await requireAdmin();
  const song = await prisma.song.findUnique({ where: { id }, select: { storageKey: true } });
  if (!song) return;

  await prisma.song.delete({ where: { id } });
  await deleteAudio(song.storageKey);
  await recordAudit(admin.sub, 'song.delete', id);
  revalidatePath('/songs');
}
