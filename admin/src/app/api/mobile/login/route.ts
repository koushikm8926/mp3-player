import { z } from 'zod';

import { issueMobileSession, verifyPassword } from '@/lib/auth';
import { DeviceSchema, jsonError, jsonOk, publicUser, readJson, upsertDevice } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

const LoginSchema = DeviceSchema.extend({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

/** Dummy bcrypt hash so a missing account costs the same time as a wrong password. */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.4Q8g0wQ0jJ5rTBv0oJ6Q0hCw0eZ0Zpq';

/** POST /api/mobile/login */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError('Malformed request body');

  const parsed = LoginSchema.safeParse({
    ...body,
    email: String(body.email ?? '').trim().toLowerCase(),
  });
  if (!parsed.success) return jsonError('Enter a valid email and password', 422);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const matches = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !user.passwordHash || !matches) {
    return jsonError('Those credentials are not valid', 401);
  }
  if (user.status === 'suspended') {
    return jsonError('This account has been suspended', 403);
  }
  if (user.status === 'deleted') {
    return jsonError('This account no longer exists', 403);
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  await upsertDevice(user.id, parsed.data);
  const token = await issueMobileSession(user.id);

  return jsonOk({ token, user: publicUser(user) });
}
