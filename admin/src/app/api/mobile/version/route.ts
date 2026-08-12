import type { NextRequest } from 'next/server';

import { jsonOk } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mobile/version?platform=android&version=1.0.0&build=1
 *
 * Unauthenticated on purpose: a client on a build old enough to be blocked still needs to
 * be able to learn that it is blocked.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const platform = params.get('platform') ?? 'android';
  const build = Number(params.get('build')) || 0;

  const current = await prisma.appVersion.findFirst({
    where: { platform, isCurrent: true },
    orderBy: { buildNumber: 'desc' },
  });

  if (!current) {
    return jsonOk({ updateAvailable: false, mandatory: false, supported: true });
  }

  return jsonOk({
    updateAvailable: build < current.buildNumber,
    // A build below the current release's floor must update before it can continue.
    mandatory: current.isMandatory && build < current.buildNumber,
    supported: build >= current.minSupported,
    latestVersion: current.version,
    latestBuild: current.buildNumber,
    minSupportedBuild: current.minSupported,
    releaseNotes: current.releaseNotes,
    downloadUrl: current.downloadUrl,
    releasedAt: current.releasedAt.toISOString(),
  });
}
