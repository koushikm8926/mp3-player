import type { Metadata } from 'next';
import Link from 'next/link';

import { Avatar, Card, EmptyRow, PageHeader, StatTile } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getActiveWindowMinutes } from '@/lib/settings';

export const metadata: Metadata = { title: 'Active users' };
export const dynamic = 'force-dynamic';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Who is using the app right now, plus the shape of recent activity. */
export default async function ActiveUsersPage() {
  await requireAdmin();

  const windowMinutes = await getActiveWindowMinutes();
  const now = Date.now();
  const since = new Date(now - windowMinutes * MINUTE);

  const [live, dau, wau, mau, sessions, recent] = await Promise.all([
    prisma.user.count({ where: { lastSeenAt: { gte: since }, status: 'active' } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - DAY) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - 30 * DAY) } } }),
    prisma.session.count({ where: { expiresAt: { gte: new Date() } } }),
    prisma.user.findMany({
      where: { lastSeenAt: { gte: new Date(now - DAY) } },
      orderBy: { lastSeenAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        isGuest: true,
        lastSeenAt: true,
        totalListens: true,
        devices: {
          orderBy: { lastSeenAt: 'desc' },
          take: 1,
          select: { deviceName: true, appVersion: true, osVersion: true },
        },
      },
    }),
  ]);

  // Hourly buckets over the last 24 hours, based on when each device last checked in.
  const heartbeats = await prisma.device.findMany({
    where: { lastSeenAt: { gte: new Date(now - DAY) } },
    select: { lastSeenAt: true },
  });
  const hourly = Array.from({ length: 24 }, (_, index) => {
    const hourStart = now - (23 - index) * HOUR;
    const count = heartbeats.filter(
      (h) => h.lastSeenAt.getTime() >= hourStart && h.lastSeenAt.getTime() < hourStart + HOUR
    ).length;
    return { label: new Date(hourStart).getHours(), count };
  });
  const peak = Math.max(1, ...hourly.map((h) => h.count));

  const stickiness = mau > 0 ? Math.round((dau / mau) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Active users"
        description={`A user counts as active when their app has checked in within the last ${windowMinutes} minutes.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active now"
          value={formatNumber(live)}
          hint={`Within ${windowMinutes} minutes`}
          tone="brand"
        />
        <StatTile label="Daily active" value={formatNumber(dau)} hint="Last 24 hours" tone="info" />
        <StatTile label="Weekly active" value={formatNumber(wau)} hint="Last 7 days" tone="violet" />
        <StatTile
          label="Stickiness"
          value={`${stickiness}%`}
          hint={`DAU / MAU · ${formatNumber(mau)} monthly`}
          tone="warn"
        />
      </div>

      <Card
        title="Check-ins by hour"
        description={`${formatNumber(sessions)} valid sessions issued`}
        className="mt-6"
      >
        <div className="flex h-44 items-end gap-1 px-5 py-5">
          {hourly.map((bucket, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-info-500/70"
                  style={{ height: `${Math.max(2, (bucket.count / peak) * 100)}%` }}
                  title={`${bucket.label}:00 — ${bucket.count} devices`}
                />
              </div>
              {index % 3 === 0 ? (
                <span className="text-[10px] tabular-nums text-mist-500">{bucket.label}</span>
              ) : (
                <span className="text-[10px]">&nbsp;</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Recently active"
        description="Up to 50 users seen in the last 24 hours"
        className="mt-5 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-ink-700 bg-ink-900/60">
              <tr>
                <th className="th">User</th>
                <th className="th">Device</th>
                <th className="th">App version</th>
                <th className="th text-right">Listens</th>
                <th className="th">Last check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {recent.length === 0 ? (
                <EmptyRow colSpan={5} message="No activity in the last 24 hours." />
              ) : (
                recent.map((user) => {
                  const device = user.devices[0];
                  const online = user.lastSeenAt != null && user.lastSeenAt >= since;
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-ink-800/60">
                      <td className="td">
                        <Link href={`/users/${user.id}`} className="flex items-center gap-3">
                          <span className="relative">
                            <Avatar name={user.name} size={32} />
                            {online ? (
                              <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-ink-850 bg-brand-500" />
                            ) : null}
                          </span>
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
                      <td className="td">
                        {device?.deviceName ?? '—'}
                        {device?.osVersion ? (
                          <span className="block text-xs text-mist-500">
                            Android {device.osVersion}
                          </span>
                        ) : null}
                      </td>
                      <td className="td">{device?.appVersion ? `v${device.appVersion}` : '—'}</td>
                      <td className="td text-right tabular-nums">
                        {formatNumber(user.totalListens)}
                      </td>
                      <td className="td" title={formatDateTime(user.lastSeenAt)}>
                        {formatRelative(user.lastSeenAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
