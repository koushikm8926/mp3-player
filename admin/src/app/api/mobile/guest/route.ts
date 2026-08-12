import { issueMobileSession } from '@/lib/auth';
import { DeviceSchema, jsonError, jsonOk, publicUser, readJson, upsertDevice } from '@/lib/mobile';
import { prisma } from '@/lib/prisma';
import { getSetting } from '@/lib/settings';

/**
 * POST /api/mobile/guest — "continue without an account".
 *
 * Keyed on the installation id so a guest who reopens the app keeps their existing record
 * instead of inflating the install count on every launch.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError('Malformed request body');

  const allowGuests = await getSetting<boolean>('auth.allowGuestMode', true);
  if (!allowGuests) return jsonError('Guest mode is currently disabled', 403);

  const parsed = DeviceSchema.safeParse(body);
  if (!parsed.success) return jsonError('Invalid device details', 422);

  const installationId = parsed.data.installationId;
  const existingDevice = installationId
    ? await prisma.device.findFirst({
        where: { installationId, user: { isGuest: true, status: 'active' } },
        include: { user: true },
      })
    : null;

  const user =
    existingDevice?.user ??
    (await prisma.user.create({
      data: {
        name: `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
        email: null,
        passwordHash: null,
        isGuest: true,
        lastSeenAt: new Date(),
      },
    }));

  if (existingDevice) {
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  }

  await upsertDevice(user.id, parsed.data);
  const token = await issueMobileSession(user.id);

  return jsonOk({ token, user: publicUser(user) }, existingDevice ? 200 : 201);
}
