'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { hashPassword, recordAudit, requireAdmin, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type SettingsState = { error?: string; success?: string };

/**
 * Saves the settings form.
 *
 * Values are validated against each row's declared `type`, so a numeric setting can never
 * be persisted as "abc" and break the code that reads it.
 */
export async function saveSettings(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const admin = await requireAdmin();
  const rows = await prisma.setting.findMany();
  const updates: Array<{ key: string; value: string }> = [];

  for (const row of rows) {
    const field = `setting:${row.key}`;
    if (!formData.has(field) && row.type !== 'boolean') continue;

    let value: string;
    if (row.type === 'boolean') {
      value = formData.get(field) === 'on' ? 'true' : 'false';
    } else {
      value = String(formData.get(field) ?? '').trim();
    }

    if (row.type === 'number') {
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        return { error: `"${row.label || row.key}" must be a number.` };
      }
    }
    if (row.type === 'json') {
      try {
        JSON.parse(value);
      } catch {
        return { error: `"${row.label || row.key}" must be valid JSON.` };
      }
    }

    if (value !== row.value) updates.push({ key: row.key, value });
  }

  if (updates.length === 0) return { success: 'No changes to save.' };

  await prisma.$transaction(
    updates.map((update) =>
      prisma.setting.update({ where: { key: update.key }, data: { value: update.value } })
    )
  );

  await recordAudit(
    admin.sub,
    'settings.update',
    updates.map((u) => u.key).join(', ')
  );
  revalidatePath('/settings');
  return { success: `Saved ${updates.length} ${updates.length === 1 ? 'setting' : 'settings'}.` };
}

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(10, 'Use at least 10 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'The new passwords do not match',
  });

/** Lets the signed-in admin rotate their own password. */
export async function changePassword(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const claims = await requireAdmin();

  const parsed = PasswordSchema.safeParse({
    currentPassword: String(formData.get('currentPassword') ?? ''),
    newPassword: String(formData.get('newPassword') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the password fields' };
  }

  const admin = await prisma.admin.findUnique({ where: { id: claims.sub } });
  if (!admin) return { error: 'Your session is no longer valid. Sign in again.' };

  if (!(await verifyPassword(parsed.data.currentPassword, admin.passwordHash))) {
    return { error: 'Your current password is not correct.' };
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  await recordAudit(admin.id, 'admin.passwordChange', admin.email);

  return { success: 'Password updated.' };
}
