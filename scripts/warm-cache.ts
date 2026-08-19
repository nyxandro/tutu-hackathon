/**
 * Прогрев кэша из сохранённых ответов Туту (папка fixtures/).
 *
 * Зачем: у сервера Туту есть rate limit вплоть до блокировки по IP, и живой
 * запрос на демо может не пройти. Прогретый кэш делает сценарий воспроизводимым.
 * Данные настоящие — это ответы их сервера, снятые заранее, а не выдумка.
 *
 * Запуск: npm run warm
 */

import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { prisma } from '../lib/db';
import { WARM_CACHE_TTL_MS } from '../lib/config';

const FIXTURES_DIR = join(process.cwd(), 'fixtures');

/** Какому вызову соответствует каждый файл. Аргументы должны совпадать с боевыми. */
const FIXTURE_CALLS: Record<string, { tool: string; args: Record<string, unknown> }> = {
  'mt-moskva-uglich-2026-08-20.json': {
    tool: 'search_multitransport',
    args: { origin: 'Москва', destination: 'Углич', departure_date: '2026-08-20', view: 'compact' },
  },
  'mt-moskva-yaroslavl-2026-08-20.json': {
    tool: 'search_multitransport',
    args: { origin: 'Москва', destination: 'Ярославль', departure_date: '2026-08-20', view: 'compact' },
  },
  'mt-yaroslavl-uglich-2026-08-20.json': {
    tool: 'search_multitransport',
    args: { origin: 'Ярославль', destination: 'Углич', departure_date: '2026-08-20', view: 'compact' },
  },
  'mt-moskva-kazan-2026-08-19.json': {
    tool: 'search_multitransport',
    args: { origin: 'Москва', destination: 'Казань', departure_date: '2026-08-19', view: 'compact' },
  },
  'rail-moskva-spb-2026-08-25.json': {
    tool: 'search_rail',
    args: { origin: 'Москва', destination: 'Санкт-Петербург', departure_date: '2026-08-25', view: 'compact' },
  },
};

/** Тот же ключ, что считает lib/mcp.ts, иначе прогрев не совпадёт с боевым вызовом. */
function cacheKey(tool: string, args: unknown): string {
  return createHash('sha256').update(`${tool}:${JSON.stringify(args ?? {})}`).digest('hex');
}

/** Разбор JSON-RPC ответа: полезная нагрузка лежит строкой в result.content[0].text. */
function parseFixture(raw: string): Record<string, unknown> {
  const envelope = JSON.parse(raw) as {
    result?: { content?: Array<{ type?: string; text?: string }> };
  };
  const text = envelope.result?.content?.find((part) => part?.type === 'text')?.text;

  if (!text) throw new Error('в файле нет result.content[].text');
  return JSON.parse(text) as Record<string, unknown>;
}

async function main() {
  const files = readdirSync(FIXTURES_DIR).filter((name) => name.endsWith('.json'));
  let warmed = 0;

  for (const file of files) {
    const call = FIXTURE_CALLS[file];
    if (!call) continue;

    const payload = parseFixture(readFileSync(join(FIXTURES_DIR, file), 'utf-8'));
    const key = cacheKey(call.tool, call.args);
    const data = {
      tool: call.tool,
      args: call.args as object,
      result: payload as object,
      expiresAt: new Date(Date.now() + WARM_CACHE_TTL_MS),
    };

    await prisma.mcpCache.upsert({ where: { key }, create: { key, ...data }, update: data });

    const count = Array.isArray(payload.variants)
      ? payload.variants.length
      : Array.isArray(payload.offers)
        ? (payload.offers as unknown[]).length
        : 0;
    console.log(`  ${call.args.origin} → ${call.args.destination}: ${count} вариантов`);
    warmed += 1;
  }

  console.log(`\nпрогрето записей: ${warmed}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Прогрев не удался:', error);
  process.exitCode = 1;
});
