import type { Metadata } from 'next';
import Link from 'next/link';

import { Avatar, BarRow, Card, EmptyRow, PageHeader, StatTile } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatListeningTime, formatNumber, formatRelative } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'User statistics' };
export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

/** Aggregate view: growth, retention cohorts, engagement distribution and the top listeners. */
export default async function StatisticsPage() {
  await requireAdmin();
  const now = Date.now();

  const [
    totalUsers,
    registered,
    guests,
    totals,
    topListeners,
    allUsers,
    osRows,
    versionRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isGuest: false } }),
    prisma.user.count({ where: { isGuest: true } }),
    prisma.user.aggregate({
      _sum: { totalListens: true, listeningMs: true, uniqueTracks: true },
      _avg: { totalListens: true },
    }),
    prisma.user.findMany({
      where: { totalListens: { gt: 0 } },
      orderBy: { totalListens: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        totalListens: true,
        listeningMs: true,
        uniqueTracks: true,
        lastSeenAt: true,
      },
    }),
    prisma.user.findMany({ select: { createdAt: true, lastSeenAt: true, totalListens: true } }),
    prisma.device.groupBy({ by: ['osVersion'], _count: { _all: true } }),
    prisma.device.groupBy({ by: ['appVersion'], _count: { _all: true } }),
  ]);

  // Monthly signup cohorts with how many of each are still active in the last 30 days.
  const cohorts = buildCohorts(allUsers, now);

  // Engagement buckets by lifetime listen count.
  const ENGAGEMENT = [
    { label: 'Never played', min: 0, max: 0, tone: 'neutral' as const },
    { label: '1 – 24 listens', min: 1, max: 24, tone: 'danger' as const },
    { label: '25 – 99 listens', min: 25, max: 99, tone: 'warn' as const },
    { label: '100 – 499 listens', min: 100, max: 499, tone: 'info' as const },
    { label: '500+ listens', min: 500, max: Infinity, tone: 'brand' as const },
  ].map((bucket) => ({
    ...bucket,
    count: allUsers.filter((u) => u.totalListens >= bucket.min && u.totalListens <= bucket.max)
      .length,
  }));

  const totalDevices = versionRows.reduce((sum, row) => sum + row._count._all, 0);
  const avgListens = Math.round(totals._avg.totalListens ?? 0);

  return (
    <>
      <PageHeader
        title="User statistics"
        description="Growth, retention and engagement across the whole install base."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total users" value={formatNumber(totalUsers)} tone="brand" />
        <StatTile
          label="Registered vs guest"
          value={`${formatNumber(registered)} / ${formatNumber(guests)}`}
          hint={`${totalUsers > 0 ? Math.round((registered / totalUsers) * 100) : 0}% registered`}
          tone="info"
        />
        <StatTile
          label="Average listens"
          value={formatNumber(avgListens)}
          hint="Per user, lifetime"
          tone="violet"
        />
        <StatTile
          label="Total listening"
          value={formatListeningTime(totals._sum.listeningMs ?? 0n)}
          hint={`${formatNumber(totals._sum.totalListens ?? 0)} plays`}
          tone="warn"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Engagement distribution" description="Users grouped by lifetime plays">
          <div className="py-2">
            {ENGAGEMENT.map((bucket) => (
              <BarRow
                key={bucket.label}
                label={bucket.label}
                value={bucket.count}
                total={totalUsers}
                tone={bucket.tone}
              />
            ))}
          </div>
        </Card>

        <Card title="Signup cohorts" description="Monthly cohorts and how many stayed active">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-ink-700 bg-ink-900/60">
                <tr>
                  <th className="th">Cohort</th>
                  <th className="th text-right">Signups</th>
                  <th className="th text-right">Still active</th>
                  <th className="th text-right">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {cohorts.length === 0 ? (
                  <EmptyRow colSpan={4} message="Not enough history yet." />
                ) : (
                  cohorts.map((cohort) => (
                    <tr key={cohort.label}>
                      <td className="td text-mist-100">{cohort.label}</td>
                      <td className="td text-right tabular-nums">{cohort.signups}</td>
                      <td className="td text-right tabular-nums">{cohort.retained}</td>
                      <td className="td text-right tabular-nums">
                        <span
                          className={
                            cohort.rate >= 50
                              ? 'text-brand-500'
                              : cohort.rate >= 25
                                ? 'text-warn-500'
                                : 'text-danger-500'
                          }
                        >
                          {cohort.rate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="App version spread" description={`${formatNumber(totalDevices)} devices`}>
          <div className="py-2">
            {versionRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-mist-500">No devices reported.</p>
            ) : (
              versionRows
                .sort((a, b) => b._count._all - a._count._all)
                .map((row, index) => (
                  <BarRow
                    key={row.appVersion ?? 'unknown'}
                    label={row.appVersion ? `v${row.appVersion}` : 'Unknown'}
                    value={row._count._all}
                    total={totalDevices}
                    tone={(['brand', 'info', 'violet', 'warn', 'danger'] as const)[index % 5]}
                  />
                ))
            )}
          </div>
        </Card>

        <Card title="Android version spread" description="Reported at last check-in">
          <div className="py-2">
            {osRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-mist-500">No devices reported.</p>
            ) : (
              osRows
                .sort((a, b) => b._count._all - a._count._all)
                .map((row, index) => (
                  <BarRow
                    key={row.osVersion ?? 'unknown'}
                    label={row.osVersion ? `Android ${row.osVersion}` : 'Unknown'}
                    value={row._count._all}
                    total={totalDevices}
                    tone={(['info', 'violet', 'brand', 'warn', 'danger'] as const)[index % 5]}
                  />
                ))
            )}
          </div>
        </Card>
      </div>

      <Card title="Top listeners" className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse">
            <thead className="border-b border-ink-700 bg-ink-900/60">
              <tr>
                <th className="th">#</th>
                <th className="th">User</th>
                <th className="th text-right">Listens</th>
                <th className="th text-right">Listening time</th>
                <th className="th text-right">Unique tracks</th>
                <th className="th">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {topListeners.length === 0 ? (
                <EmptyRow colSpan={6} message="No listening reported yet." />
              ) : (
                topListeners.map((user, index) => (
                  <tr key={user.id} className="transition-colors hover:bg-ink-800/60">
                    <td className="td tabular-nums text-mist-500">{index + 1}</td>
                    <td className="td">
                      <Link href={`/users/${user.id}`} className="flex items-center gap-3">
                        <Avatar name={user.name} size={30} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-mist-100">
                            {user.name}
                          </span>
                          <span className="block truncate text-xs text-mist-500">
                            {user.email ?? 'Guest install'}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatNumber(user.totalListens)}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatListeningTime(user.listeningMs)}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatNumber(user.uniqueTracks)}
                    </td>
                    <td className="td">{formatRelative(user.lastSeenAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function buildCohorts(
  users: Array<{ createdAt: Date; lastSeenAt: Date | null }>,
  now: number
) {
  const retainedCutoff = now - 30 * DAY;
  const map = new Map<string, { signups: number; retained: number; sort: number }>();

  for (const user of users) {
    const date = new Date(user.createdAt);
    const key = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const sort = date.getFullYear() * 12 + date.getMonth();
    const entry = map.get(key) ?? { signups: 0, retained: 0, sort };
    entry.signups += 1;
    if (user.lastSeenAt && user.lastSeenAt.getTime() >= retainedCutoff) entry.retained += 1;
    map.set(key, entry);
  }

  return [...map.entries()]
    .sort((a, b) => b[1].sort - a[1].sort)
    .slice(0, 8)
    .map(([label, value]) => ({
      label,
      signups: value.signups,
      retained: value.retained,
      rate: value.signups > 0 ? Math.round((value.retained / value.signups) * 100) : 0,
    }));
}
