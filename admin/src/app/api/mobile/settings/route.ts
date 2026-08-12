import { jsonOk } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';
import { coerceSetting } from '@/lib/settings';

/**
 * GET /api/mobile/settings
 *
 * Returns only settings flagged `isPublic`. Operational values such as password policy
 * and retention windows are deliberately not exposed to the client.
 */
export async function GET() {
  const rows = await prisma.setting.findMany({ where: { isPublic: true } });

  return jsonOk({
    settings: Object.fromEntries(rows.map((row) => [row.key, coerceSetting(row.type, row.value)])),
    serverTime: new Date().toISOString(),
  });
}
