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
import { dedupe, pairLegs, searchLeg, toLeg, type RouteChain, type RouteLeg } from '@/modules/routing/builder';
import { resolveHub } from '@/modules/routing/hubs';
import { ROUTE_CHAINS_LIMIT } from '@/modules/routing/config';
import type { AgentSession } from '@/modules/agent/session';
import { toolError } from '@/modules/agent/errors';
import { withRetry } from '@/modules/agent/retry';
import type { HotelOffer } from '@/modules/tutu/types';

/**
 * Сколько раз агенту позволено сходить в Туту за один поиск: защита от 429.
 * Двадцать — это прямой маршрут плюс девять узлов по два плеча. Это верхний
 * предохранитель, а не цель: на практике агент укладывается в пять запросов,
 * а повторы отсекаются до обращения к сети.
 */
const MAX_SEARCHES = 20;

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
        'Идемпотентен: повторный вызов с теми же аргументами ничего не меняет.',
      inputSchema: z.object({
        origin: z.string().describe('Город отправления, например «Москва»'),
        destination: z.string().describe('Город прибытия, например «Ярославль»'),
        date: z.string().describe('Дата в формате ГГГГ-ММ-ДД'),
      }),
      execute: async ({ origin, destination, date }) => {
        // Повтор одного и того же запроса — признак того, что модель сбилась.
        const repeated = [...session.legs.values()].find(
          (stored) =>
            stored.origin === origin && stored.destination === destination && stored.date === date,
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

        if (session.searchCount >= MAX_SEARCHES) {
          return toolError(
            'SEARCH_BUDGET_SPENT',
            `Исчерпан лимит обращений к Туту (${MAX_SEARCHES}).`,
            `Работай с тем, что уже найдено, и отвечай. ${session.describe()}`,
          );
        }
        session.searchCount += 1;

        const attempt = await withRetry(`${origin} → ${destination}`, () =>
          searchLeg(origin, destination, date),
        );

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
        session.legs.set(id, { id, origin, destination, date, legs });

        // Плечо «узел → цель» пустое означает, что узел бесполезен целиком:
        // помечаем сразу, чтобы агент не тратил на него второй запрос.
        if (legs.length === 0 && destination !== session.target) {
          session.triedHubs.set(origin, 'no-last-leg');
        }

        return {
          leg_id: id,
          route: `${origin} → ${destination}`,
          region: found.region,
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

        if (hubs.length === 0) {
          return {
            hubs: [],
            note: 'Справочник не помог. Предложи города сам, исходя из географии, и проверь их.',
          };
        }

        return { hubs, note: 'Проверь эти города через search_leg. Можешь добавить свои.' };
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
              reason: 'Рейсы есть, но по времени не стыкуются — на второй не успеть.',
              remediation: 'Переходи к следующему городу из списка кандидатов.',
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
        'Найти гостиницы в городе. Нужен, когда уехать в этот день не получается ' +
        'и человеку надо где-то переночевать.',
      inputSchema: z.object({
        city: z.string(),
        check_in: z.string().describe('Дата заезда ГГГГ-ММ-ДД'),
        check_out: z.string().describe('Дата выезда ГГГГ-ММ-ДД'),
      }),
      execute: async ({ city, check_in, check_out }) => {
        if (session.searchCount >= MAX_SEARCHES) {
          return { error: 'Лимит запросов к Туту исчерпан.' };
        }
        session.searchCount += 1;

        const payload = await callTutu('search_hotels', {
          city_name: city,
          check_in,
          check_out,
          adults: 1,
          view: 'compact',
        });

        const hotels = Array.isArray(payload.hotels) ? (payload.hotels as HotelOffer[]) : [];
        return {
          count: hotels.length,
          cheapest: hotels
            .map((h) => (h.best_offer as { price?: { amount?: number } })?.price?.amount)
            .filter((price): price is number => typeof price === 'number')
            .sort((a, b) => a - b)[0],
        };
      },
    }),
  };
}
