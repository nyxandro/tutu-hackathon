/**
 * Типы ответов Туту и разбор их структуры. Отдельный от lib/mcp.ts модуль,
 * потому что это же нужно карточкам в браузере, а lib/mcp.ts тянет Prisma
 * и node:crypto и на клиент попасть не может.
 *
 * Экспорты:
 * - TutuToolPayload, TransportOffer, HotelOffer — форма ответов инструментов
 * - extractList() — достаёт список офферов или отелей из ответа
 * - TOOL_STATUS_LABELS — человеческие названия действий агента
 */

/** Ответ Туту после распаковки: транспорт кладёт офферы в offers, отели — в hotels. */
export type TutuToolPayload = {
  offers?: TransportOffer[];
  hotels?: HotelOffer[];
  meta?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
};

export type TransportOffer = {
  offer_id?: string;
  transport?: string;
  price?: { amount?: number; currency?: string };
  duration_min?: number;
  carriers?: string[];
  departure_at?: string;
  arrival_at?: string;
  checkout_url?: string;
  search_results_url?: string;
  segments_count?: number;
  legs?: Array<{
    label?: string;
    from?: string;
    to?: string;
    departure_at?: string;
    arrival_at?: string;
    duration_min?: number;
    segments?: unknown[];
  }>;
  variants?: unknown[];
  fares?: Record<string, unknown>;
};

export type HotelOffer = {
  hotel_id?: string;
  name?: string;
  stars?: number;
  rating?: number;
  review_count?: number;
  address?: string;
  /** Координаты гостиницы — по ним считаем расстояние от человека. */
  location?: { lat?: number; lng?: number };
  photos?: string[];
  checkout_url?: string;
  best_offer?: Record<string, unknown>;
  review_summary?: Record<string, unknown>;
  /** Поля ниже приходят только из get_offer_details, в поиске их нет. */
  fullAddress?: string;
  phones?: string[];
  checkInTime?: string;
  /** Отель принимает с животными — по фильтру `pet_friendly` самого Туту. */
  petFriendly?: boolean;
};

/** Возвращает список офферов независимо от домена — им пользуются и выжимка, и UI. */
export function extractList(payload: TutuToolPayload | undefined): {
  kind: 'transport' | 'hotels' | 'none';
  items: Array<TransportOffer | HotelOffer>;
} {
  if (Array.isArray(payload?.offers)) return { kind: 'transport', items: payload.offers };
  if (Array.isArray(payload?.hotels)) return { kind: 'hotels', items: payload.hotels };
  return { kind: 'none', items: [] };
}

/** Что показывать пользователю, пока агент дёргает конкретный инструмент. */
export const TOOL_STATUS_LABELS: Record<string, string> = {
  search_avia: 'Ищу авиабилеты',
  search_rail: 'Ищу поезда',
  search_bus: 'Ищу автобусы',
  search_etrain: 'Ищу электрички',
  search_hotels: 'Подбираю отели',
  search_multitransport: 'Сравниваю виды транспорта',
  get_offer_details: 'Уточняю детали варианта',
  get_rail_seatmap: 'Смотрю свободные места',
  create_checkout_link: 'Готовлю ссылку на оплату',
  get_avia_instructions: 'Сверяюсь с правилами по авиабилетам',
  get_rail_instructions: 'Сверяюсь с правилами по поездам',
  get_bus_instructions: 'Сверяюсь с правилами по автобусам',
  get_etrain_instructions: 'Сверяюсь с правилами по электричкам',
  get_hotels_instructions: 'Сверяюсь с правилами по отелям',
  get_multitransport_instructions: 'Сверяюсь с правилами по маршрутам',
  fetch_resource: 'Читаю данные Туту',
};
