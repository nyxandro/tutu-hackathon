/**
 * Настройки интеграции с MCP-сервером Туту.
 *
 * Экспорты:
 * - MCP_SERVER_URL, MCP_CLIENT_NAME — подключение
 * - MCP_CACHE_TTL_MS, WARM_CACHE_TTL_MS — время жизни кэша ответов
 * - MODEL_OFFERS_LIMIT, MODEL_PAYLOAD_MAX_CHARS — сколько уходит в языковую модель
 */

export const MCP_SERVER_URL = 'https://mcp.tutu.ru/mcp';
export const MCP_CLIENT_NAME = 'tutu-hackathon-app';

// Офферы живут минутами, поэтому кэш живых запросов короткий: он защищает
// от rate limit при отладке, но не показывает протухшие цены.
export const MCP_CACHE_TTL_MS = 5 * 60 * 1000;

// Прогретые из fixtures ответы живут долго: это данные для показа, которые
// должны пережить блокировку сервера и перезапуск демо.
export const WARM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// В модель уходит только верхушка списка — остальное рисует интерфейс
// из полного ответа, который в модель не попадает вовсе.
export const MODEL_OFFERS_LIMIT = 5;

// Страховка для инструментов с заранее неизвестной структурой ответа
// (детали оффера, схема вагона): в модель не уедет мегабайт.
export const MODEL_PAYLOAD_MAX_CHARS = 8_000;
