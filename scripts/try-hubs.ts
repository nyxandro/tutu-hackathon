/**
 * Проверка подсказки городов-пересадок моделью.
 * Запуск: npm run hubs -- Москва Плёс
 */

import 'dotenv/config';
import { suggestHubs } from '../modules/routing/hub-suggest';

async function main() {
  const [origin, destination] = process.argv.slice(2);
  if (!origin || !destination) throw new Error('нужно два аргумента: откуда куда');

  const started = Date.now();
  const cities = await suggestHubs(origin, destination);
  console.log(`${origin} → ${destination}  (${Date.now() - started} мс)`);
  console.log('подсказано:', cities.length ? cities.join(', ') : '— ничего');
}

main().catch((error) => {
  console.error('Ошибка:', error);
  process.exitCode = 1;
});
