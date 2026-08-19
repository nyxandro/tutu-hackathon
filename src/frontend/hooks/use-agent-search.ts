/**
 * Чтение потока агентного поиска: превращает события инструментов в ленту шагов
 * и собирает готовые маршруты.
 *
 * Если агент недоступен (нет ключа, модель молчит или упала), переключается на
 * детерминированный поиск /api/route — экран обязан показать результат в любом
 * случае, это важнее красивой ленты.
 *
 * Экспорты:
 * - useAgentSearch() — состояние поиска: шаги, маршруты, статус
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import type { RouteChain, RouteSearchResult } from '@/modules/routing/builder';
import type { HotelOffer } from '@/modules/tutu/types';
import type { TraceStep } from '@/frontend/components/route/agent-trace';
import { describeCall, describeResult } from '@/frontend/components/route/agent-trace-labels';

export type SearchQuery = {
  origin: string;
  destination: string;
  date: string;
  modes?: string[];
  /** Сколько взрослых едет: влияет на наличие мест и на цену от Туту. */
  travelers?: number;
};
export type StayOffer = {
  city: string;
  checkIn: string;
  checkOut: string;
  hotels: HotelOffer[];
};
export type SearchStatus = 'idle' | 'running' | 'done' | 'error';

/** Идентификатор строки ленты про догрузку гостиниц — он один на поиск. */
const STAY_STEP_ID = 'stay-lookup';

type ToolEvent = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  delta?: string;
  id?: string;
};

export function useAgentSearch() {
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [chains, setChains] = useState<RouteChain[]>([]);
  const [stay, setStay] = useState<StayOffer | null>(null);
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [fellBack, setFellBack] = useState(false);
  // Запрос, по которому получена выдача на экране. Форма после запуска живёт
  // своей жизнью: человек может править её под следующий поиск, и уже
  // показанные карточки от этого меняться не должны.
  const [applied, setApplied] = useState<SearchQuery | null>(null);
  const names = useRef(new Map<string, string>());
  // Аргументы вызова нужны, чтобы в результате назвать дату поиска.
  const inputs = useRef(new Map<string, Record<string, unknown>>());

  /** Запасной путь: тот же поиск, но без модели. */
  const runPlain = useCallback(async (query: SearchQuery) => {
    setFellBack(true);
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus('error');
      return;
    }

    const result = data as RouteSearchResult;
    setChains([...result.direct, ...result.transfers]);
    // Заметки дописываем к ленте, а не заменяем ею: иначе вся работа агента
    // исчезает с экрана и остаётся одна строка про неудачу.
    setSteps((prev) => [
      ...prev,
      ...result.notes.map((note, index) => ({
        id: `note${index}`,
        action: note,
        result: '',
        empty: true,
      })),
    ]);
    // Запасной путь сам подбирает ночлег, когда уехать в этот день нельзя.
    // Раньше результат выбрасывался, и человек оставался без гостиниц ровно
    // в той ситуации, ради которой они и нужны.
    if (result.stay?.hotels?.length) {
      setStay({
        city: result.stay.city,
        checkIn: result.stay.checkIn,
        checkOut: result.stay.checkOut,
        hotels: result.stay.hotels,
      });
    }
    setStatus('done');
  }, []);

  /**
   * Догружает гостиницы, если уехать в запрошенный день не вышло. Агент про
   * ночлег регулярно забывает — он занят билетами, — поэтому проверку делает
   * код, а не промпт.
   */
  const ensureStay = useCallback(
    async (query: SearchQuery, found: RouteChain[]): Promise<StayOffer | null> => {
      if (found.length === 0) return null;

      const dates = [...new Set(found.map((chain) => chain.departureAt.slice(0, 10)))];
      if (dates.includes(query.date)) return null;

      try {
        const response = await fetch('/api/stay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: query.origin,
            travelers: query.travelers,
            checkIn: query.date,
            // Ночуем до дня отъезда: столько ночей, сколько реально ждать.
            checkOut: dates.sort()[0],
          }),
        });
        if (!response.ok) return null;

        const data = (await response.json()) as StayOffer;
        return data.hotels?.length ? data : null;
      } catch {
        // Гостиницы — дополнение к маршрутам: без них экран остаётся полезным.
        return null;
      }
    },
    [],
  );

  const search = useCallback(
    async (query: SearchQuery) => {
      setSteps([]);
      setChains([]);
      setStay(null);
      setSummary('');
      setFellBack(false);
      setApplied(query);
      setStatus('running');
      names.current.clear();
      inputs.current.clear();

      let response: Response;
      try {
        response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query),
        });
      } catch {
        await runPlain(query);
        return;
      }

      // Агент недоступен — молча уходим на детерминированный поиск.
      if (!response.ok || !response.body) {
        await runPlain(query);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';
      const collected: RouteChain[] = [];
      // Гостиницы от агента копим здесь же: на экран всё уходит одним разом.
      let foundStay: StayOffer | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            let event: ToolEvent;
            try {
              event = JSON.parse(line.slice(6)) as ToolEvent;
            } catch {
              continue;
            }

            if (event.type === 'tool-input-available' && event.toolCallId && event.toolName) {
              names.current.set(event.toolCallId, event.toolName);
              inputs.current.set(event.toolCallId, event.input ?? {});
              const action = describeCall(event.toolName, event.input ?? {});
              setSteps((prev) => [...prev, { id: event.toolCallId as string, action }]);
            }

            if (event.type === 'tool-output-available' && event.toolCallId) {
              const toolName = names.current.get(event.toolCallId) ?? '';
              const output = event.output ?? {};
              const described = describeResult(
                toolName,
                output,
                inputs.current.get(event.toolCallId) ?? {},
              );

              // Маршруты приходят полными — карточки строятся из данных Туту,
              // а не из пересказа модели.
              // Маршруты приезжают и от build_connections, и от search_leg:
              // прямые рейсы до цели сводить не с чем, они готовы сразу.
              if (
                (toolName === 'build_connections' || toolName === 'search_leg') &&
                Array.isArray(output.chains)
              ) {
                collected.push(...(output.chains as RouteChain[]));
              }

              // Гостиницы приходят полными: с адресом, телефоном и ценой за всё
              // проживание — модель их не пересказывает.
              if (toolName === 'search_hotels' && Array.isArray(output.hotels)) {
                foundStay = {
                  city: String(output.city ?? ''),
                  checkIn: String(output.check_in ?? ''),
                  checkOut: String(output.check_out ?? ''),
                  hotels: output.hotels as HotelOffer[],
                };
              }

              // Повтор — это сбой модели, а не шаг поиска: убираем строку из
              // ленты, чтобы работа не выглядела метанием.
              if (output.repeated === true) {
                setSteps((prev) => prev.filter((step) => step.id !== event.toolCallId));
              } else {
                setSteps((prev) =>
                  prev.map((step) =>
                    step.id === event.toolCallId
                      ? { ...step, result: described.text, empty: described.empty }
                      : step,
                  ),
                );
              }
            }

            if (event.type === 'text-delta' && event.delta) {
              text += event.delta;
              setSummary(text.trim());
            }
          }
        }
      } catch {
        // Поток оборвался на середине — показываем то, что успели собрать.
        if (collected.length === 0) {
          await runPlain(query);
          return;
        }
      }

      // Агент отработал, но ничего не нашёл — пробуем обычный поиск,
      // возможно прямые рейсы есть, а модель до них не дошла.
      if (collected.length === 0) {
        await runPlain(query);
        return;
      }

      // Выдачу показываем целиком и один раз: сначала дожидаемся ночлега,
      // если уехать в этот день не вышло, и только потом рисуем карточки.
      // Иначе билеты появляются, а гостиницы доезжают к ним отдельно.
      let stayOffer = foundStay;
      if (!stayOffer) {
        // Догрузка идёт молча несколько секунд, поэтому лента говорит, чем
        // занят экран, — иначе выглядит как зависший поиск.
        const dates = [...new Set(collected.map((chain) => chain.departureAt.slice(0, 10)))];
        const needsStay = !dates.includes(query.date);
        if (needsStay) {
          setSteps((prev) => [
            ...prev,
            { id: STAY_STEP_ID, action: 'Ищу, где переночевать перед выездом' },
          ]);
        }
        stayOffer = await ensureStay(query, collected);
        if (needsStay) {
          setSteps((prev) =>
            prev.map((step) =>
              step.id === STAY_STEP_ID
                ? {
                    ...step,
                    result: stayOffer
                      ? `${stayOffer.hotels.length} вариантов рядом`
                      : 'свободных вариантов не нашлось',
                    empty: !stayOffer,
                  }
                : step,
            ),
          );
        }
      }
      setChains(collected);
      if (stayOffer) setStay(stayOffer);
      setStatus('done');
    },
    [runPlain, ensureStay],
  );

  return { steps, chains, stay, summary, status, fellBack, applied, search };
}
