import { openArtwork } from '@/lib/songStorage';
import { prisma } from '@/lib/prisma';

/**
 * Serves an uploaded song artwork image to the app and dashboard.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const song = await prisma.song.findFirst({
    where: { id },
    select: { artworkUrl: true },
  });
  if (!song || !song.artworkUrl) return new Response('Not found', { status: 404 });

  if (song.artworkUrl.startsWith('http://') || song.artworkUrl.startsWith('https://')) {
    return Response.redirect(song.artworkUrl, 302);
  }

  const result = await openArtwork(id);

  if (!result.ok) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(result.stream, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType,
      'Content-Length': String(result.size),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
