/**
 * Fetch через SOCKS-прокси. Нужен там, где прямой выход в интернет закрыт:
 * OpenRouter не отвечает российским адресам, а Туту, наоборот, может закрыть
 * доступ при частых запросах. Обе ситуации лечатся туннелем.
 *
 * Экспорты:
 * - socksFetch() — fetch через указанный socks5-адрес или обычный, если пусто
 */

import { socksDispatcher } from 'fetch-socks';

type FetchLike = typeof globalThis.fetch;

const cache = new Map<string, FetchLike>();

/** Разбирает socks5://host:port. Другие схемы не поддерживаем намеренно. */
function parseProxy(url: string): { host: string; port: number } | null {
  const match = url.match(/^socks5:\/\/([^:]+):(\d+)$/);
  if (!match) return null;
  return { host: match[1], port: Number(match[2]) };
}

export function socksFetch(proxyUrl: string | undefined, label: string): FetchLike | undefined {
  if (!proxyUrl) return undefined;

  const ready = cache.get(proxyUrl);
  if (ready) return ready;

  const parsed = parseProxy(proxyUrl);
  if (!parsed) {
    // Ошибка в переменной не должна ронять приложение: работаем напрямую,
    // но громко сообщаем, потому что запросы пойдут не туда, куда ждали.
    console.error(
      `[${label}] прокси "${proxyUrl}" не разобран, ожидается socks5://host:port — идём напрямую`,
    );
    return undefined;
  }

  const dispatcher = socksDispatcher({ type: 5, host: parsed.host, port: parsed.port });
  const wrapped = ((input, init) =>
    globalThis.fetch(input, { ...init, dispatcher } as RequestInit)) as FetchLike;

  cache.set(proxyUrl, wrapped);
  console.log(`[${label}] запросы идут через прокси ${proxyUrl}`);
  return wrapped;
}
