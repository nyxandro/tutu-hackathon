/**
 * Форматтеры для карточек. Вынесены отдельно, потому что одни и те же
 * правила показа нужны и транспорту, и отелям.
 *
 * Экспорты:
 * - formatPrice() — цена с валютой по-русски
 * - formatTime() — часы и минуты рейса
 * - formatDate() — дата без года
 * - formatDuration() — длительность вида «6 ч 15 мин»
 * - pluralize() — русские окончания для числительных
 */

const MINUTES_IN_HOUR = 60;

export function formatPrice(amount?: number, currency = 'RUB'): string {
  if (typeof amount !== 'number') return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date(iso));
}

export function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(iso));
}

export function formatDuration(minutes?: number): string {
  if (typeof minutes !== 'number') return '—';
  const hours = Math.floor(minutes / MINUTES_IN_HOUR);
  const rest = minutes % MINUTES_IN_HOUR;
  if (!hours) return `${rest} мин`;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

/** Выбор формы слова: pluralize(2, 'пересадка', 'пересадки', 'пересадок'). */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
