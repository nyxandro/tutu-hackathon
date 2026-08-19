/**
 * Гостиницы на ночь перед отъездом. Отдельный маршрут, потому что полагаться
 * на то, что агент вспомнит про ночлег, нельзя: он занят поиском билетов и
 * регулярно заканчивает работу, найдя маршрут на другую дату.
 *
 * Экспорты:
 * - POST — поиск гостиниц в городе на указанные даты
 */

import { HOTEL_DETAILS_LIMIT, RESCUE_HOTELS_LIMIT } from '@/modules/routing/config';
import { callTutu } from '@/modules/tutu/client';
import { MAX_TRAVELERS } from '@/modules/routing/config';
import type { HotelOffer } from '@/modules/tutu/types';

export const maxDuration = 90;

type StayRequest = {
  city?: string;
  checkIn?: string;
  checkOut?: string;
  /** Сколько взрослых ночует. Отсутствует — считаем, что один. */
  travelers?: number;
};

function priceOf(hotel: HotelOffer): number | undefined {
  return (hotel.best_offer as { price?: { amount?: number } } | undefined)?.price?.amount;
}

/** Полный адрес, телефоны и время заезда есть только в деталях предложения. */
async function enrich(
  hotel: HotelOffer,
  checkIn: string,
  checkOut: string,
  adults: number,
): Promise<HotelOffer> {
  if (!hotel.hotel_id) return hotel;

  try {
    const details = (
      (await callTutu('get_offer_details', {
        product_type: 'hotels',
        hotel_id: hotel.hotel_id,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        view: 'compact',
      })) as { hotel?: Record<string, unknown> }
    ).hotel;

    if (!details) return hotel;

    const phones = Array.isArray(details.phones)
      ? details.phones.filter((p): p is string => typeof p === 'string' && p.length > 0)
      : [];

    return {
      ...hotel,
      fullAddress: typeof details.address === 'string' ? details.address : undefined,
      phones: phones.length > 0 ? phones : undefined,
      checkInTime: typeof details.check_in_time === 'string' ? details.check_in_time : undefined,
    };
  } catch (error) {
    // Детали — украшение: без них карточка всё равно полезна.
    console.error('[stay] детали отеля не получены', error);
    return hotel;
  }
}

export async function POST(req: Request) {
  const { city, checkIn, checkOut, travelers }: StayRequest = await req.json();
  // Номер ищем на всю компанию: одному человеку и четверым нужны разные варианты.
  const partySize = Math.min(Math.max(Math.round(travelers ?? 1), 1), MAX_TRAVELERS);

  if (!city?.trim() || !checkIn?.trim() || !checkOut?.trim()) {
    return Response.json(
      { code: 'APP_STAY_QUERY_INCOMPLETE', message: 'Укажите город и даты проживания.' },
      { status: 400 },
    );
  }

  try {
    const payload = await callTutu('search_hotels', {
      city_name: city.trim(),
      check_in: checkIn.trim(),
      check_out: checkOut.trim(),
      adults: partySize,
      view: 'compact',
    });

    const all = Array.isArray(payload.hotels) ? (payload.hotels as HotelOffer[]) : [];

    // Признак «можно с животными» приходит только через их же фильтр —
    // одним запросом на весь город, а не на каждый отель.
    const petPayload = await callTutu('search_hotels', {
      city_name: city.trim(),
      check_in: checkIn.trim(),
      check_out: checkOut.trim(),
      adults: partySize,
      hotel_amenities: ['pet_friendly'],
      view: 'compact',
    }).catch(() => ({ hotels: [] }) as { hotels: HotelOffer[] });

    const petIds = new Set(
      (Array.isArray(petPayload.hotels) ? (petPayload.hotels as HotelOffer[]) : [])
        .map((hotel) => hotel.hotel_id)
        .filter((id): id is string => typeof id === 'string'),
    );

    const cheapest = [...all]
      .filter((hotel) => priceOf(hotel) !== undefined)
      .sort((a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity))
      .slice(0, RESCUE_HOTELS_LIMIT);

    const hotels = await Promise.all(
      cheapest.map(async (hotel, index) => {
        const base = index < HOTEL_DETAILS_LIMIT ? await enrich(hotel, checkIn, checkOut, partySize) : hotel;
        return { ...base, petFriendly: petIds.has(base.hotel_id ?? '') };
      }),
    );

    return Response.json({ city: city.trim(), checkIn, checkOut, hotels });
  } catch (error) {
    console.error('[stay] поиск гостиниц не удался', error);
    return Response.json(
      {
        code: 'APP_STAY_SEARCH_FAILED',
        message: 'Не удалось получить список гостиниц. Попробуйте позже.',
      },
      { status: 502 },
    );
  }
}
