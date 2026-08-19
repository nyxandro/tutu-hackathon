/**
 * Настройки сборки маршрутов: запас на пересадку, лимиты поиска, модель
 * для подсказки городов.
 *
 * Экспорты:
 * - LAYOVER_MIN, LAYOVER_DEFAULT_MIN — минимальный запас между рейсами
 * - MAX_HUBS_PER_SEARCH, ROUTE_CHAINS_LIMIT — границы перебора
 * - STAY_LOOKAHEAD_DAYS, RESCUE_HOTELS_LIMIT — запасной план с ночёвкой
 * - HUB_SUGGEST_MODEL, HUB_SUGGEST_TIMEOUT_MS, MAX_SUGGESTED_HUBS — подсказка узлов
 */

// Запас времени на пересадку. Зависит от ПАРЫ видов транспорта, а не только от
// второго: после самолёта нужно получить багаж и выехать из аэропорта, а между
// автобусами достаточно перейти платформу. Числа консервативные и совпадают с
// рекомендациями перевозчиков; это наша оценка, а не данные Туту, поэтому
// стыковку «впритык» интерфейс помечает отдельно.
export const LAYOVER_MIN: Record<string, Record<string, number>> = {
  // из самолёта: багаж, выход из зоны прилёта, дорога из аэропорта в город
  avia: { avia: 90, railway: 180, rail: 180, bus: 180, etrain: 150 },
  // из поезда: вокзал обычно в городе, но до автостанции ещё надо добраться
  railway: { avia: 240, railway: 60, rail: 60, bus: 90, etrain: 45 },
  rail: { avia: 240, railway: 60, rail: 60, bus: 90, etrain: 45 },
  bus: { avia: 240, railway: 90, rail: 90, bus: 45, etrain: 45 },
  etrain: { avia: 210, railway: 45, rail: 45, bus: 60, etrain: 30 },
};
export const LAYOVER_DEFAULT_MIN = 90;

// Сколько узловых городов проверяем за один поиск. Каждый узел — два запроса
// к MCP, а у Туту жёсткий rate limit, поэтому число намеренно маленькое.
export const MAX_HUBS_PER_SEARCH = 2;
export const ROUTE_CHAINS_LIMIT = 8;

// На сколько дней вперёд ищем ближайшую возможность уехать, если в выбранный
// день не выходит. Каждый день — отдельный запрос, поэтому горизонт короткий.
export const STAY_LOOKAHEAD_DAYS = 2;
export const RESCUE_HOTELS_LIMIT = 6;

// Модель для подсказки городов-пересадок. Бесплатная: нагрузка минимальная,
// один короткий запрос на поиск. Проверена на живом тесте — единственная из
// бесплатных, кто верно назвал Иваново и Кострому для Плёса.
export const HUB_SUGGEST_MODEL = 'dots-studio/dots-3-note-preview:free';
export const HUB_SUGGEST_TIMEOUT_MS = 15_000;
export const MAX_SUGGESTED_HUBS = 3;
