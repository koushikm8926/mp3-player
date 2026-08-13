'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { recordAudit, requireAdmin } from '@/lib/auth';
import { revokeUserTokens, setUserDisabled } from '@/lib/firebaseAdmin';
import { prisma } from '@/lib/prisma';

/**
 * Ends every live session a user has, across both credential systems:
 *
 *  - guests hold opaque session rows, deleted here;
 *  - signed-in users hold Firebase refresh tokens, revoked in Firebase. The mobile verifier
 *    passes `checkRevoked`, so the next API call from that device fails.
 */
async function endAllSessions(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firebaseUid: true },
  });

  const { count } = await prisma.session.deleteMany({ where: { userId } });
  if (user?.firebaseUid) await revokeUserTokens(user.firebaseUid);
  return count;
}

/** Suspends or reactivates a user. Suspension also kills their live mobile sessions. */
export async function setUserStatus(userId: string, status: 'active' | 'suspended') {
  const admin = await requireAdmin();

  await prisma.user.update({ where: { id: userId }, data: { status } });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firebaseUid: true },
  });

  if (status === 'suspended') {
    await endAllSessions(userId);
    if (user?.firebaseUid) await setUserDisabled(user.firebaseUid, true);
  } else if (user?.firebaseUid) {
    await setUserDisabled(user.firebaseUid, false);
  }

  await recordAudit(admin.sub, `user.${status}`, userId);
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
}

/**
 * Soft-deletes a user: the row is retained (so historical counts stay correct) but is
 * anonymised, marked deleted and stripped of credentials and sessions.
 *
 * `firebaseUid` is deliberately kept. It is the only thing that lets a returning sign-in be
 * recognised as this deleted account rather than silently creating a fresh row, which would
 * let a deleted user walk straight back in. The Firebase account is disabled to match.
 */
export async function deleteUser(userId: string) {
  const admin = await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firebaseUid: true },
  });

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        email: null,
        passwordHash: null,
        name: 'Deleted user',
      },
    }),
  ]);

  if (user?.firebaseUid) {
    await revokeUserTokens(user.firebaseUid);
    await setUserDisabled(user.firebaseUid, true);
  }

  await recordAudit(admin.sub, 'user.delete', userId);
  revalidatePath('/users');
  redirect('/users');
}

/** Ends every signed-in device for a user without changing their account status. */
export async function revokeSessions(userId: string) {
  const admin = await requireAdmin();
  const count = await endAllSessions(userId);
  await recordAudit(admin.sub, 'user.revokeSessions', userId, `${count} sessions`);
  revalidatePath(`/users/${userId}`);
}
