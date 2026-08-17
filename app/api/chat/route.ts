/**
 * Агентный цикл: принимает историю диалога, даёт модели инструменты MCP Туту
 * и стримит ответ в UI.
 *
 * Экспорты:
 * - POST — обработчик чата
 * - maxDuration — потолок времени ответа (агент делает несколько шагов подряд)
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { AGENT_MAX_STEPS, LLM_MODEL } from '@/lib/config';
import { saveChat } from '@/lib/chat-store';
import { getTutuTools } from '@/lib/mcp';
import { buildSystemPrompt } from '@/lib/prompt';

export const maxDuration = 120;

type ChatRequest = {
  messages: UIMessage[];
  sessionId?: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Ключ обязателен: без него приложение не работает, поэтому падаем сразу
  // и с понятным текстом, а не молча деградируем.
  if (!apiKey) {
    return Response.json(
      {
        code: 'APP_LLM_KEY_MISSING',
        message:
          'Не задан ключ доступа к языковой модели. Добавьте OPENROUTER_API_KEY в .env и перезапустите приложение.',
      },
      { status: 500 },
    );
  }

  const { messages, sessionId }: ChatRequest = await req.json();
  const openrouter = createOpenRouter({ apiKey });
  const tools = await getTutuTools();

  const result = streamText({
    model: openrouter(LLM_MODEL),
    system: buildSystemPrompt(),
    // tools передаются и сюда, и в convertToModelMessages: иначе выжимка
    // из toModelOutput не применится к истории и в модель уедут полные ответы.
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: isStepCount(AGENT_MAX_STEPS),
    onError: ({ error }) => {
      console.error('[chat] сбой генерации', error);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      originalMessages: messages,
      onEnd: async ({ messages: finalMessages }) => {
        if (!sessionId) return;
        try {
          await saveChat(sessionId, finalMessages);
        } catch (error) {
          // Диалог уже показан пользователю — сбой записи в базу не должен
          // ломать ответ на экране, но обязан быть виден в логах.
          console.error('[chat] не удалось сохранить диалог', error);
        }
      },
    }),
  });
}
