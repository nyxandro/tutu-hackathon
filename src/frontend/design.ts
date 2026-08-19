/**
 * Токены дизайна из макета. Держим в одном месте, чтобы цвета не расползались
 * по компонентам строковыми литералами.
 *
 * Экспорты:
 * - COLORS — палитра макета
 * - TRANSPORT_LABELS, TRANSPORT_ICONS — подписи и иконки видов транспорта
 * - formatRub, formatDur, hubIn — форматирование под тексты макета
 */

export const COLORS = {
  bg: '#EDEDFA',
  headerBg: '#150C56',
  headerChip: '#241A78',
  headerChipHover: '#2E2290',
  ink: '#1B1263',
  inkSoft: '#2E2782',
  muted: '#5C57A6',
  mutedSoft: '#8B88C4',
  faint: '#B7B4DC',
  line: '#E2E2F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5FC',
  accent: '#6E56F8',
  accentHover: '#5B45E0',
  accentSoft: '#E4E0FE',
  accentLight: '#8A78FA',
  headerText: '#C9C4F5',
  chipText: '#D6D1FB',
  warn: '#F5821F',
  errorBg: '#FDEBE8',
  errorInk: '#7A1F14',
  error: '#E0402F',
  dash: '#C8C3F0',
} as const;

export const TRANSPORT_LABELS: Record<string, string> = {
  bus: 'Автобус',
  railway: 'Поезд',
  rail: 'Поезд',
  avia: 'Самолёт',
  etrain: 'Электричка',
};

export const TRANSPORT_ICONS: Record<string, string> = {
  bus: 'directions_bus',
  railway: 'train',
  rail: 'train',
  avia: 'flight',
  etrain: 'tram',
};

export function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU').replace(/,/g, ' ')} ₽`;
}

export function formatDur(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours && rest) return `${hours} ч ${rest} мин`;
  if (hours) return `${hours} ч`;
  return `${rest} мин`;
}

/** Предложный падеж для фразы «Пересадка в …». Для городов вне списка — как есть. */
const HUB_PREPOSITIONAL: Record<string, string> = {
  Ярославль: 'Ярославле',
  'Сергиев Посад': 'Сергиевом Посаде',
  Рыбинск: 'Рыбинске',
  Владимир: 'Владимире',
  Кострома: 'Костроме',
  Иваново: 'Иванове',
  'Ростов Великий': 'Ростове Великом',
  Тверь: 'Твери',
  Кашин: 'Кашине',
  Углич: 'Угличе',
  Москва: 'Москве',
  'Санкт-Петербург': 'Санкт-Петербурге',
  'Нижний Новгород': 'Нижнем Новгороде',
  Казань: 'Казани',
  Воронеж: 'Воронеже',
  Курск: 'Курске',
  Тула: 'Туле',
  Рязань: 'Рязани',
  Липецк: 'Липецке',
  Тамбов: 'Тамбове',
  Брянск: 'Брянске',
  Смоленск: 'Смоленске',
  Калуга: 'Калуге',
  Псков: 'Пскове',
  Вологда: 'Вологде',
  Ливны: 'Ливнах',
  Плёс: 'Плёсе',
  Мышкин: 'Мышкине',
  Кинешма: 'Кинешме',
};

export function hubIn(hub: string): string {
  return HUB_PREPOSITIONAL[hub] ?? hub;
}
