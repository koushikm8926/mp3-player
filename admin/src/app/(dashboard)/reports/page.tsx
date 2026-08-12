import type { Metadata } from 'next';

import { Card, EmptyRow, PageHeader, StatTile } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatListeningTime, formatNumber } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
const RANGES = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: '365', label: 'Last 12 months' },
] as const;

/** Period reports with CSV export. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const { range } = await searchParams;

  const days = RANGES.some((r) => r.key === range) ? Number(range) : 30;
  const now = Date.now();
  const from = new Date(now - days * DAY);
  const previousFrom = new Date(now - 2 * days * DAY);

  const [
    signups,
    previousSignups,
    activeUsers,
    events,
    eventsByType,
    totals,
    guestSignups,
    topDays,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: from } } }),
    prisma.user.count({ where: { createdAt: { gte: previousFrom, lt: from } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: from } } }),
    prisma.usageEvent.count({ where: { createdAt: { gte: from } } }),
    prisma.usageEvent.groupBy({
      by: ['type'],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.user.aggregate({ _sum: { totalListens: true, listeningMs: true } }),
    prisma.user.count({ where: { createdAt: { gte: from }, isGuest: true } }),
    prisma.usageEvent.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    }),
  ]);

  const growth =
    previousSignups > 0
      ? Math.round(((signups - previousSignups) / previousSignups) * 100)
      : signups > 0
        ? 100
        : 0;

  // Busiest days by event volume in the selected range.
  const byDay = new Map<string, number>();
  for (const event of topDays) {
    const key = event.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const busiest = [...byDay.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Period summaries of growth and activity. Export any table as CSV."
        action={
          <div className="flex flex-wrap gap-2">
            {RANGES.map((option) => (
              <a
                key={option.key}
                href={`/reports?range=${option.key}`}
                className={
                  String(days) === option.key
                    ? 'btn-primary'
                    : 'btn-ghost'
                }
              >
                {option.label}
              </a>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="New signups"
          value={formatNumber(signups)}
          hint={`${growth >= 0 ? '+' : ''}${growth}% vs previous period`}
          tone={growth >= 0 ? 'brand' : 'danger'}
        />
        <StatTile
          label="Active users"
          value={formatNumber(activeUsers)}
          hint="Seen in this period"
          tone="info"
        />
        <StatTile
          label="Events recorded"
          value={formatNumber(events)}
          hint="Plays, skips, searches"
          tone="violet"
        />
        <StatTile
          label="Guest signups"
          value={formatNumber(guestSignups)}
          hint={`${signups > 0 ? Math.round((guestSignups / signups) * 100) : 0}% of new users`}
          tone="warn"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card
          title="Activity by type"
          description={`${formatNumber(events)} events in the last ${days} days`}
          action={
            <a href={`/api/reports/events?range=${days}`} className="btn-ghost px-3 py-1.5 text-xs">
              Export CSV
            </a>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-ink-700 bg-ink-900/60">
                <tr>
                  <th className="th">Event</th>
                  <th className="th text-right">Count</th>
                  <th className="th text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {eventsByType.length === 0 ? (
                  <EmptyRow colSpan={3} message="No events in this period." />
                ) : (
                  eventsByType
                    .sort((a, b) => b._count._all - a._count._all)
                    .map((row) => (
                      <tr key={row.type}>
                        <td className="td capitalize text-mist-100">
                          {row.type.replace(/_/g, ' ')}
                        </td>
                        <td className="td text-right tabular-nums">
                          {formatNumber(row._count._all)}
                        </td>
                        <td className="td text-right tabular-nums">
                          {events > 0 ? Math.round((row._count._all / events) * 100) : 0}%
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Busiest days" description="Highest event volume in the period">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="border-b border-ink-700 bg-ink-900/60">
                <tr>
                  <th className="th">Date</th>
                  <th className="th text-right">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {busiest.length === 0 ? (
                  <EmptyRow colSpan={2} message="No events in this period." />
                ) : (
                  busiest.map(([date, count]) => (
                    <tr key={date}>
                      <td className="td text-mist-100">
                        {new Date(date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="td text-right tabular-nums">{formatNumber(count)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title="Exports"
        description="Download raw data for spreadsheets or external reporting."
        className="mt-5"
      >
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <ExportLink
            href="/api/reports/users"
            title="All users"
            detail="Accounts, status, listens and last seen"
          />
          <ExportLink
            href="/api/reports/devices"
            title="Devices"
            detail="Installs, app version and Android version"
          />
          <ExportLink
            href={`/api/reports/events?range=${days}`}
            title="Usage events"
            detail={`Raw events from the last ${days} days`}
          />
        </div>
        <div className="border-t border-ink-700 px-5 py-4 text-xs text-mist-500">
          Lifetime totals: {formatNumber(totals._sum.totalListens ?? 0)} plays ·{' '}
          {formatListeningTime(totals._sum.listeningMs ?? 0n)} of listening.
        </div>
      </Card>
    </>
  );
}

function ExportLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 rounded-lg border border-ink-700 p-4 transition-colors hover:border-brand-500/50 hover:bg-ink-800"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
        <svg viewBox="0 0 24 24" className="size-4 stroke-current" fill="none" strokeWidth="2">
          <path d="M12 3v12M7 12l5 5 5-5M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-mist-100">{title}</span>
        <span className="block text-xs text-mist-500">{detail}</span>
      </span>
    </a>
  );
}
