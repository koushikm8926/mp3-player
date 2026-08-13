import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

import { verifyIdToken } from './firebaseAdmin';
import { prisma } from './prisma';

/**
 * Three credentials live here:
 *
 *  - Admins sign in to the panel and get a short-lived JWT in an httpOnly cookie.
 *  - App users sign in through Firebase Authentication and present a Firebase ID token.
 *    Firebase owns their password/Google identity; this service only verifies the token and
 *    maps the UID onto a local `User` row so the dashboard has something to show.
 *  - Guests ("continue without an account") have no Firebase identity, so they keep the
 *    opaque device-bound bearer token whose SHA-256 hash is stored in `Session`.
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

export type MobilePrincipal = {
  userId: string;
  /** Present only for guest sessions, which are the sole remaining opaque-token holders. */
  sessionId?: string;
  firebaseUid?: string;
};

/** Extracts the raw bearer token, or null when the header is missing or malformed. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Firebase ID tokens are JWTs, so they always carry two dots; the guest tokens this service
 * issues are 64 hex characters and never do. That is enough to route a bearer token to the
 * right verifier without trying both on every request.
 */
function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3;
}

/**
 * Resolves an `Authorization: Bearer <token>` header to a user, or null.
 *
 * Accepts a Firebase ID token (signed-in users) or an opaque guest session token. A verified
 * Firebase token whose UID has no local row yet resolves to null — the app is expected to
 * call `POST /api/mobile/session` once after sign-in to create it.
 */
export async function authenticateMobileRequest(
  request: Request
): Promise<MobilePrincipal | null> {
  const token = bearerToken(request);
  if (!token) return null;

  if (looksLikeJwt(token)) {
    const decoded = await verifyIdToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, status: true },
    });
    if (!user || user.status !== 'active') return null;

    return { userId: user.id, firebaseUid: decoded.uid };
  }

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
