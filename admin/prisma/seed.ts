import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Creates the first admin, the default application settings and the initial app version.
 *
 * Safe to re-run: everything is upserted. Pass `--demo` to also generate sample users,
 * devices and usage events so the dashboard and reports have something to show.
 */
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' }),
});

const DEFAULT_SETTINGS = [
  {
    key: 'app.name',
    value: 'Melophile',
    type: 'string',
    label: 'Application name',
    description: 'Shown in the mobile app and in emails.',
    group: 'general',
    isPublic: true,
  },
  {
    key: 'app.supportEmail',
    value: 'support@minaxdigital.com',
    type: 'string',
    label: 'Support email',
    description: 'Where users are told to write when something breaks.',
    group: 'general',
    isPublic: true,
  },
  {
    key: 'app.maintenanceMode',
    value: 'false',
    type: 'boolean',
    label: 'Maintenance mode',
    description: 'When on, the app shows a maintenance notice instead of syncing.',
    group: 'general',
    isPublic: true,
  },
  {
    key: 'app.maintenanceMessage',
    value: 'We are performing scheduled maintenance. Playback is unaffected.',
    type: 'string',
    label: 'Maintenance message',
    description: 'Shown while maintenance mode is on.',
    group: 'general',
    isPublic: true,
  },
  {
    key: 'auth.allowRegistration',
    value: 'true',
    type: 'boolean',
    label: 'Allow new registrations',
    description: 'Turn off to stop new accounts being created from the app.',
    group: 'auth',
    isPublic: true,
  },
  {
    key: 'auth.allowGuestMode',
    value: 'true',
    type: 'boolean',
    label: 'Allow guest mode',
    description: 'Lets users skip registration and use the player anonymously.',
    group: 'auth',
    isPublic: true,
  },
  {
    key: 'auth.minPasswordLength',
    value: '8',
    type: 'number',
    label: 'Minimum password length',
    description: 'Enforced on registration.',
    group: 'auth',
    isPublic: false,
  },
  {
    key: 'analytics.activeWindowMinutes',
    value: '30',
    type: 'number',
    label: 'Active-user window (minutes)',
    description: 'A device seen within this window counts as currently active.',
    group: 'analytics',
    isPublic: false,
  },
  {
    key: 'analytics.retentionDays',
    value: '180',
    type: 'number',
    label: 'Event retention (days)',
    description: 'Usage events older than this can be pruned.',
    group: 'analytics',
    isPublic: false,
  },
  {
    key: 'player.defaultCrossfadeSeconds',
    value: '0',
    type: 'number',
    label: 'Default crossfade (seconds)',
    description: 'Suggested crossfade for fresh installs. 0 disables it.',
    group: 'player',
    isPublic: true,
  },
  {
    key: 'player.maxPlaylistSize',
    value: '2000',
    type: 'number',
    label: 'Maximum playlist size',
    description: 'Upper bound on tracks per playlist.',
    group: 'player',
    isPublic: true,
  },
];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@minaxdigital.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const name = process.env.SEED_ADMIN_NAME ?? 'Melophile Administrator';

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { name, role: 'superadmin', isActive: true },
    create: { email, name, passwordHash, role: 'superadmin' },
  });
  console.log(`✔ Admin ready: ${admin.email}`);

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      // Only metadata is refreshed on re-seed; an operator's edited value is preserved.
      update: {
        label: setting.label,
        description: setting.description,
        group: setting.group,
        type: setting.type,
        isPublic: setting.isPublic,
      },
      create: setting,
    });
  }
  console.log(`✔ ${DEFAULT_SETTINGS.length} settings ready`);

  await prisma.appVersion.upsert({
    where: { platform_buildNumber: { platform: 'android', buildNumber: 1 } },
    update: { isCurrent: true },
    create: {
      platform: 'android',
      version: '1.0.0',
      buildNumber: 1,
      releaseNotes: 'First release of Melophile.',
      isCurrent: true,
      minSupported: 1,
    },
  });
  console.log('✔ App version 1.0.0 (build 1) registered');

  if (process.argv.includes('--demo')) {
    await seedDemoData();
  }
}

/** Sample data so the dashboard, statistics and reports are not empty on a fresh install. */
async function seedDemoData() {
  const FIRST = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Ananya', 'Vikram', 'Priya', 'Arjun', 'Neha',
    'Sofia', 'Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Ava', 'Lucas', 'Mia', 'Leo'];
  const LAST = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Silva', 'Costa', 'Meyer', 'Dubois', 'Rossi'];
  const VERSIONS = ['1.0.0', '1.0.0', '1.0.0', '0.9.5'];
  const DEVICES = ['Pixel 7', 'Galaxy S23', 'OnePlus 11', 'Redmi Note 12', 'Moto G84'];
  const EVENT_TYPES = ['play', 'play', 'play', 'skip', 'search', 'playlist_created'];

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let created = 0;

  for (let i = 0; i < 48; i += 1) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[i % LAST.length];
    const isGuest = i % 7 === 0;
    const createdAt = new Date(now - Math.floor(Math.random() * 60) * DAY);
    // A quarter of the sample is dormant so "active users" is a meaningful subset.
    const lastSeenAt =
      i % 4 === 0
        ? new Date(now - Math.floor(Math.random() * 20) * DAY)
        : new Date(now - Math.floor(Math.random() * 90) * 60 * 1000);

    const email = isGuest ? null : `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const listens = Math.floor(Math.random() * 900) + 10;

    const user = await prisma.user.create({
      data: {
        email,
        name: isGuest ? `Guest ${1000 + i}` : `${first} ${last}`,
        passwordHash: isGuest ? null : await bcrypt.hash('Password@123', 10),
        isGuest,
        status: i % 17 === 0 ? 'suspended' : 'active',
        createdAt,
        lastSeenAt,
        totalListens: listens,
        listeningMs: BigInt(listens * 210_000),
        uniqueTracks: Math.floor(listens / 3) + 5,
        devices: {
          create: {
            installationId: `demo-install-${i}`,
            platform: 'android',
            osVersion: String(11 + (i % 4)),
            appVersion: VERSIONS[i % VERSIONS.length],
            buildNumber: VERSIONS[i % VERSIONS.length] === '1.0.0' ? 1 : 0,
            deviceName: DEVICES[i % DEVICES.length],
            lastSeenAt,
            createdAt,
          },
        },
      },
    });

    const eventCount = 6 + Math.floor(Math.random() * 14);
    await prisma.usageEvent.createMany({
      data: Array.from({ length: eventCount }, () => ({
        userId: user.id,
        type: EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)],
        value: 1,
        createdAt: new Date(now - Math.floor(Math.random() * 30) * DAY),
      })),
    });
    created += 1;
  }

  console.log(`✔ ${created} demo users with devices and usage events`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
