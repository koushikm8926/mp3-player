import { authenticateMobileRequest } from '@/lib/auth';
import { jsonError, jsonOk, requestOrigin } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

/**
 * The catalogue the app shows in Admin songs mode.
 *
 * Returns absolute stream URLs built from the request's own origin, so the app works on an
 * emulator, over the LAN or behind a domain without any of those being configured here.
 */
export async function GET(request: Request) {
  // Published tracks in Online mode are accessible to the app
  await authenticateMobileRequest(request).catch(() => null);

  const songs = await prisma.song.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      artist: true,
      album: true,
      category: true,
      artworkUrl: true,
      mimeType: true,
      sizeBytes: true,
      durationMs: true,
      createdAt: true,
    },
  });

  const origin = requestOrigin(request);

  return jsonOk({
    songs: songs.map((song) => ({
      ...song,
      createdAt: song.createdAt.toISOString(),
      url: `${origin}/api/mobile/songs/${song.id}/stream`,
    })),
  });
}
