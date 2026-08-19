/**
 * Доступ к Туту через SOCKS-прокси. Нужен, когда рабочий адрес заблокирован
 * их защитой от частых запросов: туннель поднимается до своего сервера,
 * а приложение продолжает работать без изменений в остальном коде.
 *
 * Включается переменной окружения TUTU_PROXY (например socks5://127.0.0.1:1080).
 * Переменной нет — ходим напрямую, поэтому на хостинге настраивать нечего.
 *
 * Экспорты:
 * - getTutuFetch() — fetch для MCP-клиента: через прокси или обычный
 */

import { socksDispatcher } from 'fetch-socks';

type FetchLike = typeof globalThis.fetch;

let cached: FetchLike | undefined;

/** Разбирает socks5://host:port. Другие схемы не поддерживаем намеренно. */
function parseProxy(url: string): { host: string; port: number } | null {
  const match = url.match(/^socks5:\/\/([^:]+):(\d+)$/);
  if (!match) return null;
  return { host: match[1], port: Number(match[2]) };
}

export function getTutuFetch(): FetchLike | undefined {
  const proxyUrl = process.env.TUTU_PROXY;
  if (!proxyUrl) return undefined;
  if (cached) return cached;

  const parsed = parseProxy(proxyUrl);
  if (!parsed) {
    // Ошибка в переменной не должна ронять приложение: работаем напрямую,
    // но громко сообщаем, потому что запросы пойдут не туда, куда ждали.
    console.error(
      `[tutu] TUTU_PROXY="${proxyUrl}" не разобран, ожидается socks5://host:port — идём напрямую`,
    );
    return undefined;
  }

  const dispatcher = socksDispatcher({
    type: 5,
    host: parsed.host,
    port: parsed.port,
  });

  cached = ((input, init) =>
    globalThis.fetch(input, { ...init, dispatcher } as RequestInit)) as FetchLike;

  console.log(`[tutu] запросы идут через прокси ${proxyUrl}`);
  return cached;
}
