import { z } from 'zod';

import { authenticateMobileRequest } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

const DurationSchema = z.object({
  // 12 hours is far past any real track and keeps a malformed report from poisoning the row.
  durationMs: z.coerce.number().int().min(1).max(12 * 60 * 60 * 1000),
});

/**
 * POST /api/mobile/songs/[id]/duration
 *
 * The panel cannot decode audio server-side, so `Song.durationMs` starts null and the track
 * lists as 0:00 until something measures it. The first app to play the track knows the real
 * duration from the platform decoder and reports it here.
 *
 * Writes only when the column is still null: the first measurement is authoritative, so a
 * later device — possibly mid-buffer, possibly on a bad connection — cannot overwrite a good
 * value with a worse one, and repeat reports cost a single indexed read.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const principal = await authenticateMobileRequest(request);
  if (!principal) return jsonError('Unauthorized', 401);

  const { id } = await params;

  const body = await readJson(request);
  if (!body) return jsonError('Malformed request body');

  const parsed = DurationSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid duration payload', 422);

  const song = await prisma.song.findUnique({ where: { id }, select: { durationMs: true } });
  if (!song) return jsonError('Not found', 404);

  if (song.durationMs != null) {
    return jsonOk({ durationMs: song.durationMs, stored: false });
  }

  const updated = await prisma.song.update({
    where: { id },
    data: { durationMs: parsed.data.durationMs },
    select: { durationMs: true },
  });

  return jsonOk({ durationMs: updated.durationMs, stored: true });
}
