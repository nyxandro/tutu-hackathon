/**
 * Настройки агентного цикла.
 *
 * Экспорты:
 * - AGENT_MODEL, AGENT_FALLBACK_MODEL — модели OpenRouter
 * - AGENT_MAX_STEPS — предел шагов рассуждения
 * - AGENT_TIMEOUT_MS — потолок времени на весь поиск
 */

// Бесплатная модель: нагрузка небольшая, один поиск — несколько коротких шагов.
// Проверена на подсказке городов, отвечает структурированно.
export const AGENT_MODEL = 'dots-studio/dots-3-note-preview:free';

// Запасная на случай 429 у основной: у бесплатных моделей это обычное дело.
export const AGENT_FALLBACK_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

// Шагов должно хватать на весь лимит запросов к Туту плюс сборки связок
// и финальный ответ, иначе агент оборвётся на середине перебора.
export const AGENT_MAX_STEPS = 30;

export const AGENT_TIMEOUT_MS = 120_000;

// Повторы обращений к Туту: только временные сбои, только идемпотентный поиск.
// Две попытки — компромисс между устойчивостью и нежеланием добивать их сервер.
export const RETRY_ATTEMPTS = 2;
export const RETRY_BASE_DELAY_MS = 1500;
