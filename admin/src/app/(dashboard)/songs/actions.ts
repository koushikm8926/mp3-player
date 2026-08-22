'use server';

import { revalidatePath } from 'next/cache';

import { recordAudit, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteAudio } from '@/lib/songStorage';

/** Uploading lives in `POST /api/admin/songs/upload` — server actions cap bodies at 1 MB. */

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
