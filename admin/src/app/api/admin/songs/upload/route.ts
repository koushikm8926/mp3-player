import { randomUUID } from 'node:crypto';

import { getCurrentAdmin, recordAudit } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AUDIO_TYPES, MAX_UPLOAD_BYTES, deleteAudio, saveAudio } from '@/lib/songStorage';

/**
 * Receives one uploaded track.
 *
 * A route handler rather than a server action: actions cap the request body at 1 MB and
 * buffer it in memory, neither of which suits audio. The client posts one file per request,
 * so a large batch never becomes a single huge body.
 *
 * This path sits under `/api`, which `proxy.ts` deliberately skips, so the admin cookie is
 * checked here rather than by the middleware.
 */

/** Falls back to the filename when a track carries no usable title. */
function titleFromFilename(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, '');
  return withoutExtension.replace(/[_-]+/g, ' ').trim() || name;
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Could not read the upload.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file was attached.' }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: `"${file.name}" is empty.` }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return Response.json({ error: `"${file.name}" is larger than ${mb} MB.` }, { status: 413 });
  }

  const id = randomUUID();
  let saved;
  try {
    saved = await saveAudio(file, id);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Could not store the file.';
    const accepted = Object.keys(AUDIO_TYPES).join(', ');
    return Response.json({ error: `${reason} Accepted formats: ${accepted}.` }, { status: 415 });
  }

  try {
    const song = await prisma.song.create({
      data: {
        id,
        title: titleFromFilename(file.name),
        storageKey: saved.storageKey,
        originalName: file.name,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        uploadedBy: admin.sub,
      },
      select: { id: true, title: true },
    });
    await recordAudit(admin.sub, 'song.upload', song.id, file.name);
    return Response.json({ song });
  } catch {
    // Never leave a file on disk that no row points at.
    await deleteAudio(saved.storageKey);
    return Response.json({ error: `Could not save "${file.name}".` }, { status: 500 });
  }
}
