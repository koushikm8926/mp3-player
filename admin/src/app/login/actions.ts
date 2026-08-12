'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { ADMIN_COOKIE, createAdminToken, recordAudit, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const LoginSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

/**
 * Signs an administrator in.
 *
 * Wrong email and wrong password return the same message and both paths run a bcrypt
 * comparison, so response timing does not reveal whether an account exists.
 */
export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
    next: String(formData.get('next') ?? ''),
  });

  if (!parsed.success) {
    return { error: 'Enter a valid email address and password.' };
  }

  const admin = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
  const passwordMatches = await verifyPassword(
    parsed.data.password,
    admin?.passwordHash ??
      // Dummy hash of a random value; keeps the timing of a missing account comparable.
      '$2a$12$C6UzMDM.H6dfI/f/IKcEe.4Q8g0wQ0jJ5rTBv0oJ6Q0hCw0eZ0Zpq'
  );

  if (!admin || !admin.isActive || !passwordMatches) {
    await recordAudit(admin?.id ?? null, 'admin.login.failed', parsed.data.email);
    return { error: 'Those credentials are not valid.' };
  }

  const token = await createAdminToken({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 60 * 60,
  });

  const headerList = await headers();
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await recordAudit(
    admin.id,
    'admin.login',
    admin.email,
    '',
    headerList.get('x-forwarded-for') ?? ''
  );

  // Only same-origin relative paths are accepted, so `?next=` cannot be used as an open redirect.
  const target =
    parsed.data.next && parsed.data.next.startsWith('/') && !parsed.data.next.startsWith('//')
      ? parsed.data.next
      : '/';
  redirect(target);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect('/login');
}
