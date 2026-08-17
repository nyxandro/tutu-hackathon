/**
 * Клиент Prisma. Синглтон через globalThis, иначе hot reload в dev плодит
 * подключения к Postgres и они упираются в лимит.
 *
 * Экспорты:
 * - prisma — единственный экземпляр PrismaClient
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/lib/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

// Строка подключения обязательна: без базы не работают ни история диалогов,
// ни кэш MCP, поэтому падаем сразу и с понятной причиной.
if (!connectionString) {
  throw new Error(
    'APP_DATABASE_URL_MISSING: не задан DATABASE_URL. Проверьте .env и что контейнер базы поднят (npm run db:up).',
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
