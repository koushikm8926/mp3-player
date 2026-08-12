import { z } from 'zod';

import { authenticateMobileRequest } from '@/lib/auth';
import { jsonError, jsonOk, publicUser, readJson } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

/** GET /api/mobile/me — validates the bearer token and returns the current profile. */
export async function GET(request: Request) {
  const principal = await authenticateMobileRequest(request);
  if (!principal) return jsonError('Unauthorized', 401);

  const user = await prisma.user.findUnique({ where: { id: principal.userId } });
  if (!user) return jsonError('Unauthorized', 401);

  return jsonOk({ user: publicUser(user) });
}

const PatchSchema = z.object({ name: z.string().trim().min(2).max(80) });

/** PATCH /api/mobile/me — lets a user rename themselves from the app. */
export async function PATCH(request: Request) {
  const principal = await authenticateMobileRequest(request);
  if (!principal) return jsonError('Unauthorized', 401);

  const body = await readJson(request);
  const parsed = PatchSchema.safeParse(body ?? {});
  if (!parsed.success) return jsonError('Name must be between 2 and 80 characters', 422);

  const user = await prisma.user.update({
    where: { id: principal.userId },
    data: { name: parsed.data.name },
  });

  return jsonOk({ user: publicUser(user) });
}
