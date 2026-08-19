/**
 * Инструменты агента. Модель решает, что вызвать; считает всегда код.
 *
 * Разделение жёсткое: языковая модель выбирает города и даты, но не трогает
 * арифметику — стыковки, запас времени и суммы считают функции из
 * modules/routing. Через модель ходят только короткие сводки и идентификаторы,
 * полные ответы Туту остаются на сервере в AgentSession.
 *
 * Экспорты:
 * - createAgentTools() — набор инструментов для streamText
 */

import { tool } from 'ai';
import { z } from 'zod';
import { callTutu } from '@/modules/tutu/client';
import { dedupe, directChain, pairLegs, searchLeg, toLeg, type RouteChain, type RouteLeg } from '@/modules/routing/builder';
import { cityPopulation, resolveHub } from '@/modules/routing/hubs';
import { HOTEL_DETAILS_LIMIT, RESCUE_HOTELS_LIMIT, ROUTE_CHAINS_LIMIT } from '@/modules/routing/config';
import type { AgentSession } from '@/modules/agent/session';
import { toolError } from '@/modules/agent/errors';

/** Один ли это город: модель пишет названия как придётся, вплоть до «ё». */
function sameCity(first: string, second: string): boolean {
  const norm = (value: string) => value.trim().toLowerCase().replace(/ё/g, 'е');
  return norm(first) === norm(second);
}

/** Сдвиг даты ГГГГ-ММ-ДД на сутки — для поиска второго плеча наутро. */
function shiftDay(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}
import { withRetry } from '@/modules/agent/retry';
import type { HotelOffer } from '@/modules/tutu/types';

/**
 * Сколько раз агенту позволено сходить в Туту за один поиск: защита от 429.
 * Двадцать — это прямой маршрут плюс девять узлов по два плеча. Это верхний
 * предохранитель, а не цель: на практике агент укладывается в пять запросов,
 * а повторы отсекаются до обращения к сети.
 */
const MAX_SEARCHES = 20;

// Сколько пустых направлений из одного города за одну дату считаем приговором
// этой дате. Три — это уже не совпадение, а расписание.
const DEAD_ORIGIN_THRESHOLD = 3;

/** Цена за всё проживание: у Туту это best_offer.price с price_basis stay_total. */
function priceOf(hotel: HotelOffer): number | undefined {
  return (hotel.best_offer as { price?: { amount?: number } } | undefined)?.price?.amount;
}

/**
 * Дотягивает адрес, телефоны и время заезда: в результатах поиска их нет,
 * там только расстояние до центра.
 */
async function enrich(
  hotel: HotelOffer,
  checkIn: string,
  checkOut: string,
  adults: number,
): Promise<HotelOffer> {
  if (!hotel.hotel_id) return hotel;

  const attempt = await withRetry(`детали отеля ${hotel.name ?? hotel.hotel_id}`, () =>
    callTutu('get_offer_details', {
      product_type: 'hotels',
      hotel_id: hotel.hotel_id,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      view: 'compact',
    }),
  );

  if (!attempt.ok) return hotel;

  const details = (attempt.value as { hotel?: Record<string, unknown> }).hotel;
  if (!details) return hotel;

  const phones = Array.isArray(details.phones)
    ? details.phones.filter((phone): phone is string => typeof phone === 'string' && phone.length > 0)
    : [];

  return {
    ...hotel,
    fullAddress: typeof details.address === 'string' ? details.address : undefined,
    phones: phones.length > 0 ? phones : undefined,
    checkInTime: typeof details.check_in_time === 'string' ? details.check_in_time : undefined,
  };
}

/** Короткая сводка плеча для модели: без расписания целиком, только границы. */
function summarizeLegs(legs: RouteLeg[]) {
  if (legs.length === 0) return { count: 0 };

  const sorted = [...legs].sort((a, b) => a.departureAt.localeCompare(b.departureAt));
  const cheapest = [...legs].sort((a, b) => a.price - b.price)[0];

  return {
    count: legs.length,
    transports: [...new Set(legs.map((leg) => leg.transport))],
    first_departure: sorted[0].departureAt.slice(11, 16),
    last_departure: sorted[sorted.length - 1].departureAt.slice(11, 16),
    cheapest_price: cheapest.price,
  };
}

/** Цепочки в модель уходят без вложенных рейсов — только итоги. */
function summarizeChains(chains: RouteChain[]) {
  return chains.slice(0, ROUTE_CHAINS_LIMIT).map((chain) => ({
    hub: chain.hub,
    departure: chain.departureAt.slice(11, 16),
    arrival: chain.arrivalAt.slice(11, 16),
    layover_min: chain.layoverMin,
    tight: chain.tight,
    total_price: chain.totalPrice,
  }));
}

export function createAgentTools(session: AgentSession, collected: RouteChain[]) {
  return {
    search_leg: tool({
      description:
        'Найти рейсы между двумя городами на дату: поезда, автобусы, самолёты, ' +
        'электрички сразу. Возвращает идентификатор плеча и краткую сводку — ' +
        'полное расписание остаётся на сервере, для решения оно не нужно. ' +
        'Идемпотентен: повторный вызов с теми же аргументами ничего не меняет. ' +
        'Для второго плеча (из города пересадки дальше) ставь also_next_day=true: ' +
        'вечерний рейс приезжает в узел ночью, и уехать дальше получится только утром.',
      inputSchema: z.object({
        origin: z.string().describe('Город отправления, например «Москва»'),
        destination: z.string().describe('Город прибытия, например «Ярославль»'),
        date: z.string().describe('Дата в формате ГГГГ-ММ-ДД'),
        also_next_day: z
          .boolean()
          .optional()
          .describe(
            'Искать ещё и на следующий день. Ставь true для второго плеча ' +
              'маршрута с пересадкой, false для прямых рейсов и первого плеча.',
          ),
      }),
      execute: async ({ origin, destination, date, also_next_day: alsoNextDay }) => {
        // Повтор одного и того же запроса — признак того, что модель сбилась.
        const repeated = [...session.legs.values()].find(
          (stored) =>
            stored.origin === origin &&
            stored.destination === destination &&
            stored.date === date &&
            stored.alsoNextDay === Boolean(alsoNextDay),
        );
        if (repeated) {
          return toolError(
            'DUPLICATE_REQUEST',
            `Маршрут ${origin} → ${destination} на ${date} уже проверен (${repeated.id}, рейсов: ${repeated.legs.length}).`,
            'Не спрашивай повторно. Возьми следующий город из списка кандидатов или переходи к следующему дню.',
          );
        }

        if (Date.now() > session.deadline) {
          return toolError(
            'DEADLINE_REACHED',
            'Время на поиск вышло.',
            `Заканчивай и отвечай по тому, что уже нашёл. ${session.describe()}`,
          );
        }

        // Из города в этот день уехать не выходит вообще: несколько пустых
        // ответов подряд по разным направлениям — достаточное доказательство,
        // а перебор оставшихся городов только жжёт лимит запросов.
        const deadKey = `${origin}|${date}`;
        if ((session.emptyByOriginDate.get(deadKey) ?? 0) >= DEAD_ORIGIN_THRESHOLD) {
          return toolError(
            'ORIGIN_DEAD_FOR_DATE',
            `Из города ${origin} на ${date} рейсов нет ни в один из проверенных городов.`,
            'Перебирать другие города в этот день бессмысленно. Бери следующий день: search_leg с датой +1.',
          );
        }

        if (session.searchCount >= MAX_SEARCHES) {
          return toolError(
            'SEARCH_BUDGET_SPENT',
            `Исчерпан лимит обращений к Туту (${MAX_SEARCHES}).`,
            `Работай с тем, что уже найдено, и отвечай. ${session.describe()}`,
          );
        }
        session.searchCount += 1;

        // Ночная стыковка: рейсы следующего дня нужны только второму плечу,
        // иначе завтрашние прямые попадут в сегодняшний вердикт.
        const attempt = await withRetry(`${origin} → ${destination}`, async () => {
          const sameDay = await searchLeg(origin, destination, date, session.modes, session.travelers);
          if (!alsoNextDay) return sameDay;
          const nextDay = await searchLeg(
            origin,
            destination,
            shiftDay(date, 1),
            session.modes,
            session.travelers,
          );
          return {
            ...sameDay,
            offers: [...sameDay.offers, ...nextDay.offers],
            failed: sameDay.failed && nextDay.failed,
          };
        });

        if (!attempt.ok) {
          return toolError(
            attempt.code,
            `Туту не ответил на запрос ${origin} → ${destination}.`,
            'Попробуй другой город пересадки: этот сейчас проверить нельзя.',
            false,
          );
        }

        const found = attempt.value;
        if (found.failed) {
          return toolError(
            'TUTU_UNAVAILABLE',
            `Туту вернул ошибку по запросу ${origin} → ${destination}.`,
            'Попробуй другой город пересадки.',
          );
        }

        const legs = found.offers
          .map((offer) => toLeg(offer, origin, destination))
          .filter((leg): leg is RouteLeg => leg !== null);

        const id = session.next();
        session.legs.set(id, { id, origin, destination, date, legs, alsoNextDay: Boolean(alsoNextDay) });

        // Рейсы прямо до цели — это уже готовый ответ, их незачем сводить
        // через build_connections. Без этой ветки прямые рейсы на другой день
        // терялись: агент их находил, но положить в выдачу было некуда, и на
        // экран уходил только его пересказ.
        let directChains: RouteChain[] = [];
        if (legs.length > 0 && sameCity(destination, session.target)) {
          directChains = legs
            .map((leg) => directChain(leg))
            .filter(
              (chain) =>
                !collected.some(
                  (existing) =>
                    existing.kind === 'direct' &&
                    existing.departureAt === chain.departureAt &&
                    existing.totalPrice === chain.totalPrice,
                ),
            )
            .slice(0, ROUTE_CHAINS_LIMIT);
          collected.push(...directChains);
        }

        // Плечо «узел → цель» пустое означает, что узел бесполезен целиком:
        // помечаем сразу, чтобы агент не тратил на него второй запрос.
        if (legs.length === 0 && destination !== session.target) {
          session.triedHubs.set(origin, 'no-last-leg');
        }

        // Копим пустые ответы по паре «откуда + дата»: так видно, что город
        // отправления в этот день закрыт целиком, а не что не повезло с узлом.
        if (legs.length === 0) {
          session.emptyByOriginDate.set(deadKey, (session.emptyByOriginDate.get(deadKey) ?? 0) + 1);
        }

        return {
          leg_id: id,
          route: `${origin} → ${destination}`,
          region: found.region,
          // Полные карточки рисует интерфейс, модель получает только сводку.
          ...(directChains.length > 0 ? { chains: directChains } : {}),
          ...summarizeLegs(legs),
          state: session.describe(),
        };
      },
    }),

    suggest_hubs: tool({
      description:
        'Административный центр региона назначения и соседние узлы по справочнику. ' +
        'Отвечает мгновенно. Это подсказка, а не полный список: ты знаешь ' +
        'транспортную географию России и можешь проверять свои города тоже.',
      inputSchema: z.object({
        origin: z.string(),
        destination: z.string(),
        region: z.string().optional().describe('Регион назначения из ответа search_leg'),
      }),
      // Справочник, без обращения к модели: агент сам языковая модель, и второй
      // вызов внутри инструмента только добавлял задержку и таймауты.
      execute: async ({ origin, destination, region }) => {
        const hubs = resolveHub(region, [origin, destination]);

        // Узкое место маршрута — маленький город: рейсов у него мало, и город
        // пересадки отбраковывается по нему одним запросом вместо двух.
        // Считаем это кодом по справочнику населения, а не оставляем модели.
        const originSize = cityPopulation(origin) ?? 0;
        const destinationSize = cityPopulation(destination) ?? 0;
        const narrow = originSize > 0 && destinationSize > 0 && originSize < destinationSize
          ? origin
          : destination;
        const checkFirst =
          narrow === origin
            ? `Сначала проверяй плечо «${origin} → город»: рейсов из ${origin} мало, и неподходящий город отсеется одним запросом.`
            : `Сначала проверяй плечо «город → ${destination}»: рейсов до ${destination} мало, и неподходящий город отсеется одним запросом.`;

        if (hubs.length === 0) {
          return {
            hubs: [],
            check_first: checkFirst,
            note: 'Справочник не помог. Предложи города сам, исходя из географии, и проверь их.',
          };
        }

        return {
          hubs,
          check_first: checkFirst,
          note: 'Проверь эти города через search_leg. Можешь добавить свои.',
        };
      },
    }),

    build_connections: tool({
      description:
        'Свести два найденных плеча в маршрут с пересадкой. Проверяет, успевает ли ' +
        'человек на второй рейс, и считает итоговую цену. Возвращает только те ' +
        'связки, на которые реально успеть.',
      inputSchema: z.object({
        first_leg_id: z.string().describe('Идентификатор первого плеча из search_leg'),
        second_leg_id: z.string().describe('Идентификатор второго плеча'),
        hub: z.string().describe('Город пересадки'),
      }),
      execute: async ({ first_leg_id, second_leg_id, hub }) => {
        const first = session.legs.get(first_leg_id);
        const second = session.legs.get(second_leg_id);

        if (!first || !second) {
          return toolError(
            'LEG_NOT_FOUND',
            'Плечо с таким идентификатором не найдено.',
            'Сверь идентификаторы: их выдаёт search_leg в поле leg_id.',
          );
        }

        // Модель иногда путает порядок и подаёт плечи наоборот. Тогда стыковка
        // считается от прибытия в конечный город до выезда из начального —
        // получается отрицательное время и ложное «не стыкуются». Определяем
        // порядок по географии: у первого плеча пункт прибытия и есть узел.
        const [before, after] =
          first.destination === hub || second.origin === hub
            ? [first, second]
            : second.destination === hub || first.origin === hub
              ? [second, first]
              : [first, second];

        if (before.destination !== hub || after.origin !== hub) {
          return toolError(
            'LEGS_DO_NOT_MEET',
            `Плечи не сходятся в городе ${hub}: ${before.origin} → ${before.destination} и ${after.origin} → ${after.destination}.`,
            'Передай плечи одного маршрута: первое должно приходить в город пересадки, второе — уходить из него.',
          );
        }

        const chains = dedupe(pairLegs(before.legs, after.legs, hub, 'ai'))
          .sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt))
          .slice(0, ROUTE_CHAINS_LIMIT);

        // Готовые цепочки копим для интерфейса: их рисуют карточками,
        // модель их пересказывать не должна.
        collected.push(...chains);

        session.triedHubs.set(hub, chains.length > 0 ? 'solved' : 'no-connection');
        session.solved += chains.length;

        // Полные маршруты уходят в интерфейс, модель увидит только сводку
        // (см. toModelOutput ниже) — так карточки строятся из данных Туту.
        return { count: chains.length, hub, chains, state: session.describe() };
      },

      toModelOutput: ({ output }) => {
        const result = output as { count: number; chains: RouteChain[]; state?: string; error?: true };
        // Ошибку отдаём модели как есть: в ней уже есть код и что делать дальше.
        if (result.error) return { type: 'json', value: result as never };
        if (result.count === 0) {
          return {
            type: 'json',
            value: {
              count: 0,
              reason:
                'Рейсы на оба плеча есть, но в этот день не стыкуются: на второй не успеть.',
              remediation:
                'Город рабочий, не сошлось расписание одного дня. Проверь этот же город ' +
                'на следующую дату (оба плеча с датой +1), и только потом бери другой город.',
              state: result.state,
            },
          };
        }
        return {
          type: 'json',
          value: {
            count: result.count,
            connections: summarizeChains(result.chains),
            state: result.state,
          },
        };
      },
    }),

    search_hotels: tool({
      description:
        'Найти гостиницы в городе с адресом, рейтингом и ценой за всё проживание. ' +
        'Вызывай, когда уехать в нужный день не получается и человеку придётся ' +
        'переночевать: он должен увидеть, где, а не искать сам.',
      inputSchema: z.object({
        city: z.string().describe('Город, где нужно переночевать'),
        check_in: z.string().describe('Дата заезда ГГГГ-ММ-ДД'),
        check_out: z.string().describe('Дата выезда ГГГГ-ММ-ДД'),
      }),
      execute: async ({ city, check_in, check_out }) => {
        if (session.searchCount >= MAX_SEARCHES) {
          return toolError(
            'SEARCH_BUDGET_SPENT',
            `Исчерпан лимит обращений к Туту (${MAX_SEARCHES}).`,
            'Отвечай по тому, что уже нашёл.',
          );
        }
        session.searchCount += 1;

        const attempt = await withRetry(`гостиницы в ${city}`, () =>
          callTutu('search_hotels', {
            city_name: city,
            check_in,
            check_out,
            adults: session.travelers,
            view: 'compact',
          }),
        );

        if (!attempt.ok) {
          return toolError(
            attempt.code,
            `Не удалось получить гостиницы в городе ${city}.`,
            'Скажи человеку, что список гостиниц сейчас недоступен.',
          );
        }

        const all = Array.isArray(attempt.value.hotels)
          ? (attempt.value.hotels as HotelOffer[])
          : [];

        // Удобств в результатах поиска нет, но есть фильтр по ним. Поэтому
        // спрашиваем отдельно, какие отели города принимают с животными, —
        // один запрос на весь список, а не на каждый отель.
        const petFriendly = await withRetry(`гостиницы с животными в ${city}`, () =>
          callTutu('search_hotels', {
            city_name: city,
            check_in,
            check_out,
            adults: session.travelers,
            hotel_amenities: ['pet_friendly'],
            view: 'compact',
          }),
        );
        const petIds = new Set(
          petFriendly.ok && Array.isArray(petFriendly.value.hotels)
            ? (petFriendly.value.hotels as HotelOffer[])
                .map((hotel) => hotel.hotel_id)
                .filter((id): id is string => typeof id === 'string')
            : [],
        );

        // Дешёвые вперёд: человек не планировал ночевать и не выбирал отель заранее.
        const cheapest = [...all]
          .filter((hotel) => priceOf(hotel) !== undefined)
          .sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity))
          .slice(0, RESCUE_HOTELS_LIMIT);

        // Полный адрес и телефон лежат только в деталях, поэтому дотягиваем их
        // для нескольких первых: человеку, который едет ночевать, нужен адрес,
        // а не «684 м от центра».
        const withDetails = await Promise.all(
          cheapest.map(async (hotel, index) => {
            const base =
              index < HOTEL_DETAILS_LIMIT ? await enrich(hotel, check_in, check_out, session.travelers) : hotel;
            return { ...base, petFriendly: petIds.has(base.hotel_id ?? '') };
          }),
        );

        session.hotels = { city, checkIn: check_in, checkOut: check_out, list: withDetails };

        return {
          city,
          check_in,
          check_out,
          count: withDetails.length,
          hotels: withDetails,
          state: session.describe(),
        };
      },

      // Модели незачем видеть фотографии и хеши предложений — только цены.
      toModelOutput: ({ output }) => {
        const result = output as {
          error?: true;
          city?: string;
          count?: number;
          hotels?: HotelOffer[];
        };
        if (result.error) return { type: 'json', value: result as never };

        return {
          type: 'json',
          value: {
            city: result.city,
            count: result.count,
            cheapest: result.hotels?.[0]
              ? { name: result.hotels[0].name, price: priceOf(result.hotels[0]) }
              : undefined,
          },
        };
      },
    }),
  };
}
