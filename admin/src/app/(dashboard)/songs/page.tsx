import type { Metadata } from 'next';

import { SongsManager } from '@/components/SongsManager';
import { PageHeader } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Songs' };
export const dynamic = 'force-dynamic';

/** Upload audio from this computer and choose which tracks the app may play. */
export default async function SongsPage() {
  await requireAdmin();

  const songs = await prisma.song.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <>
      <PageHeader
        title="Songs"
        description="Upload audio from this computer and publish it to the Android app. Listeners see published songs after switching on Admin songs mode."
      />
      <SongsManager
        songs={songs.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album,
          category: song.category || 'Pop',
          artworkUrl: song.artworkUrl,
          originalName: song.originalName,
          mimeType: song.mimeType,
          sizeBytes: song.sizeBytes,
          durationMs: song.durationMs,
          isPublished: song.isPublished,
          createdAt: song.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
