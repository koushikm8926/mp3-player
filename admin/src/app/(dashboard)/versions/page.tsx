import type { Metadata } from 'next';

import { Badge, Card, EmptyRow, PageHeader } from '@/components/ui';
import { VersionActions, VersionForm } from '@/components/VersionForms';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, formatNumber } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'App versions' };
export const dynamic = 'force-dynamic';

/** Publish releases and control which build the app treats as current. */
export default async function VersionsPage() {
  await requireAdmin();

  const [versions, installBase] = await Promise.all([
    prisma.appVersion.findMany({ orderBy: { buildNumber: 'desc' } }),
    prisma.device.groupBy({ by: ['buildNumber'], _count: { _all: true } }),
  ]);

  const installsByBuild = new Map(installBase.map((row) => [row.buildNumber, row._count._all]));
  const nextBuild = (versions[0]?.buildNumber ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="App version management"
        description="The app checks these on launch and from Settings → Check for updates."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          title="Published releases"
          description={`${versions.length} ${versions.length === 1 ? 'release' : 'releases'}`}
          className="overflow-hidden xl:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="border-b border-ink-700 bg-ink-900/60">
                <tr>
                  <th className="th">Version</th>
                  <th className="th">Flags</th>
                  <th className="th text-right">Installs</th>
                  <th className="th">Released</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {versions.length === 0 ? (
                  <EmptyRow colSpan={5} message="No releases published yet." />
                ) : (
                  versions.map((version) => (
                    <tr key={version.id} className="align-top transition-colors hover:bg-ink-800/60">
                      <td className="td">
                        <span className="block font-medium text-mist-100">v{version.version}</span>
                        <span className="block text-xs text-mist-500">
                          Build {version.buildNumber} · min supported {version.minSupported}
                        </span>
                        {version.releaseNotes ? (
                          <p className="mt-1.5 max-w-md text-xs text-mist-500">
                            {version.releaseNotes}
                          </p>
                        ) : null}
                      </td>
                      <td className="td">
                        <div className="flex flex-wrap gap-1.5">
                          {version.isCurrent ? <Badge tone="brand">Current</Badge> : null}
                          {version.isMandatory ? <Badge tone="warn">Mandatory</Badge> : null}
                          {version.downloadUrl ? <Badge tone="info">APK linked</Badge> : null}
                        </div>
                      </td>
                      <td className="td text-right tabular-nums">
                        {formatNumber(installsByBuild.get(version.buildNumber) ?? 0)}
                      </td>
                      <td className="td">{formatDateTime(version.releasedAt)}</td>
                      <td className="td">
                        <div className="flex justify-end">
                          <VersionActions
                            id={version.id}
                            isCurrent={version.isCurrent}
                            isMandatory={version.isMandatory}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Publish a release" description="Registers a build for the update check.">
          <div className="p-5">
            <VersionForm nextBuild={nextBuild} />
          </div>
        </Card>
      </div>
    </>
  );
}
