import { getCurrentAdmin, recordAudit } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveArtwork } from '@/lib/songStorage';

/**
 * Handles uploading or updating artwork cover image for an existing song.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const song = await prisma.song.findUnique({ where: { id }, select: { id: true } });
  if (!song) return Response.json({ error: 'Song not found' }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Could not read form data.' }, { status: 400 });
  }

  const artworkFile = form.get('artworkFile');
  if (!(artworkFile instanceof File) || artworkFile.size === 0) {
    return Response.json({ error: 'No valid image file attached.' }, { status: 400 });
  }

  try {
    await saveArtwork(artworkFile, id);
    const artworkUrl = `/api/mobile/songs/${id}/artwork?v=${Date.now()}`;
    await prisma.song.update({
      where: { id },
      data: { artworkUrl },
    });
    await recordAudit(admin.sub, 'song.artwork_update', id);
    return Response.json({ success: true, artworkUrl });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Could not save artwork.';
    return Response.json({ error: reason }, { status: 500 });
  }
}
