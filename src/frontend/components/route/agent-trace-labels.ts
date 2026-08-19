/**
 * Перевод вызовов инструментов агента в человеческие фразы для ленты.
 *
 * Экспорты:
 * - describeCall() — что агент делает
 * - describeResult() — чем закончилось
 */

type ToolInput = Record<string, unknown>;
type ToolOutput = Record<string, unknown>;

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** «2026-08-19» → «19 августа». Без даты шаги выглядят как повторы одного и того же. */
function humanDate(iso: unknown): string {
  if (typeof iso !== 'string') return '';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function describeCall(toolName: string, input: ToolInput): string {
  const from = String(input.origin ?? '');
  const to = String(input.destination ?? '');
  const when = humanDate(input.date);

  switch (toolName) {
    case 'search_leg':
      return `Смотрю рейсы: ${from} → ${to}${when ? `, ${when}` : ''}`;
    case 'suggest_hubs':
      return 'Ищу, через какие города можно проехать';
    case 'build_connections':
      return `Свожу стыковки через ${String(input.hub ?? 'пересадку')}`;
    case 'search_hotels':
      return `Подбираю гостиницы в городе ${String(input.city ?? '')}`;
    default:
      return 'Обращаюсь к Туту';
  }
}

export function describeResult(
  toolName: string,
  output: ToolOutput,
  input: ToolInput = {},
): { text: string; empty: boolean } {
  const when = humanDate(input.date);

  // Инструменты сообщают об ошибке объектом { error: true, code, message }.
  // В ленте показываем короткую человеческую причину по коду, а не системный
  // текст: он писался для модели, а не для читателя.
  if (output.error === true || typeof output.error === 'string') {
    const byCode: Record<string, string> = {
      ORIGIN_DEAD_FOR_DATE: when
        ? `${when} уехать не выйдет, смотрю следующий день`
        : 'в этот день уехать не выйдет, смотрю следующий',
      DUPLICATE_REQUEST: 'уже проверяли этот маршрут',
      SEARCH_BUDGET_SPENT: 'лимит запросов исчерпан, работаю с найденным',
      DEADLINE_REACHED: 'время на поиск вышло, работаю с найденным',
      TUTU_RATE_LIMITED: 'Туту ограничил частоту запросов',
      TUTU_TIMEOUT: 'Туту не ответил вовремя',
      TUTU_UNAVAILABLE: 'Туту не ответил',
      LEG_NOT_FOUND: 'плечо потерялось, собираю заново',
      LEGS_DO_NOT_MEET: 'это плечи разных маршрутов',
    };

    const code = String(output.code ?? '');
    const fallback =
      typeof output.message === 'string'
        ? output.message
        : typeof output.error === 'string'
          ? output.error
          : 'не получилось';

    return { text: byCode[code] ?? fallback, empty: true };
  }

  if (output.repeated === true) {
    return { text: 'уже проверяли этот маршрут', empty: true };
  }

  const count = typeof output.count === 'number' ? output.count : undefined;

  switch (toolName) {
    case 'search_leg': {
      if (count === 0) {
        return { text: when ? `на ${when} рейсов нет` : 'рейсов нет', empty: true };
      }
      const transports = Array.isArray(output.transports) ? output.transports : [];
      const labels: Record<string, string> = {
        bus: 'автобусы',
        railway: 'поезда',
        rail: 'поезда',
        avia: 'самолёты',
        etrain: 'электрички',
      };
      const kinds = transports.map((t) => labels[String(t)] ?? String(t)).join(', ');
      const price = typeof output.cheapest_price === 'number' ? `, от ${Math.round(output.cheapest_price)} ₽` : '';
      return { text: `${count} ${kinds ? `${kinds}` : 'рейсов'}${price}`, empty: false };
    }

    case 'suggest_hubs': {
      const hubs = Array.isArray(output.hubs) ? output.hubs : [];
      // Пустой справочник — не тупик: агент подберёт города сам, и следующим
      // шагом это видно. Прежний текст «городов не нашлось» пугал зря.
      if (hubs.length === 0) {
        return { text: 'в справочнике нет, подберу города сам', empty: false };
      }
      return { text: `проверю: ${hubs.join(', ')}`, empty: false };
    }

    case 'build_connections': {
      if (!count) {
        return {
          text: when
            ? `${when} рейсы по времени не сходятся, стоит проверить другой день`
            : 'рейсы по времени не сходятся',
          empty: true,
        };
      }
      return { text: `собрали ${count}`, empty: false };
    }

    case 'search_hotels':
      if (!count) return { text: 'гостиниц не нашлось', empty: true };
      return { text: `${count} вариантов для ночёвки`, empty: false };

    default:
      return { text: 'готово', empty: false };
  }
}
