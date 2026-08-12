'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { recordAudit, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Suspends or reactivates a user. Suspension also kills their live mobile sessions. */
export async function setUserStatus(userId: string, status: 'active' | 'suspended') {
  const admin = await requireAdmin();

  await prisma.user.update({ where: { id: userId }, data: { status } });
  if (status === 'suspended') {
    await prisma.session.deleteMany({ where: { userId } });
  }

  await recordAudit(admin.sub, `user.${status}`, userId);
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
}

/**
 * Soft-deletes a user: the row is retained (so historical counts stay correct) but is
 * anonymised, marked deleted and stripped of credentials and sessions.
 */
export async function deleteUser(userId: string) {
  const admin = await requireAdmin();

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

  await recordAudit(admin.sub, 'user.delete', userId);
  revalidatePath('/users');
  redirect('/users');
}

/** Ends every signed-in device for a user without changing their account status. */
export async function revokeSessions(userId: string) {
  const admin = await requireAdmin();
  const { count } = await prisma.session.deleteMany({ where: { userId } });
  await recordAudit(admin.sub, 'user.revokeSessions', userId, `${count} sessions`);
  revalidatePath(`/users/${userId}`);
}
