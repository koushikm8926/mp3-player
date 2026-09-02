import type { Metadata } from 'next';
import Link from 'next/link';

import { Avatar, BarRow, Card, PageHeader, StatTile, StatusBadge } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatListeningTime, formatNumber, formatRelative } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { activeSince, getActiveWindowMinutes } from '@/lib/settings';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  await requireAdmin();

  const now = Date.now();
  const since = await activeSince();
  const windowMinutes = await getActiveWindowMinutes();

  const [
    totalUsers,
    activeNow,
    activeToday,
    activeWeek,
    newToday,
    newWeek,
    guests,
    totals,
    recentUsers,
    eventTotals,
  ] = await Promise.all([
    // Guests have their own tile below, so this one counts signed-up accounts only —
    // it links to /users, which is filtered the same way.
    prisma.user.count({ where: { status: { not: 'deleted' }, isGuest: false } }),
    prisma.user.count({ where: { lastSeenAt: { gte: since }, status: 'active' } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - DAY) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - DAY) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.user.count({ where: { isGuest: true } }),
    prisma.user.aggregate({ _sum: { totalListens: true, listeningMs: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        isGuest: true,
        status: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
    prisma.usageEvent.groupBy({ by: ['type'], _count: { _all: true } }),
  ]);

  const totalEvents = eventTotals.reduce((sum, row) => sum + row._count._all, 0);

  // Signups per day for the last 14 days, drawn as a small inline column chart.
  const signupWindow = await prisma.user.findMany({
    where: { createdAt: { gte: new Date(now - 14 * DAY) } },
    select: { createdAt: true },
  });
  const buckets = buildDailyBuckets(signupWindow.map((u) => u.createdAt), 14);
  const peak = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Overview of the Minax Music install base. Active means seen in the last ${windowMinutes} minutes.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Registered users"
          value={formatNumber(totalUsers)}
          hint={`${formatNumber(newWeek)} new this week`}
          tone="brand"
          href="/users"
          icon={<GlyphUsers />}
        />
        <StatTile
          label="Active now"
          value={formatNumber(activeNow)}
          hint={`${formatNumber(activeToday)} in the last 24 hours`}
          tone="info"
          href="/active"
          icon={<GlyphPulse />}
        />
        <StatTile
          label="Total listens"
          value={formatNumber(totals._sum.totalListens ?? 0)}
          hint={formatListeningTime(totals._sum.listeningMs ?? 0n) + ' of listening'}
          tone="violet"
          href="/statistics"
          icon={<GlyphNote />}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile label="New today" value={formatNumber(newToday)} tone="neutral" />
        <StatTile label="Active this week" value={formatNumber(activeWeek)} tone="neutral" />
        <StatTile label="Guest installs" value={formatNumber(guests)} tone="neutral" />
      </div>

      <div className="mt-6">
        <Card
          title="Signups — last 14 days"
          description={`${formatNumber(signupWindow.length)} accounts created`}
        >
          <div className="flex h-52 items-end gap-1.5 px-5 py-5">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="group flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-brand-500/70 transition-colors group-hover:bg-brand-500"
                    style={{ height: `${Math.max(2, (bucket.count / peak) * 100)}%` }}
                    title={`${bucket.label}: ${bucket.count}`}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-mist-500">{bucket.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          title="Newest users"
          className="xl:col-span-2"
          action={
            <Link href="/users" className="text-xs font-medium text-brand-500 hover:underline">
              View all
            </Link>
          }
        >
          <div className="divide-y divide-ink-800">
            {recentUsers.map((user) => (
              <Link
                key={user.id}
                href={`/users/${user.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-800"
              >
                <Avatar name={user.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-mist-100">{user.name}</p>
                  <p className="truncate text-xs text-mist-500">
                    {user.email ?? 'Guest install'}
                  </p>
                </div>
                <span className="hidden text-xs text-mist-500 sm:block">
                  {formatRelative(user.createdAt)}
                </span>
                <StatusBadge status={user.status} />
              </Link>
            ))}
            {recentUsers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-mist-500">No users yet.</p>
            ) : null}
          </div>
        </Card>

        <Card title="Usage events" description={`${formatNumber(totalEvents)} recorded`}>
          <div className="py-2">
            {eventTotals.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-mist-500">
                Nothing reported yet.
              </p>
            ) : (
              eventTotals
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
    </>
  );
}

/** Groups timestamps into per-day counts for the last `days` days, oldest first. */
function buildDailyBuckets(dates: Date[], days: number) {
  const buckets = Array.from({ length: days }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (days - 1 - index));
    return { date: day, label: String(day.getDate()), count: 0 };
  });

  for (const date of dates) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.date.getTime() === day.getTime());
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

function GlyphUsers() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 stroke-current" fill="none" strokeWidth="2">
      <path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" strokeLinecap="round" />
    </svg>
  );
}
function GlyphPulse() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 stroke-current" fill="none" strokeWidth="2">
      <path d="M3 12h4l3 8 4-16 3 8h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GlyphNote() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
      <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </svg>
  );
}
