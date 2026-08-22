import { authenticateMobileRequest } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

/**
 * The catalogue the app shows in Admin songs mode.
 *
 * Returns absolute stream URLs built from the request's own origin, so the app works on an
 * emulator, over the LAN or behind a domain without any of those being configured here.
 */
export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (!auth) return jsonError('Unauthorized', 401);

  const songs = await prisma.song.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      artist: true,
      album: true,
      mimeType: true,
      sizeBytes: true,
      durationMs: true,
      createdAt: true,
    },
  });

  const origin = new URL(request.url).origin;

  return jsonOk({
    songs: songs.map((song) => ({
      ...song,
      createdAt: song.createdAt.toISOString(),
      url: `${origin}/api/mobile/songs/${song.id}/stream`,
    })),
  });
}
