import { openAudio } from '@/lib/songStorage';
import { prisma } from '@/lib/prisma';

/**
 * Streams one published track to the app.
 *
 * Deliberately unauthenticated: `expo-audio` hands the URL to the platform media player,
 * which issues its own requests without the app's Authorization header, so a token here
 * would simply break playback. Only published tracks are reachable, and ids are UUIDs, so
 * this exposes no more than the songs list the signed-in app already receives.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const song = await prisma.song.findFirst({
    where: { id, isPublished: true },
    select: { storageKey: true, mimeType: true },
  });
  if (!song) return new Response('Not found', { status: 404 });

  const result = await openAudio(song.storageKey, request.headers.get('range'));

  if (!result.ok) {
    if (result.reason === 'unsatisfiable') {
      return new Response('Range not satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${result.size ?? 0}` },
      });
    }
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers({
    'Content-Type': song.mimeType,
    'Content-Length': String(result.end - result.start + 1),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
  });
  if (result.partial) {
    headers.set('Content-Range', `bytes ${result.start}-${result.end}/${result.size}`);
  }

  return new Response(result.stream, { status: result.partial ? 206 : 200, headers });
}
