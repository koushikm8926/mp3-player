import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from './prisma';

/** Shared plumbing for the `/api/mobile/*` routes. */

export const DeviceSchema = z.object({
  platform: z.string().max(32).default('android'),
  osVersion: z.string().max(32).optional(),
  appVersion: z.string().max(32).optional(),
  buildNumber: z.coerce.number().int().min(0).default(0),
  deviceName: z.string().max(120).optional(),
  installationId: z.string().max(120).optional(),
});

export type DeviceInput = z.infer<typeof DeviceSchema>;

export function jsonError(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * The origin the caller actually dialled, for building absolute URLs it can reach.
 *
 * `new URL(request.url).origin` is the server's own bind address — `0.0.0.0:3000` under
 * `next dev` — which is useless to a client: Android resolves 0.0.0.0 to its own loopback and
 * the connection is refused. The Host header is the address the client used, so URLs built
 * from it work from an emulator (10.0.2.2), over the LAN and behind a proxy alike.
 */
export function requestOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return new URL(request.url).origin;
  // Only a proxy knows whether the public leg is TLS; otherwise we speak what we serve.
  const proto =
    request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
  return `${proto}://${host}`;
}

/** Parses a JSON body, returning null rather than throwing on malformed input. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Records the calling device against a user.
 *
 * Keyed on `installationId` so reinstalling the app updates the existing row instead of
 * inflating the device count. Devices that report no installation id fall back to the
 * user's most recent device for the same name.
 */
export async function upsertDevice(userId: string, device: DeviceInput): Promise<void> {
  const now = new Date();
  const data = {
    platform: device.platform,
    osVersion: device.osVersion ?? null,
    appVersion: device.appVersion ?? null,
    buildNumber: device.buildNumber,
    deviceName: device.deviceName ?? null,
    lastSeenAt: now,
  };

  if (device.installationId) {
    await prisma.device.upsert({
      where: { userId_installationId: { userId, installationId: device.installationId } },
      update: data,
      create: { userId, installationId: device.installationId, ...data },
    });
    return;
  }

  const existing = await prisma.device.findFirst({
    where: { userId, deviceName: device.deviceName ?? null },
    orderBy: { lastSeenAt: 'desc' },
  });

  if (existing) {
    await prisma.device.update({ where: { id: existing.id }, data });
  } else {
    await prisma.device.create({ data: { userId, installationId: null, ...data } });
  }
}

/** The user shape returned to the app. Never includes the password hash. */
export function publicUser(user: {
  id: string;
  name: string;
  email: string | null;
  isGuest: boolean;
  status: string;
  createdAt: Date;
  totalListens: number;
  listeningMs: bigint;
  uniqueTracks: number;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isGuest: user.isGuest,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    stats: {
      totalListens: user.totalListens,
      listeningMs: Number(user.listeningMs),
      uniqueTracks: user.uniqueTracks,
    },
  };
}
