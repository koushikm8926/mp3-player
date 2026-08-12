import 'dotenv/config';
import path from 'node:path';

import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 reads the connection URL from here rather than from schema.prisma.
 * Point DATABASE_URL at Postgres (and change the datasource provider) to move off SQLite.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
});
