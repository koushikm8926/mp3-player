import type { NextRequest } from 'next/server';

import { getCurrentAdmin } from '@/lib/auth';
import { formatDateTime, toCsv } from '@/lib/format';
import { prisma } from '@/lib/prisma';

const DAY = 24 * 60 * 60 * 1000;
/** Hard cap so an export can never try to hold a million rows in memory. */
const MAX_ROWS = 50_000;

/** CSV export of raw usage events for a period. */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const days = Math.min(365, Math.max(1, Number(request.nextUrl.searchParams.get('range')) || 30));
  const from = new Date(Date.now() - days * DAY);

  const events = await prisma.usageEvent.findMany({
    where: { createdAt: { gte: from } },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
    include: { user: { select: { name: true, email: true } } },
  });

  const csv = toCsv(
    ['event_id', 'user_id', 'user_name', 'user_email', 'type', 'value', 'metadata', 'created_at'],
    events.map((event) => [
      event.id,
      event.userId,
      event.user.name,
      event.user.email ?? '',
      event.type,
      event.value,
      event.metadata ?? '',
      formatDateTime(event.createdAt),
    ])
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="minax-events-${days}d-${stamp}.csv"`,
    },
  });
}
