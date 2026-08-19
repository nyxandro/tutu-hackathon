/**
 * Подсказка городов-пересадок языковой моделью.
 *
 * Справочник «регион → административный центр» покрывает типовые случаи, но
 * транспортная связность богаче административного деления: в Плёс формально
 * ехать через Иваново, а по факту ближе Кострома. Модель знает такие вещи.
 *
 * Важно: модель НЕ придумывает рейсы, цены и время — она называет только города.
 * Всё названное проверяется живыми данными Туту, и в интерфейсе такие узлы
 * помечаются как подсказанные ИИ.
 *
 * Экспорты:
 * - suggestHubs() — до трёх городов-кандидатов между двумя точками
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { HUB_SUGGEST_MODEL, HUB_SUGGEST_TIMEOUT_MS, MAX_SUGGESTED_HUBS } from '@/lib/config';

const SYSTEM_PROMPT = `Ты знаешь транспортную географию России: какие города связаны
поездами и междугородними автобусами. Отвечай строго JSON без пояснений.`;

function buildPrompt(origin: string, destination: string): string {
  return `Из какого города реально пересесть, чтобы добраться из «${origin}» в «${destination}»
на поезде или автобусе с одной пересадкой? Назови до ${MAX_SUGGESTED_HUBS} городов,
через которые действительно ходит транспорт в «${destination}» — обычно это
ближайший крупный узел, а не столица региона.
Верни только JSON вида {"cities":["Город","Город"]}.`;
}

/** Достаёт список городов из ответа модели, устойчиво к обёрткам ```json. */
function parseCities(text: string): string[] {
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as { cities?: unknown };
    if (!Array.isArray(parsed.cities)) return [];
    return parsed.cities
      .filter((city): city is string => typeof city === 'string' && city.trim().length > 0)
      .map((city) => city.trim())
      .slice(0, MAX_SUGGESTED_HUBS);
  } catch {
    return [];
  }
}

/**
 * Возвращает города-кандидаты. Пустой массив — штатный результат: значит
 * работаем на справочнике, а поиск всё равно состоится.
 */
export async function suggestHubs(origin: string, destination: string): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Ключа нет — молча работаем на справочнике: подсказка модели необязательна.
  if (!apiKey) return [];

  try {
    const openrouter = createOpenRouter({ apiKey });
    const { text } = await generateText({
      model: openrouter(HUB_SUGGEST_MODEL),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(origin, destination),
      abortSignal: AbortSignal.timeout(HUB_SUGGEST_TIMEOUT_MS),
    });

    return parseCities(text);
  } catch (error) {
    // Бесплатные модели регулярно отвечают 429 — это не повод ломать поиск.
    console.error('[hubs] модель не подсказала города', error);
    return [];
  }
}
