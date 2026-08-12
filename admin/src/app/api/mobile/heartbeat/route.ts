import { z } from 'zod';

import { authenticateMobileRequest } from '@/lib/auth';
import { DeviceSchema, jsonError, jsonOk, readJson, upsertDevice } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';
import { getSettingsMap } from '@/lib/settings';

const HeartbeatSchema = DeviceSchema.extend({
  listens: z.coerce.number().int().min(0).max(10_000_000).default(0),
  listeningMs: z.coerce.number().int().min(0).default(0),
  uniqueTracks: z.coerce.number().int().min(0).max(10_000_000).default(0),
});

/**
 * POST /api/mobile/heartbeat
 *
 * The app calls this on launch, on resume and every five minutes. It drives the "Active
 * users" view and refreshes the denormalised listening counters.
 *
 * Counters are absolute lifetime totals from the device, not deltas, so a retried or
 * out-of-order heartbeat cannot double-count. Public settings ride back on the response so
 * the app picks up maintenance mode without a second request.
 */
export async function POST(request: Request) {
  const principal = await authenticateMobileRequest(request);
  if (!principal) return jsonError('Unauthorized', 401);

  const body = await readJson(request);
  if (!body) return jsonError('Malformed request body');

  const parsed = HeartbeatSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid heartbeat payload', 422);

  await prisma.user.update({
    where: { id: principal.userId },
    data: {
      lastSeenAt: new Date(),
      totalListens: parsed.data.listens,
      listeningMs: BigInt(parsed.data.listeningMs),
      uniqueTracks: parsed.data.uniqueTracks,
    },
  });

  await upsertDevice(principal.userId, parsed.data);

  const settings = await getSettingsMap();
  const publicSettings = Object.fromEntries(
    Object.entries(settings).filter(([key]) => key.startsWith('app.') || key.startsWith('player.'))
  );

  return jsonOk({ ok: true, settings: publicSettings, serverTime: new Date().toISOString() });
}
