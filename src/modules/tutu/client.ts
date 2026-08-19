/**
 * Подключение к MCP-серверу Туту и адаптация его инструментов под агента.
 *
 * Главная идея файла: ответы Туту весят ~30 КБ, поэтому инструменты
 * оборачиваются так, что полный JSON уходит в UI и рисуется карточками,
 * а в модель через toModelOutput возвращается короткая выжимка.
 *
 * Экспорты:
 * - getTutuTools() — набор инструментов MCP, готовый для streamText
 *
 * Типы ответов и разбор списков живут в lib/tutu-types.ts — они нужны и клиенту.
 */

import { createMCPClient } from '@ai-sdk/mcp';
import { tool, type ToolSet } from 'ai';
import { createHash } from 'node:crypto';
import { MCP_CACHE_TTL_MS, MCP_CLIENT_NAME, MCP_SERVER_URL, MODEL_OFFERS_LIMIT, MODEL_PAYLOAD_MAX_CHARS } from '@/modules/tutu/config';
import { prisma } from '@/lib/db';
import { getTutuFetch } from '@/modules/tutu/proxy';
import {
  extractList,
  type HotelOffer,
  type TransportOffer,
  type TutuToolPayload,
} from '@/modules/tutu/types';

// Один клиент на процесс: переподключение на каждый запрос стоит лишнего
// раунд-трипа, а hot reload в dev иначе плодит соединения.
const globalForMcp = globalThis as unknown as { tutuTools?: Promise<ToolSet> };

/** Достаёт полезную нагрузку из CallToolResult: MCP кладёт JSON строкой в content[0].text. */
function parsePayload(raw: unknown): TutuToolPayload {
  const result = raw as { content?: Array<{ type?: string; text?: string }>; isError?: boolean };
  const text = result?.content?.find((part) => part?.type === 'text')?.text;

  if (!text) {
    return { error: 'Туту вернул пустой ответ' };
  }

  // Часть инструментов (плейбуки get_*_instructions) отдаёт обычный текст,
  // а не JSON — тогда отдаём его как есть, модели он нужен целиком.
  try {
    const parsed = JSON.parse(text) as TutuToolPayload;
    return result?.isError ? { ...parsed, error: 'Туту вернул ошибку' } : parsed;
  } catch {
    return { text, ...(result?.isError ? { error: 'Туту вернул ошибку' } : {}) };
  }
}

function summarizeTransport(offer: TransportOffer) {
  const firstLeg = offer.legs?.[0];
  return {
    offer_id: offer.offer_id,
    transport: offer.transport,
    price: offer.price?.amount,
    currency: offer.price?.currency,
    from: firstLeg?.from,
    to: firstLeg?.to,
    departure_at: offer.departure_at,
    arrival_at: offer.arrival_at,
    duration_min: offer.duration_min,
    carriers: offer.carriers,
    transfers: Math.max((offer.segments_count ?? 1) - 1, 0),
    has_checkout_url: Boolean(offer.checkout_url),
    variants_count: offer.variants?.length,
  };
}

function summarizeHotel(hotel: HotelOffer) {
  const bestOffer = hotel.best_offer as { price?: { amount?: number; currency?: string } } | undefined;
  return {
    hotel_id: hotel.hotel_id,
    name: hotel.name,
    stars: hotel.stars,
    rating: hotel.rating,
    review_count: hotel.review_count,
    address: hotel.address,
    price: bestOffer?.price?.amount,
    currency: bestOffer?.price?.currency,
    has_checkout_url: Boolean(hotel.checkout_url),
  };
}

/**
 * Готовит то, что увидит модель. Списки режутся до MODEL_OFFERS_LIMIT и теряют
 * тяжёлые вложенности (segments, variants, фото) — модели они не нужны,
 * решение она принимает по цене, времени и пересадкам.
 */
function summarizeForModel(payload: TutuToolPayload) {
  if (payload.error) {
    return { error: payload.error };
  }

  const { kind, items } = extractList(payload);

  if (kind === 'transport') {
    return {
      total: items.length,
      shown: Math.min(items.length, MODEL_OFFERS_LIMIT),
      offers: (items as TransportOffer[]).slice(0, MODEL_OFFERS_LIMIT).map(summarizeTransport),
      note: 'Карточки офферов уже показаны пользователю. Не пересказывай их списком — комментируй выбор.',
    };
  }

  if (kind === 'hotels') {
    return {
      total: items.length,
      shown: Math.min(items.length, MODEL_OFFERS_LIMIT),
      hotels: (items as HotelOffer[]).slice(0, MODEL_OFFERS_LIMIT).map(summarizeHotel),
      note: 'Карточки отелей уже показаны пользователю. Не пересказывай их списком — комментируй выбор.',
    };
  }

  // Плейбуки и детали оффера: структура заранее не известна, поэтому просто
  // страхуемся от гигантского ответа.
  const serialized = JSON.stringify(payload);
  if (serialized.length > MODEL_PAYLOAD_MAX_CHARS) {
    return {
      truncated: true,
      preview: serialized.slice(0, MODEL_PAYLOAD_MAX_CHARS),
    };
  }
  return payload;
}

function cacheKey(toolName: string, input: unknown): string {
  return createHash('sha256').update(`${toolName}:${JSON.stringify(input ?? {})}`).digest('hex');
}

/** Читает кэш ответов MCP: защищает от 429 и ускоряет повторные запросы при отладке. */
async function readCache(key: string): Promise<TutuToolPayload | null> {
  try {
    const hit = await prisma.mcpCache.findUnique({ where: { key } });
    if (!hit || hit.expiresAt.getTime() < Date.now()) return null;
    return hit.result as TutuToolPayload;
  } catch (error) {
    // Кэш — ускорение, а не источник истины: если Postgres недоступен,
    // приложение обязано продолжить работать на живых запросах.
    console.error('[mcp] чтение кэша не удалось', error);
    return null;
  }
}

async function writeCache(key: string, toolName: string, input: unknown, payload: TutuToolPayload) {
  try {
    const data = {
      tool: toolName,
      args: (input ?? {}) as object,
      result: payload as object,
      expiresAt: new Date(Date.now() + MCP_CACHE_TTL_MS),
    };
    await prisma.mcpCache.upsert({ where: { key }, create: { key, ...data }, update: data });
  } catch (error) {
    console.error('[mcp] запись кэша не удалась', error);
  }
}

async function connect(): Promise<ToolSet> {
  const client = await createMCPClient({
    transport: {
      type: 'http',
      url: MCP_SERVER_URL,
      // Прокси подключается только если задан TUTU_PROXY — см. proxy.ts
      ...(getTutuFetch() ? { fetch: getTutuFetch() } : {}),
    },
    clientName: MCP_CLIENT_NAME,
  });

  const original = await client.tools();
  const wrapped: ToolSet = {};

  for (const [name, mcpTool] of Object.entries(original)) {
    const source = mcpTool as { description?: string; inputSchema: never; execute?: unknown };

    wrapped[name] = tool({
      description: source.description,
      inputSchema: source.inputSchema,

      // execute отдаёт полный ответ Туту — он попадает в UI и рисуется карточками.
      execute: async (input: unknown, options: unknown) => {
        const key = cacheKey(name, input);

        const cached = await readCache(key);
        if (cached) return cached;

        const raw = await (source.execute as (i: unknown, o: unknown) => Promise<unknown>)(
          input,
          options,
        );
        const payload = parsePayload(raw);

        if (!payload.error) {
          await writeCache(key, name, input, payload);
        }
        return payload;
      },

      // А модель видит только выжимку — так агент отвечает быстро и дёшево.
      toModelOutput: ({ output }) => ({
        type: 'json',
        value: summarizeForModel(output as TutuToolPayload) as never,
      }),
    }) as ToolSet[string];
  }

  return wrapped;
}

export function getTutuTools(): Promise<ToolSet> {
  globalForMcp.tutuTools ??= connect();
  return globalForMcp.tutuTools;
}

/**
 * Прямой вызов инструмента Туту в обход модели. Нужен сценариям, которые обязаны
 * отработать детерминированно и быстро: экран спасения не должен зависеть от того,
 * додумается ли языковая модель вызвать нужный инструмент.
 */
export async function callTutu(name: string, args: Record<string, unknown>): Promise<TutuToolPayload> {
  // Кэш проверяется ДО подключения: сервер Туту может быть недоступен или
  // заблокировать нас по rate limit, а прогретый сценарий обязан открыться.
  const cached = await readCache(cacheKey(name, args));
  if (cached) return cached;

  const tools = await getTutuTools();
  const tool = tools[name];

  if (!tool?.execute) {
    throw new Error(`APP_MCP_TOOL_MISSING: инструмент ${name} недоступен на сервере Туту`);
  }

  return (await tool.execute(args as never, {
    toolCallId: `direct-${name}`,
    messages: [],
  } as never)) as TutuToolPayload;
}
