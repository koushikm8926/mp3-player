import type { Metadata } from 'next';
import Link from 'next/link';

import { UserFilters } from '@/components/UserFilters';
import { Avatar, Card, EmptyRow, PageHeader, StatusBadge } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { formatListeningTime, formatNumber, formatRelative } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';

export const metadata: Metadata = { title: 'Registered users' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

type SearchParams = {
  q?: string;
  status?: string;
  type?: string;
  sort?: string;
  page?: string;
};

const SORTS: Record<string, Prisma.UserOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  active: { lastSeenAt: 'desc' },
  listens: { totalListens: 'desc' },
  name: { name: 'asc' },
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const query = (params.q ?? '').trim();
  const status = params.status ?? 'all';
  const type = params.type ?? 'all';
  const sort = params.sort && SORTS[params.sort] ? params.sort : 'newest';
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.UserWhereInput = {};
  if (query) {
    // SQLite's LIKE is already case-insensitive for ASCII, which covers emails and
    // the Latin-script names the panel deals with.
    where.OR = [{ name: { contains: query } }, { email: { contains: query } }, { id: query }];
  }
  if (status !== 'all') where.status = status;
  if (type === 'registered') where.isGuest = false;
  if (type === 'guest') where.isGuest = true;

  const [users, total, counts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: SORTS[sort],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        isGuest: true,
        status: true,
        createdAt: true,
        lastSeenAt: true,
        totalListens: true,
        listeningMs: true,
        _count: { select: { devices: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = Object.fromEntries(counts.map((row) => [row.status, row._count._all]));

  return (
    <>
      <PageHeader
        title="Registered users"
        description={`${formatNumber(total)} matching ${total === 1 ? 'user' : 'users'} · ${formatNumber(
          summary.active ?? 0
        )} active, ${formatNumber(summary.suspended ?? 0)} suspended`}
      />

      <UserFilters query={query} status={status} type={type} sort={sort} />

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead className="border-b border-ink-700 bg-ink-900/60">
              <tr>
                <th className="th">User</th>
                <th className="th">Status</th>
                <th className="th">Devices</th>
                <th className="th text-right">Listens</th>
                <th className="th text-right">Listening time</th>
                <th className="th">Last seen</th>
                <th className="th">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {users.length === 0 ? (
                <EmptyRow colSpan={7} message="No users match these filters." />
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-ink-800/60">
                    <td className="td">
                      <Link href={`/users/${user.id}`} className="flex items-center gap-3">
                        <Avatar name={user.name} size={34} />
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
                      <div className="flex items-center gap-2">
                        <StatusBadge status={user.status} />
                        {user.isGuest ? (
                          <span className="text-xs text-mist-500">guest</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="td tabular-nums">{user._count.devices}</td>
                    <td className="td text-right tabular-nums">
                      {formatNumber(user.totalListens)}
                    </td>
                    <td className="td text-right tabular-nums">
                      {formatListeningTime(user.listeningMs)}
                    </td>
                    <td className="td">{formatRelative(user.lastSeenAt)}</td>
                    <td className="td">{formatRelative(user.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <nav className="flex items-center justify-between gap-3 border-t border-ink-700 px-5 py-3.5">
            <p className="text-xs text-mist-500">
              Page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <PageLink params={params} page={page - 1} disabled={page <= 1} label="Previous" />
              <PageLink
                params={params}
                page={page + 1}
                disabled={page >= pageCount}
                label="Next"
              />
            </div>
          </nav>
        ) : null}
      </Card>
    </>
  );
}

function PageLink({
  params,
  page,
  disabled,
  label,
}: {
  params: SearchParams;
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return <span className="btn-ghost pointer-events-none opacity-40">{label}</span>;
  }
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== 'page') next.set(key, value);
  }
  next.set('page', String(page));
  return (
    <Link href={`/users?${next.toString()}`} className="btn-ghost">
      {label}
    </Link>
  );
}
