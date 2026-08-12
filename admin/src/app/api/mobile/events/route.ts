import { z } from 'zod';

import { authenticateMobileRequest } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

const EVENT_TYPES = ['play', 'skip', 'search', 'playlist_created', 'session', 'backup'] as const;

const EventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  value: z.coerce.number().int().min(0).max(1_000_000).default(1),
  metadata: z.string().max(500).optional(),
  createdAt: z.coerce.number().int().optional(),
});

const BatchSchema = z.object({ events: z.array(EventSchema).max(200) });

/**
 * POST /api/mobile/events
 *
 * Bulk endpoint for the app's offline outbox. Unknown event types are rejected rather than
 * stored, so the Reports page never has to cope with arbitrary strings.
 */
export async function POST(request: Request) {
  const principal = await authenticateMobileRequest(request);
  if (!principal) return jsonError('Unauthorized', 401);

  const body = await readJson(request);
  if (!body) return jsonError('Malformed request body');

  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Invalid events payload', 422, {
      detail: parsed.error.issues[0]?.message,
    });
  }
  if (parsed.data.events.length === 0) return jsonOk({ accepted: 0 });

  const now = Date.now();
  await prisma.usageEvent.createMany({
    data: parsed.data.events.map((event) => ({
      userId: principal.userId,
      type: event.type,
      value: event.value,
      metadata: event.metadata ?? null,
      // Client clocks can be wrong or ahead; never store a future timestamp.
      createdAt: new Date(Math.min(event.createdAt ?? now, now)),
    })),
  });

  return jsonOk({ accepted: parsed.data.events.length });
}
