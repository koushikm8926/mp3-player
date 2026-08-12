import { z } from 'zod';

import { hashPassword, issueMobileSession } from '@/lib/auth';
import { DeviceSchema, jsonError, jsonOk, publicUser, readJson, upsertDevice } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings';

const RegisterSchema = DeviceSchema.extend({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  password: z.string().min(8).max(200),
});

/** POST /api/mobile/register — creates an account from the app. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError('Malformed request body');

  const allowRegistration = await getSetting<boolean>('auth.allowRegistration', true);
  if (!allowRegistration) {
    return jsonError('Registration is currently disabled', 403);
  }

  const minLength = await getSetting<number>('auth.minPasswordLength', 8);
  const parsed = RegisterSchema.safeParse({
    ...body,
    email: String(body.email ?? '').trim().toLowerCase(),
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid registration details', 422);
  }
  if (parsed.data.password.length < minLength) {
    return jsonError(`Password must be at least ${minLength} characters`, 422);
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return jsonError('An account with that email already exists', 409);
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      isGuest: false,
      lastSeenAt: new Date(),
    },
  });

  await upsertDevice(user.id, parsed.data);
  const token = await issueMobileSession(user.id);

  return jsonOk({ token, user: publicUser(user) }, 201);
}
