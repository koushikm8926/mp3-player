import { getCurrentAdmin } from '@/lib/auth';
import { formatDateTime, toCsv } from '@/lib/format';
import { prisma } from '@/lib/prisma';

/** CSV export of every user account. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { devices: true } } },
  });

  const csv = toCsv(
    [
      'id',
      'name',
      'email',
      'type',
      'status',
      'devices',
      'total_listens',
      'listening_minutes',
      'unique_tracks',
      'joined',
      'last_seen',
    ],
    users.map((user) => [
      user.id,
      user.name,
      user.email ?? '',
      user.isGuest ? 'guest' : 'registered',
      user.status,
      user._count.devices,
      user.totalListens,
      Math.round(Number(user.listeningMs) / 60000),
      user.uniqueTracks,
      formatDateTime(user.createdAt),
      formatDateTime(user.lastSeenAt),
    ])
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="minax-users-${stamp}.csv"`,
    },
  });
}
