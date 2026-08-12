import { getCurrentAdmin } from '@/lib/auth';
import { formatDateTime, toCsv } from '@/lib/format';
import { prisma } from '@/lib/prisma';

/** CSV export of every registered install. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const devices = await prisma.device.findMany({
    orderBy: { lastSeenAt: 'desc' },
    include: { user: { select: { name: true, email: true, status: true } } },
  });

  const csv = toCsv(
    [
      'device_id',
      'user_id',
      'user_name',
      'user_email',
      'user_status',
      'installation_id',
      'platform',
      'app_version',
      'build',
      'os_version',
      'device_name',
      'first_seen',
      'last_seen',
    ],
    devices.map((device) => [
      device.id,
      device.userId,
      device.user.name,
      device.user.email ?? '',
      device.user.status,
      device.installationId ?? '',
      device.platform,
      device.appVersion ?? '',
      device.buildNumber,
      device.osVersion ?? '',
      device.deviceName ?? '',
      formatDateTime(device.createdAt),
      formatDateTime(device.lastSeenAt),
    ])
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="minax-devices-${stamp}.csv"`,
    },
  });
}
