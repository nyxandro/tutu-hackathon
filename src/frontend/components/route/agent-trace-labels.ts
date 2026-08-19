/**
 * Перевод вызовов инструментов агента в человеческие фразы для ленты.
 *
 * Экспорты:
 * - describeCall() — что агент делает
 * - describeResult() — чем закончилось
 */

type ToolInput = Record<string, unknown>;
type ToolOutput = Record<string, unknown>;

export function describeCall(toolName: string, input: ToolInput): string {
  const from = String(input.origin ?? '');
  const to = String(input.destination ?? '');

  switch (toolName) {
    case 'search_leg':
      return `Смотрю рейсы: ${from} → ${to}`;
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
): { text: string; empty: boolean } {
  if (typeof output.error === 'string') {
    return { text: output.error, empty: true };
  }

  if (output.repeated === true) {
    return { text: 'уже проверяли этот маршрут', empty: true };
  }

  const count = typeof output.count === 'number' ? output.count : undefined;

  switch (toolName) {
    case 'search_leg': {
      if (count === 0) return { text: 'прямых рейсов нет', empty: true };
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
      return { text: `${count} — ${kinds}${price}`, empty: false };
    }

    case 'suggest_hubs': {
      const hubs = Array.isArray(output.hubs) ? output.hubs : [];
      if (hubs.length === 0) return { text: 'подходящих городов не нашлось', empty: true };
      return { text: `проверю: ${hubs.join(', ')}`, empty: false };
    }

    case 'build_connections': {
      if (!count) return { text: 'рейсы есть, но по времени не стыкуются', empty: true };
      return { text: `${count} — маршрут собран`, empty: false };
    }

    case 'search_hotels':
      if (!count) return { text: 'гостиниц не нашлось', empty: true };
      return { text: `${count} вариантов для ночёвки`, empty: false };

    default:
      return { text: 'готово', empty: false };
  }
}
