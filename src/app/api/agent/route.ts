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
import { createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from 'ai';
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

  const result = streamText({
    model: openrouter(AGENT_MODEL),
    system: buildAgentPrompt(),
    prompt:
      `Найди, как добраться: ${origin.trim()} → ${destination.trim()}, дата ${date.trim()}.` +
      (modes?.length
        ? ` Человек готов ехать только этим транспортом: ${modes.join(', ')}. Поиск уже сужен, отдельно фильтровать не нужно.`
        : ''),
    tools,
    stopWhen: isStepCount(AGENT_MAX_STEPS),
    // Жёсткий потолок времени: без него цикл висит до maxDuration роута,
    // а на демо это выглядит как зависание.
    abortSignal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    onError: ({ error }) => {
      console.error('[agent] сбой цикла', error);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      // Собранные маршруты уходят в интерфейс отдельным событием в конце:
      // так карточки рисуются из данных Туту, а не из пересказа модели.
      onEnd: () => {
        console.log(`[agent] шагов поиска: ${session.searchCount}, маршрутов: ${collected.length}`);
      },
    }),
  });
}
