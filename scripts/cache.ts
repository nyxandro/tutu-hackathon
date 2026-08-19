/**
 * Просмотр кэша ответов MCP. Нужен перед демо: показывает, какие маршруты уже
 * прогреты и переживут блокировку или недоступность сервера Туту.
 *
 * Запуск: npm run cache
 */

import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const rows = await prisma.mcpCache.findMany({
    select: { tool: true, args: true, expiresAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('записей в кэше:', rows.length);

  for (const row of rows) {
    const args = row.args as Record<string, unknown>;
    const route = `${args.origin ?? args.city_name ?? '—'} → ${args.destination ?? '—'}`;
    const alive = row.expiresAt.getTime() >= Date.now();
    console.log(
      ' -',
      row.tool.padEnd(22),
      route.padEnd(32),
      String(args.departure_date ?? args.check_in ?? ''),
      alive ? 'жив' : 'протух',
    );
  }

  await prisma.$disconnect();
}

main();
