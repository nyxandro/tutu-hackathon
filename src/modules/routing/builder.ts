/**
 * Сборка маршрутов, которых нет в прямой продаже.
 *
 * Поиск Туту отвечает только на вопрос «есть ли билет А → Б». Если прямого
 * сообщения нет, выдача пустая — хотя доехать можно через промежуточный город,
 * и оба билета продаёт сам Туту. Этот модуль собирает такие цепочки: берёт регион
 * пункта назначения из ответа MCP, подбирает узловые города, проверяет оба плеча
 * на живых данных и сводит стыковки по времени.
 *
 * Экспорты:
 * - buildRoutes() — основной сценарий поиска (детерминированный путь)
 * - searchLeg(), toLeg(), pairLegs(), dedupe() — кирпичи, из которых собирает
 *   маршрут и агентный цикл: расчёты стыковок везде одни и те же
 * - RouteChain, RouteLeg, RouteSearchResult, StayFallback — типы результата
 */

import { LAYOVER_DEFAULT_MIN, LAYOVER_MIN, MAX_HUBS_PER_SEARCH, RESCUE_HOTELS_LIMIT, ROUTE_CHAINS_LIMIT, STAY_LOOKAHEAD_DAYS } from '@/modules/routing/config';
import { callTutu } from '@/modules/tutu/client';
import { resolveHub } from '@/modules/routing/hubs';
import { suggestHubs } from '@/modules/routing/hub-suggest';
import type { HotelOffer, TransportOffer, TutuToolPayload } from '@/modules/tutu/types';

export type RouteLeg = {
  transport: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
  durationMin: number;
  price: number;
  currency: string;
  carriers: string[];
  checkoutUrl?: string;
  searchUrl?: string;
};

export type RouteChain = {
  kind: 'direct' | 'transfer';
  legs: RouteLeg[];
  hub?: string;
  /** Откуда взялся город пересадки: справочник регионов или подсказка модели. */
  hubSource?: 'directory' | 'ai';
  /** Время на пересадку в минутах; для прямых маршрутов не заполняется. */
  layoverMin?: number;
  /** Стыковка укладывается в запас, но впритык — предупреждаем, а не прячем. */
  tight: boolean;
  totalPrice: number;
  currency: string;
  departureAt: string;
  arrivalAt: string;
  totalDurationMin: number;
};

/**
 * Запасной план: уехать в этот день нельзя. Показываем, когда уедете, и где
 * переночевать до отъезда — столько ночей, сколько реально ждать.
 */
export type StayFallback = {
  city: string;
  nights: number;
  checkIn: string;
  checkOut: string;
  /** Дата ближайшего дня, когда уехать всё-таки можно. */
  nextDepartureDate?: string;
  nextChain?: RouteChain;
  hotels: HotelOffer[];
};

export type RouteSearchResult = {
  query: { origin: string; destination: string; date: string };
  /** Регион назначения по данным Туту — из него выводятся города-пересадки. */
  destinationRegion?: string;
  direct: RouteChain[];
  transfers: RouteChain[];
  triedHubs: string[];
  notes: string[];
  /** Заполняется, только когда уехать в выбранный день не получилось. */
  stay?: StayFallback;
};

/** Мультитранспорт кладёт варианты в `variants`, односоставные поиски — в `offers`. */
function extractOffers(payload: TutuToolPayload): TransportOffer[] {
  const variants = (payload as { variants?: TransportOffer[] }).variants;
  if (Array.isArray(variants)) return variants;
  if (Array.isArray(payload.offers)) return payload.offers;
  return [];
}

/** Сколько минимально нужно на пересадку с одного вида транспорта на другой. */
function layoverFor(from: string | undefined, to: string | undefined): number {
  return LAYOVER_MIN[from ?? '']?.[to ?? ''] ?? LAYOVER_DEFAULT_MIN;
}

export function toLeg(offer: TransportOffer, fallbackFrom: string, fallbackTo: string): RouteLeg | null {
  const departureAt = offer.departure_at;
  const arrivalAt = offer.arrival_at;
  const price = offer.price?.amount;

  // Без времени и цены оффер бесполезен: в цепочку он не встанет и посчитан не будет.
  if (!departureAt || !arrivalAt || typeof price !== 'number') return null;

  const firstLeg = offer.legs?.[0];
  return {
    transport: offer.transport ?? 'unknown',
    from: firstLeg?.from ?? fallbackFrom,
    to: firstLeg?.to ?? fallbackTo,
    departureAt,
    arrivalAt,
    durationMin: offer.duration_min ?? 0,
    price,
    currency: offer.price?.currency ?? 'RUB',
    carriers: offer.carriers ?? [],
    checkoutUrl: offer.checkout_url,
    searchUrl: offer.search_results_url,
  };
}

function minutesBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000;
}

function directChain(leg: RouteLeg): RouteChain {
  return {
    kind: 'direct',
    legs: [leg],
    tight: false,
    totalPrice: leg.price,
    currency: leg.currency,
    departureAt: leg.departureAt,
    arrivalAt: leg.arrivalAt,
    totalDurationMin: leg.durationMin,
  };
}

/**
 * Сводит два плеча в цепочки. Годится только та пара, где на пересадку остаётся
 * не меньше запаса для второго вида транспорта: на самолёт нужно приехать заранее,
 * на автобус — меньше.
 */
export function pairLegs(
  first: RouteLeg[],
  second: RouteLeg[],
  hub: string,
  hubSource: 'directory' | 'ai',
): RouteChain[] {
  const chains: RouteChain[] = [];

  for (const a of first) {
    for (const b of second) {
      const layoverMin = minutesBetween(a.arrivalAt, b.departureAt);
      const required = layoverFor(a.transport, b.transport);

      if (layoverMin < required) continue;

      chains.push({
        kind: 'transfer',
        legs: [a, b],
        hub,
        hubSource,
        layoverMin,
        // Впритык — это меньше двух запасов: успеть можно, но без права на опоздание.
        tight: layoverMin < required * 2,
        totalPrice: a.price + b.price,
        currency: a.currency,
        departureAt: a.departureAt,
        arrivalAt: b.arrivalAt,
        totalDurationMin: minutesBetween(a.departureAt, b.arrivalAt),
      });
    }
  }

  return chains;
}

/** Оставляет по одной лучшей цепочке на каждую пару «первый рейс + узел». */
export function dedupe(chains: RouteChain[]): RouteChain[] {
  const best = new Map<string, RouteChain>();

  for (const chain of chains) {
    const key = `${chain.hub}|${chain.legs[0].departureAt}`;
    const current = best.get(key);
    if (!current || chain.arrivalAt < current.arrivalAt) {
      best.set(key, chain);
    }
  }

  return [...best.values()];
}

/**
 * Один запрос к Туту. Сетевую ошибку не пробрасываем: на демо недоступность
 * одного плеча не должна ронять весь экран — вместо этого маршрут через этот
 * узел просто не построится, а причина попадёт в заметки.
 */
export async function searchLeg(origin: string, destination: string, date: string) {
  try {
    const payload = await callTutu('search_multitransport', {
      origin,
      destination,
      departure_date: date,
      view: 'compact',
    });

    const region = (payload as { meta?: { to?: { region?: string } } }).meta?.to?.region;
    return { offers: extractOffers(payload), region, failed: Boolean(payload.error) };
  } catch (error) {
    console.error(`[route] не удалось получить ${origin} → ${destination}`, error);
    return { offers: [] as TransportOffer[], region: undefined, failed: true };
  }
}

/** Сдвиг даты в формате YYYY-MM-DD на нужное число суток. */
function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function nightsBetween(from: string, to: string): number {
  return Math.max(
    1,
    Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000),
  );
}

/**
 * Запасной план на случай «сегодня никак». Ищем ближайший день, когда уехать
 * можно, и подбираем гостиницу ровно на столько ночей, сколько ждать отъезда:
 * если ближайший рейс через две ночи — бронируем две.
 */
async function buildStayFallback(
  origin: string,
  destination: string,
  date: string,
  notes: string[],
): Promise<StayFallback | undefined> {
  let nextDepartureDate: string | undefined;
  let nextChain: RouteChain | undefined;

  for (let offset = 1; offset <= STAY_LOOKAHEAD_DAYS; offset += 1) {
    const nextDate = shiftDate(date, offset);
    const attempt = await searchLeg(origin, destination, nextDate);
    const legs = attempt.offers
      .map((offer) => toLeg(offer, origin, destination))
      .filter((leg): leg is RouteLeg => leg !== null);

    if (legs.length > 0) {
      nextDepartureDate = nextDate;
      nextChain = legs.map(directChain).sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt))[0];
      break;
    }
  }

  // Ночуем до дня отъезда; если ближайший рейс не нашёлся, предлагаем одну ночь.
  const checkIn = date;
  const checkOut = nextDepartureDate ?? shiftDate(date, 1);
  const nights = nightsBetween(checkIn, checkOut);

  try {
    const payload = await callTutu('search_hotels', {
      city_name: origin,
      check_in: checkIn,
      check_out: checkOut,
      adults: 1,
      view: 'compact',
    });

    const hotels = Array.isArray(payload.hotels) ? payload.hotels : [];

    // Сортируем по цене за всё проживание, рейтинг показываем рядом —
    // человеку в этой ситуации важнее цена, но выбирать он будет по обоим.
    const sorted = [...hotels].sort((a, b) => {
      const priceA = (a.best_offer as { price?: { amount?: number } } | undefined)?.price?.amount ?? Infinity;
      const priceB = (b.best_offer as { price?: { amount?: number } } | undefined)?.price?.amount ?? Infinity;
      return priceA - priceB;
    });

    return {
      city: origin,
      nights,
      checkIn,
      checkOut,
      nextDepartureDate,
      nextChain,
      hotels: sorted.slice(0, RESCUE_HOTELS_LIMIT),
    };
  } catch (error) {
    console.error('[route] не удалось подобрать гостиницы', error);
    notes.push('Гостиницы подобрать не удалось: сервис Туту не ответил.');
    return { city: origin, nights, checkIn, checkOut, nextDepartureDate, nextChain, hotels: [] };
  }
}

export async function buildRoutes(
  origin: string,
  destination: string,
  date: string,
): Promise<RouteSearchResult> {
  const notes: string[] = [];
  const result: RouteSearchResult = {
    query: { origin, destination, date },
    direct: [],
    transfers: [],
    triedHubs: [],
    notes,
  };

  const straight = await searchLeg(origin, destination, date);
  result.destinationRegion = straight.region;

  if (straight.failed) {
    notes.push('Прямой поиск не отработал — показываем то, что удалось собрать.');
  }

  const directLegs = straight.offers
    .map((offer) => toLeg(offer, origin, destination))
    .filter((leg): leg is RouteLeg => leg !== null);

  result.direct = directLegs.map(directChain).sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt));

  // Прямые есть — пересадки искать незачем, лишние вызовы упрутся в rate limit.
  if (result.direct.length > 0) {
    return result;
  }

  // Два источника узлов: справочник регионов (детерминированный) и подсказка
  // модели (знает транспортную связность лучше административного деления).
  const fromDirectory = resolveHub(straight.region, [origin, destination]);
  const fromModel = await suggestHubs(origin, destination);

  // Источники чередуем, а не склеиваем: иначе справочник занимает весь лимит
  // и подсказка модели никогда не проверяется, хотя она бывает точнее.
  const seen = new Set([origin.toLowerCase(), destination.toLowerCase()]);
  const candidates: Array<{ city: string; source: 'directory' | 'ai' }> = [];

  for (let i = 0; i < Math.max(fromDirectory.length, fromModel.length); i += 1) {
    for (const [city, source] of [
      [fromDirectory[i], 'directory'] as const,
      [fromModel[i], 'ai'] as const,
    ]) {
      if (!city || seen.has(city.toLowerCase())) continue;
      seen.add(city.toLowerCase());
      candidates.push({ city, source });
    }
  }

  const hubs = candidates.slice(0, MAX_HUBS_PER_SEARCH);

  if (hubs.length === 0) {
    notes.push('Не удалось определить, через какие города можно проехать.');
    result.stay = await buildStayFallback(origin, destination, date, notes);
    return result;
  }

  result.triedHubs = hubs.map((item) => item.city);

  // Узлы проверяем последовательно: параллельный залп по чужому API — прямой путь к 429.
  const chains: RouteChain[] = [];
  for (const { city: hub, source } of hubs) {
    const [toHub, fromHub] = await Promise.all([
      searchLeg(origin, hub, date),
      searchLeg(hub, destination, date),
    ]);

    const firstLegs = toHub.offers
      .map((offer) => toLeg(offer, origin, hub))
      .filter((leg): leg is RouteLeg => leg !== null);
    const secondLegs = fromHub.offers
      .map((offer) => toLeg(offer, hub, destination))
      .filter((leg): leg is RouteLeg => leg !== null);

    if (toHub.failed || fromHub.failed) {
      notes.push(`Через ${hub} проверить не удалось: сервис Туту не ответил.`);
      continue;
    }

    if (firstLegs.length === 0 || secondLegs.length === 0) {
      notes.push(`Через ${hub} не получилось: нет рейсов на одном из плеч.`);
      continue;
    }

    const paired = pairLegs(firstLegs, secondLegs, hub, source);
    if (paired.length === 0) {
      notes.push(`Через ${hub} рейсы есть, но в этот день они не стыкуются по времени.`);
    }
    chains.push(...paired);
  }

  result.transfers = dedupe(chains)
    .sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt))
    .slice(0, ROUTE_CHAINS_LIMIT);

  // Уехать не выходит вообще — предлагаем переночевать и уехать позже.
  if (result.transfers.length === 0) {
    result.stay = await buildStayFallback(origin, destination, date, notes);
  }

  return result;
}
