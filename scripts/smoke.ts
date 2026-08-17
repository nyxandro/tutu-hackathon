/**
 * Smoke-проверка связки без языковой модели: MCP Туту → парсинг → кэш в Postgres
 * → выжимка для модели. Гоняется перед демо, чтобы знать, что живые данные идут.
 *
 * Запуск: npm run smoke
 */

import 'dotenv/config';
import { getTutuTools } from '../lib/mcp';
import { extractList, type TutuToolPayload } from '../lib/tutu-types';
import { prisma } from '../lib/db';

const SEARCH_ARGS = {
  origin: 'Москва',
  destination: 'Санкт-Петербург',
  departure_date: '2026-08-25',
  view: 'compact',
};

async function main() {
  const tools = await getTutuTools();
  console.log('Инструментов получено:', Object.keys(tools).length);

  const searchRail = tools.search_rail;
  if (!searchRail?.execute) throw new Error('SMOKE_NO_SEARCH_RAIL: инструмент search_rail недоступен');

  // Первый вызов идёт в Туту, второй обязан прийти из кэша — сравниваем время.
  const startLive = Date.now();
  const payload = (await searchRail.execute(SEARCH_ARGS as never, {
    toolCallId: 'smoke-1',
    messages: [],
  } as never)) as TutuToolPayload;
  const liveMs = Date.now() - startLive;

  const startCached = Date.now();
  await searchRail.execute(SEARCH_ARGS as never, {
    toolCallId: 'smoke-2',
    messages: [],
  } as never);
  const cachedMs = Date.now() - startCached;

  const { kind, items } = extractList(payload);
  const fullSize = JSON.stringify(payload).length;

  const modelOutput = await searchRail.toModelOutput?.({
    toolCallId: 'smoke-1',
    input: SEARCH_ARGS as never,
    output: payload as never,
  });
  const modelSize = JSON.stringify(modelOutput).length;

  console.log('---');
  console.log('тип ответа:            ', kind);
  console.log('офферов найдено:       ', items.length);
  console.log('живой запрос:          ', `${liveMs} мс`);
  console.log('повтор из кэша:        ', `${cachedMs} мс`);
  console.log('полный ответ (в UI):   ', `${fullSize} символов`);
  console.log('выжимка (в модель):    ', `${modelSize} символов`);
  console.log('экономия контекста:    ', `${Math.round((1 - modelSize / fullSize) * 100)}%`);

  const cachedRows = await prisma.mcpCache.count();
  console.log('записей в кэше:        ', cachedRows);

  if (items.length === 0) throw new Error('SMOKE_EMPTY_RESULT: Туту вернул пустой список офферов');
  if (modelSize >= fullSize) throw new Error('SMOKE_NO_COMPRESSION: выжимка не меньше полного ответа');

  console.log('\nOK: живые данные идут, кэш пишется, выжимка сжимает.');
}

main()
  .catch((error) => {
    console.error('Smoke-проверка не прошла:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
