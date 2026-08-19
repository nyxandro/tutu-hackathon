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

export type StoredLeg = {
  id: string;
  origin: string;
  destination: string;
  date: string;
  legs: RouteLeg[];
};

export type AgentSession = {
  /** Найденные плечи по идентификаторам вида «leg1», «leg2». */
  legs: Map<string, StoredLeg>;
  /** Сколько раз ходили в Туту — защита от бесконечного перебора. */
  searchCount: number;
  next: () => string;
};

export function createSession(): AgentSession {
  let counter = 0;
  return {
    legs: new Map(),
    searchCount: 0,
    next: () => `leg${++counter}`,
  };
}
