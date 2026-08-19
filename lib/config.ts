/**
 * Константы приложения. Всё, что не секрет и не зависит от окружения, живёт здесь,
 * а не в .env — так значение видно в коде и меняется одной строкой.
 *
 * Экспорты:
 * - MCP_SERVER_URL, MCP_CLIENT_NAME — подключение к MCP Туту
 * - LLM_MODEL, LLM_FALLBACK_MODEL — модели OpenRouter (запасная на случай сбоя провайдера)
 * - AGENT_MAX_STEPS — предел шагов агентного цикла
 * - MCP_CACHE_TTL_MS — время жизни кэша ответов MCP
 * - MODEL_OFFERS_LIMIT — сколько офферов уходит в модель (в UI идут все)
 * - MCP_TIMEOUT_MS — таймаут вызова инструмента
 */

export const MCP_SERVER_URL = 'https://mcp.tutu.ru/mcp';
export const MCP_CLIENT_NAME = 'tutu-hackathon-app';

// Основная и запасная модели специально у разных провайдеров: если один ляжет
// во время демо, переключение стоит одной строки.
export const LLM_MODEL = 'anthropic/claude-sonnet-5';
export const LLM_FALLBACK_MODEL = 'google/gemini-2.5-flash';

// Потолок шагов: поиск → уточнение → детали → ответ укладывается с запасом,
// но зациклиться агент не сможет.
export const AGENT_MAX_STEPS = 10;

// Офферы живут минутами, поэтому кэш короткий: он защищает от 429 при отладке
// и повторных запросов, но не показывает протухшие цены.
export const MCP_CACHE_TTL_MS = 5 * 60 * 1000;

// В модель уходит только верхушка списка — остальное рисует UI из полного ответа.
export const MODEL_OFFERS_LIMIT = 5;

export const MCP_TIMEOUT_MS = 30_000;

// Страховка для инструментов с заранее неизвестной структурой ответа
// (детали оффера, схема вагона): в модель не уедет мегабайт.
export const MODEL_PAYLOAD_MAX_CHARS = 8_000;

// Сколько карточек показывать сразу, остальные — по кнопке «показать ещё».
export const UI_OFFERS_LIMIT = 6;

// --- Сценарий «Как уехать» ---

// Запас времени, чтобы физически успеть на отправление. Для самолёта это
// регистрация и досмотр, для наземного — дорога до вокзала. Числа — наша
// оценка, а не данные Туту, поэтому в интерфейсе они подписаны как оценка.
export const LEAD_TIME_MIN: Record<string, number> = {
  avia: 120,
  railway: 40,
  rail: 40,
  bus: 30,
  etrain: 25,
};
export const LEAD_TIME_DEFAULT_MIN = 40;

// Сколько вариантов отхода показываем и сколько отелей на случай «уехать нельзя».
export const RESCUE_OPTIONS_LIMIT = 12;
export const RESCUE_HOTELS_LIMIT = 6;

// Прибытие в этом диапазоне считается ночным: поездка заменяет ночь в отеле.
export const NIGHT_ARRIVAL_FROM_HOUR = 4;
export const NIGHT_ARRIVAL_TO_HOUR = 11;

// Сколько узловых городов проверяем за один поиск. Каждый узел — два запроса
// к MCP, а у Туту есть rate limit, поэтому число намеренно маленькое.
export const MAX_HUBS_PER_SEARCH = 2;
export const ROUTE_CHAINS_LIMIT = 8;

// Примеры на пустом экране: города, куда нет прямого сообщения из Москвы —
// именно на них видно, ради чего сделан продукт.
export const ROUTE_EXAMPLES = [
  { origin: 'Москва', destination: 'Углич' },
  { origin: 'Москва', destination: 'Мышкин' },
  { origin: 'Москва', destination: 'Плёс' },
];

// На сколько дней вперёд ищем ближайшую возможность уехать, если в выбранный
// день не выходит. Каждый день — отдельный запрос, поэтому горизонт короткий.
export const STAY_LOOKAHEAD_DAYS = 2;

// Прогретые из fixtures ответы живут долго: это не «свежие цены», а данные для
// показа, которые должны пережить блокировку сервера и перезапуск демо.
export const WARM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Модель для подсказки городов-пересадок. Бесплатная: нагрузка минимальная,
// один короткий запрос на поиск. Проверена на живом тесте — единственная из
// бесплатных, кто верно назвал Иваново и Кострому для Плёса.
export const HUB_SUGGEST_MODEL = 'dots-studio/dots-3-note-preview:free';
export const HUB_SUGGEST_TIMEOUT_MS = 15_000;
export const MAX_SUGGESTED_HUBS = 3;

// Тайминги смены этапов на экране поиска, миллисекунды от старта запроса.
export const SEARCH_STAGE_MS = [1200, 2300, 3400];

// Особые условия поездки. Пока влияют только на подсказки в интерфейсе —
// фильтрация по ним появится, когда будет что фильтровать в ответах Туту.
export const TRAVEL_CONSTRAINTS = [
  { key: 'pet', label: 'Еду с животным' },
  { key: 'child', label: 'Еду с ребёнком' },
  { key: 'night', label: 'Не подходит ночная поездка' },
  { key: 'lower', label: 'Нужны только нижние места' },
];

// Сколько городов показываем в подсказках при вводе.
export const CITY_SUGGESTIONS_LIMIT = 7;
