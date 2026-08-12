import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar, BarRow, Card, EmptyRow, PageHeader, StatTile, StatusBadge } from '@/components/ui';
import { UserActions } from '@/components/UserActions';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, formatListeningTime, formatNumber, formatRelative } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { activeSince } from '@/lib/settings';

export const metadata: Metadata = { title: 'User details' };
export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      devices: { orderBy: { lastSeenAt: 'desc' } },
      _count: { select: { sessions: true, events: true } },
    },
  });

  if (!user) notFound();

  const [eventsByType, recentEvents, since] = await Promise.all([
    prisma.usageEvent.groupBy({
      by: ['type'],
      where: { userId: id },
      _count: { _all: true },
    }),
    prisma.usageEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    activeSince(),
  ]);

  const totalEvents = eventsByType.reduce((sum, row) => sum + row._count._all, 0);
  const isOnline = user.lastSeenAt != null && user.lastSeenAt >= since;

  return (
    <>
      <Link href="/users" className="mb-5 inline-flex items-center gap-2 text-sm text-mist-500 hover:text-mist-300">
        <svg viewBox="0 0 24 24" className="size-4 stroke-current" fill="none" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to users
      </Link>

      <PageHeader
        title={user.name}
        description={user.email ?? 'Guest install — no email on file'}
        action={<UserActions userId={user.id} status={user.status} />}
      />

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={user.name} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={user.status} />
              {user.isGuest ? (
                <span className="badge bg-ink-700 text-mist-400">Guest</span>
              ) : (
                <span className="badge bg-ink-700 text-mist-400">Registered</span>
              )}
              {isOnline ? (
                <span className="badge bg-brand-500/10 text-brand-500">
                  <span className="size-1.5 rounded-full bg-brand-500" />
                  Active now
                </span>
              ) : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-4">
              <Detail label="User ID" value={user.id} mono />
              <Detail label="Joined" value={formatDateTime(user.createdAt)} />
              <Detail label="Last seen" value={formatRelative(user.lastSeenAt)} />
              <Detail label="Live sessions" value={String(user._count.sessions)} />
            </dl>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total listens" value={formatNumber(user.totalListens)} tone="brand" />
        <StatTile
          label="Listening time"
          value={formatListeningTime(user.listeningMs)}
          tone="violet"
        />
        <StatTile label="Unique tracks" value={formatNumber(user.uniqueTracks)} tone="info" />
        <StatTile label="Devices" value={formatNumber(user.devices.length)} tone="warn" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Devices" className="xl:col-span-2" description="Every install linked to this account">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead className="border-b border-ink-700 bg-ink-900/60">
                <tr>
                  <th className="th">Device</th>
                  <th className="th">App version</th>
                  <th className="th">Android</th>
                  <th className="th">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {user.devices.length === 0 ? (
                  <EmptyRow colSpan={4} message="No devices have checked in yet." />
                ) : (
                  user.devices.map((device) => (
                    <tr key={device.id}>
                      <td className="td">
                        <span className="font-medium text-mist-100">
                          {device.deviceName ?? 'Unknown device'}
                        </span>
                        <span className="block font-mono text-xs text-mist-500">
                          {device.installationId ?? device.id}
                        </span>
                      </td>
                      <td className="td">
                        {device.appVersion ? `v${device.appVersion}` : '—'}
                        <span className="ml-1.5 text-xs text-mist-500">
                          ({device.buildNumber})
                        </span>
                      </td>
                      <td className="td">{device.osVersion ?? '—'}</td>
                      <td className="td">{formatRelative(device.lastSeenAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Activity breakdown" description={`${formatNumber(totalEvents)} events`}>
          <div className="py-2">
            {eventsByType.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-mist-500">No events recorded.</p>
            ) : (
              eventsByType
                .sort((a, b) => b._count._all - a._count._all)
                .map((row, index) => (
                  <BarRow
                    key={row.type}
                    label={row.type.replace(/_/g, ' ')}
                    value={row._count._all}
                    total={totalEvents}
                    tone={(['brand', 'info', 'violet', 'warn', 'danger'] as const)[index % 5]}
                  />
                ))
            )}
          </div>
        </Card>
      </div>

      <Card title="Recent events" className="mt-5">
        <div className="divide-y divide-ink-800">
          {recentEvents.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-mist-500">Nothing recorded yet.</p>
          ) : (
            recentEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4 px-5 py-3">
                <span className="badge bg-ink-700 text-mist-300">
                  {event.type.replace(/_/g, ' ')}
                </span>
                <span className="flex-1 truncate text-sm text-mist-500">
                  {event.metadata ?? '—'}
                </span>
                <span className="shrink-0 text-xs text-mist-500">
                  {formatDateTime(event.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-mist-500">{label}</dt>
      <dd className={`truncate text-mist-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
