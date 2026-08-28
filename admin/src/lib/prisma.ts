import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '@/generated/prisma/client';

/**
 * A single Prisma client per process.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new pool on every
 * edit until SQLite refuses more connections.
 *
 * Prisma 7 takes the connection through a driver adapter rather than the schema, so swapping
 * to Postgres means changing this adapter plus the datasource provider — nothing else.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

function getClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && 'banner' in existing && (existing as any).banner) {
    return existing;
  }
  const fresh = createClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = fresh;
  }
  return fresh;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/** BigInt does not survive JSON.stringify; `User.listeningMs` is the only field that needs this. */
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? Number(v) : v))
  ) as T;
}
