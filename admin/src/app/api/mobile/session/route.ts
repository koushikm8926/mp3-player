import { bearerToken } from '@/lib/auth';
import { isFirebaseConfigured, verifyIdToken } from '@/lib/firebaseAdmin';
import { DeviceSchema, jsonError, jsonOk, publicUser, readJson, upsertDevice } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/mobile/session
 *
 * Called by the app immediately after a Firebase sign-in (email/password or Google) and on
 * every cold start while signed in. It exchanges a verified Firebase ID token for the local
 * `User` row the admin dashboard reports on, creating it on first sight.
 *
 * This is the only place a user row is created for a Firebase identity — every other mobile
 * route requires the row to already exist.
 */
export async function POST(request: Request) {
  if (!isFirebaseConfigured()) {
    return jsonError('Firebase is not configured on the server', 503);
  }

  const token = bearerToken(request);
  if (!token) return jsonError('Missing bearer token', 401);

  const decoded = await verifyIdToken(token);
  if (!decoded) return jsonError('That sign-in could not be verified', 401);

  const body = (await readJson(request)) ?? {};
  const parsed = DeviceSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid device payload', 422);

  const email = decoded.email?.toLowerCase() ?? null;
  // `firebase.sign_in_provider` is the provider used for THIS token, which is what we want:
  // it reflects how the user actually got here.
  const provider = decoded.firebase?.sign_in_provider === 'google.com' ? 'google' : 'password';
  const name =
    decoded.name?.trim() ||
    (email ? email.split('@')[0] : '') ||
    'Listener';

  const existing = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });

  if (existing) {
    if (existing.status !== 'active') {
      return jsonError(
        existing.status === 'suspended'
          ? 'This account has been suspended'
          : 'This account no longer exists',
        403
      );
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { email, name, provider, lastSeenAt: new Date() },
    });
    await upsertDevice(user.id, parsed.data);
    return jsonOk({ user: publicUser(user) });
  }

  /**
   * An account may already exist under this email from the pre-Firebase password era, or
   * from a guest install that later signed up. Claim it rather than creating a duplicate —
   * that keeps the listening history and device records attached to the same person.
   */
  const byEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (byEmail) {
    if (byEmail.firebaseUid && byEmail.firebaseUid !== decoded.uid) {
      return jsonError('That email is already linked to a different sign-in', 409);
    }
    if (byEmail.status !== 'active') {
      return jsonError('This account is not active', 403);
    }

    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        firebaseUid: decoded.uid,
        name,
        provider,
        isGuest: false,
        passwordHash: null,
        lastSeenAt: new Date(),
      },
    });
    await upsertDevice(user.id, parsed.data);
    return jsonOk({ user: publicUser(user) });
  }

  const user = await prisma.user.create({
    data: {
      firebaseUid: decoded.uid,
      email,
      name,
      provider,
      isGuest: false,
      lastSeenAt: new Date(),
    },
  });
  await upsertDevice(user.id, parsed.data);

  return jsonOk({ user: publicUser(user) }, 201);
}
