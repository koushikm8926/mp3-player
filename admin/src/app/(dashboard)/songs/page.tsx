import type { Metadata } from 'next';

import { SongsManager } from '@/components/SongsManager';
import { PageHeader } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = { title: 'Songs' };
export const dynamic = 'force-dynamic';

/**
 * Upload songs from the admin machine and choose which of them the app may play.
 *
 * This pass is the interface only — see `SongsManager` for what still needs wiring.
 */
export default async function SongsPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Songs"
        description="Upload audio from this computer and publish it to the Android app. Listeners see published songs after switching on Admin songs mode."
      />
      <SongsManager />
    </>
  );
}
