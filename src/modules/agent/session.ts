/**
 * Хранилище результатов поиска в рамках одного запроса агента.
 *
 * Зачем: ответы Туту весят десятки килобайт, и гонять их через языковую модель
 * нельзя — она захлебнётся контекстом и начнёт путать цифры. Поэтому модель
 * получает короткие идентификаторы найденных плеч, а полные данные лежат здесь
 * и достаются, когда код считает стыковки.
 *
 * Экспорты:
 * - AgentSession — контекст одного поиска
 * - createSession() — создаёт контекст
 */

import type { RouteLeg } from '@/modules/routing/builder';
import type { HotelOffer } from '@/modules/tutu/types';

export type StoredLeg = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  legs: RouteLeg[];
  /** Искали ли ещё и на следующий день — так собираются ночные стыковки. */
  alsoNextDay: boolean;
};

export type AgentSession = {
  /** Найденные плечи по идентификаторам вида «leg1», «leg2». */
  legs: Map<string, StoredLeg>;
  /** Сколько раз ходили в Туту — защита от бесконечного перебора. */
  searchCount: number;
  /** Города, которые уже пробовали как пересадку, и чем закончилось. */
  triedHubs: Map<string, 'no-last-leg' | 'no-connection' | 'solved'>;
  /** Сколько маршрутов уже собрано: агенту пора останавливаться. */
  solved: number;
  /** Момент, после которого поиск обязан завершиться. */
  deadline: number;
  /** Конечный город поиска: по нему отличаем плечо «узел → цель». */
  target: string;
  /** Виды транспорта, которыми человек готов ехать. Пусто — любые. */
  modes: string[];
  /** Сколько взрослых едет: влияет на наличие мест и на цену от Туту. */
  travelers: number;
  /**
   * Сколько раз поиск «город → куда угодно» на конкретную дату вернул пусто.
   * Ключ — «город|дата». По этому счётчику видно, что из города в этот день
   * уехать нельзя вообще, и перебирать оставшиеся направления бессмысленно.
   */
  emptyByOriginDate: Map<string, number>;
  /** Гостиницы запасного плана, если поездку пришлось перенести. */
  hotels?: { city: string; checkIn: string; checkOut: string; list: HotelOffer[] };
  next: () => string;
  /** Явное состояние для модели: что сделано и сколько осталось. */
  describe: () => string;
};

export function createSession(
  target: string,
  deadlineMs: number,
  modes: string[] = [],
  travelers = 1,
): AgentSession {
  let counter = 0;
  const session: AgentSession = {
    legs: new Map(),
    searchCount: 0,
    triedHubs: new Map(),
    solved: 0,
    deadline: Date.now() + deadlineMs,
    target,
    modes,
    travelers,
    emptyByOriginDate: new Map(),
    next: () => `leg${++counter}`,
    describe: () => {
      const hubs = [...session.triedHubs.entries()]
        .map(([city, outcome]) => {
          const label = {
            'no-last-leg': 'нет плеча до цели',
            'no-connection': 'не стыкуется по времени',
            solved: 'маршрут собран',
          }[outcome];
          return `${city} — ${label}`;
        })
        .join('; ');

      const secondsLeft = Math.max(0, Math.round((session.deadline - Date.now()) / 1000));
      return [
        `Проверено городов: ${session.triedHubs.size}${hubs ? ` (${hubs})` : ''}.`,
        `Собрано маршрутов: ${session.solved}.`,
        `Запросов к Туту осталось: ${Math.max(0, 20 - session.searchCount)}.`,
        `Времени осталось: ${secondsLeft} с.`,
      ].join(' ');
    },
  };
  return session;
}
