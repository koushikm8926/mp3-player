import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

import { prisma } from './prisma';

/**
 * Two separate credentials live here:
 *
 *  - Admins sign in to the panel and get a short-lived JWT in an httpOnly cookie.
 *  - App users sign in from the phone and get an opaque bearer token whose SHA-256 hash is
 *    stored in `Session`. Opaque tokens can be revoked server-side (sign-out, suspension),
 *    which a stateless JWT cannot.
 */

export const ADMIN_COOKIE = 'minax_admin_session';
const ADMIN_TOKEN_TTL = '8h';
const MOBILE_TOKEN_TTL_DAYS = 180;
const BCRYPT_ROUNDS = 12;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or shorter than 32 characters. Set it in admin/.env before starting the server.'
    );
  }
  return new TextEncoder().encode(secret);
}

// ---------------------------------------------------------------------------- passwords

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------------------------------------------------------------------------- admin session

export type AdminClaims = { sub: string; email: string; name: string; role: string };

export async function createAdminToken(claims: AdminClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name, role: claims.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(ADMIN_TOKEN_TTL)
    .sign(secretKey());
}

export async function readAdminToken(token: string): Promise<AdminClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: String(payload.role ?? 'admin'),
    };
  } catch {
    return null;
  }
}

/** Reads the signed-in admin from the request cookies. Returns null when signed out. */
export async function getCurrentAdmin(): Promise<AdminClaims | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return readAdminToken(token);
}

/** Use in server components and route handlers that must not render for anonymous callers. */
export async function requireAdmin(): Promise<AdminClaims> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error('UNAUTHORIZED');
  return admin;
}

// ---------------------------------------------------------------------------- mobile session

export function generateMobileToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function issueMobileSession(userId: string): Promise<string> {
  const token = generateMobileToken();
  const expiresAt = new Date(Date.now() + MOBILE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return token;
}

export type MobilePrincipal = { userId: string; sessionId: string };

/** Resolves an `Authorization: Bearer <token>` header to a user, or null. */
export async function authenticateMobileRequest(
  request: Request
): Promise<MobilePrincipal | null> {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, status: true } } },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== 'active') return null;

  return { userId: session.userId, sessionId: session.id };
}

export async function revokeMobileSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

/** Constant-time compare for anything secret that is not a bcrypt hash. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

// ---------------------------------------------------------------------------- audit

export async function recordAudit(
  adminId: string | null,
  action: string,
  target = '',
  detail = '',
  ip = ''
): Promise<void> {
  await prisma.auditLog.create({ data: { adminId, action, target, detail, ip } }).catch(() => {});
}
