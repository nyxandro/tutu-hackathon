/**
 * Агентный поиск: модель сама решает, какие города и даты проверять, а расчёты
 * стыковок выполняет код. Ход работы стримится в интерфейс, чтобы человек видел,
 * что происходит, а не смотрел на спиннер.
 *
 * Экспорты:
 * - POST — запуск агента, ответ потоком
 * - maxDuration — потолок времени: агент делает несколько шагов подряд
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from 'ai';
import { AGENT_MAX_STEPS, AGENT_MODEL, AGENT_TIMEOUT_MS } from '@/modules/agent/config';
import { buildAgentPrompt } from '@/modules/agent/prompt';
import { createSession } from '@/modules/agent/session';
import { createAgentTools } from '@/modules/agent/tools';
import type { RouteChain } from '@/modules/routing/builder';

export const maxDuration = 180;

type AgentRequest = {
  origin?: string;
  destination?: string;
  date?: string;
  /** Виды транспорта: пусто или отсутствует — искать любым. */
  modes?: string[];
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Без ключа агент работать не может: сообщаем прямо, а интерфейс в этом
  // случае откатывается на детерминированный поиск /api/route.
  if (!apiKey) {
    return Response.json(
      {
        code: 'APP_LLM_KEY_MISSING',
        message: 'Не задан ключ доступа к языковой модели.',
      },
      { status: 503 },
    );
  }

  const { origin, destination, date, modes }: AgentRequest = await req.json();

  if (!origin?.trim() || !destination?.trim() || !date?.trim()) {
    return Response.json(
      {
        code: 'APP_ROUTE_QUERY_INCOMPLETE',
        message: 'Укажите город отправления, город назначения и дату поездки.',
      },
      { status: 400 },
    );
  }

  const session = createSession(destination.trim(), AGENT_TIMEOUT_MS, modes ?? []);
  // Сюда инструменты складывают готовые маршруты: их рисует интерфейс,
  // модель их не пересказывает и потому не может исказить.
  const collected: RouteChain[] = [];
  const tools = createAgentTools(session, collected);
  const openrouter = createOpenRouter({ apiKey });

  const searchPrompt =
    `Найди, как добраться: ${origin.trim()} → ${destination.trim()}, дата ${date.trim()}.` +
    (modes?.length
      ? ` Человек готов ехать только этим транспортом: ${modes.join(', ')}. Поиск уже сужен, отдельно фильтровать не нужно.`
      : '');

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        const search = streamText({
          model: openrouter(AGENT_MODEL),
          system: buildAgentPrompt(),
          prompt: searchPrompt,
          tools,
          stopWhen: isStepCount(AGENT_MAX_STEPS),
          abortSignal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
          onError: ({ error }) => {
            console.error('[agent] сбой поиска маршрутов', error);
          },
        });

        writer.merge(toUIMessageStream({ stream: search.stream, tools }));
        await search.text;

        // Агент занят билетами и про ночлег регулярно забывает, хотя это
        // написано в промпте. Проверяем сами и, если поездка уехала на другой
        // день, просим его отдельным заходом подобрать гостиницы — человек
        // видит это как продолжение работы, а не как отдельный запрос.
        const dates = [...new Set(collected.map((chain) => chain.departureAt.slice(0, 10)))];
        const movedToAnotherDay = collected.length > 0 && !dates.includes(date.trim());

        if (!movedToAnotherDay || session.hotels) return;

        const checkOut = dates.sort()[0];
        const stay = streamText({
          model: openrouter(AGENT_MODEL),
          system: buildAgentPrompt(),
          prompt:
            `Уехать ${date.trim()} не получилось, ближайший маршрут — на ${checkOut}. ` +
            `Человеку нужно переночевать в городе ${origin.trim()}. ` +
            `Вызови search_hotels с city="${origin.trim()}", check_in="${date.trim()}", ` +
            `check_out="${checkOut}" и коротко скажи, что нашлось. Больше ничего не ищи.`,
          tools,
          stopWhen: isStepCount(3),
          abortSignal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
          onError: ({ error }) => {
            console.error('[agent] сбой подбора гостиниц', error);
          },
        });

        writer.merge(toUIMessageStream({ stream: stay.stream, tools }));
        await stay.text;
      },
      onError: (error) => {
        console.error('[agent] сбой потока', error);
        return 'Не удалось выполнить поиск.';
      },
      onEnd: () => {
        console.log(
          `[agent] шагов поиска: ${session.searchCount}, маршрутов: ${collected.length}` +
            `, гостиниц: ${session.hotels?.list.length ?? 0}`,
        );
      },
    }),
  });
}
