/**
 * Проверка сборки маршрута из командной строки.
 * Запуск: npm run route -- Москва Углич 2026-08-20
 */

import 'dotenv/config';
import { buildRoutes } from '../modules/routing/builder';
import { prisma } from '../lib/db';

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
}

async function main() {
  const [origin, destination, date] = process.argv.slice(2);
  if (!origin || !destination || !date) {
    throw new Error('нужно три аргумента: откуда куда дата');
  }

  const started = Date.now();
  const result = await buildRoutes(origin, destination, date);

  console.log(`\n${origin} → ${destination}, ${date}   (${Date.now() - started} мс)`);
  console.log('регион назначения:', result.destinationRegion ?? '—');
  console.log('прямых вариантов:', result.direct.length);

  if (result.triedHubs.length) console.log('проверенные узлы:', result.triedHubs.join(', '));

  console.log('\nмаршруты с пересадкой:', result.transfers.length);
  for (const chain of result.transfers.slice(0, 6)) {
    const [a, b] = chain.legs;
    console.log(
      `  через ${chain.hub}: ${a.transport} ${time(a.departureAt)}→${time(a.arrivalAt)}` +
        ` | ждать ${chain.layoverMin} мин${chain.tight ? ' (впритык)' : ''} | ` +
        `${b.transport} ${time(b.departureAt)}→${time(b.arrivalAt)} = ${chain.totalPrice} ₽`,
    );
  }

  if (result.notes.length) {
    console.log('\nзаметки:');
    for (const note of result.notes) console.log('  -', note);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Ошибка:', error.message ?? error);
  process.exitCode = 1;
});
