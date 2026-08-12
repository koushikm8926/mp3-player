import { prisma } from './prisma';

/** Coerces a Setting row's string value to its declared type. */
export function coerceSetting(type: string, value: string): string | number | boolean | unknown {
  switch (type) {
    case 'number': {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    case 'boolean':
      return value === 'true' || value === '1';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    default:
      return value;
  }
}

export async function getSettingsMap(): Promise<Record<string, unknown>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, coerceSetting(row.type, row.value)]));
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  return coerceSetting(row.type, row.value) as T;
}

/** Minutes since last heartbeat within which a device still counts as "active". */
export async function getActiveWindowMinutes(): Promise<number> {
  return getSetting<number>('analytics.activeWindowMinutes', 30);
}

export async function activeSince(): Promise<Date> {
  const minutes = await getActiveWindowMinutes();
  return new Date(Date.now() - minutes * 60 * 1000);
}
