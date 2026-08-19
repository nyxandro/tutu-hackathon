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

// Шагов хватает на: прямой поиск, подсказку узлов, два узла по два плеча,
// две сборки связок и финальный ответ.
export const AGENT_MAX_STEPS = 12;

export const AGENT_TIMEOUT_MS = 120_000;
