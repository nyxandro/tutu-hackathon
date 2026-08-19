/**
 * Гостиницы на случай, когда уехать в нужный день не выходит: с адресом,
 * телефоном и ценой за всё проживание.
 *
 * Экспорты:
 * - HotelList — список гостиниц запасного плана
 */

'use client';

import Image from 'next/image';
import type { StayOffer } from '@/frontend/hooks/use-agent-search';
import { COLORS, formatRub } from '@/frontend/design';
import { pluralize } from '@/frontend/format';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function nightsBetween(from: string, to: string): number {
  const diff = new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime();
  return Math.max(1, Math.round(diff / MS_IN_DAY));
}

function priceOf(hotel: { best_offer?: Record<string, unknown> }): number | undefined {
  return (hotel.best_offer as { price?: { amount?: number } } | undefined)?.price?.amount;
}

export function HotelList({ stay, anchorId }: { stay: StayOffer; anchorId: string }) {
  if (stay.hotels.length === 0) return null;

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const nightsLabel = `${nights} ${pluralize(nights, 'ночь', 'ночи', 'ночей')}`;

  return (
    <div
      id={anchorId}
      style={{
        background: COLORS.surface,
        borderRadius: 20,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        padding: '26px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        scrollMarginTop: 20,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.015em', color: COLORS.ink }}>
          Где переночевать в {stay.city}
        </div>
        <div style={{ fontSize: 14, color: COLORS.muted }}>
          Нужно {nightsLabel} — цены за всё проживание
        </div>
      </div>

      {stay.hotels.map((hotel, index) => {
        const price = priceOf(hotel);
        const photo = hotel.photos?.[0];
        const map = hotel.fullAddress
          ? `https://yandex.ru/maps/?text=${encodeURIComponent(hotel.fullAddress)}`
          : undefined;

        return (
          <div
            key={hotel.hotel_id ?? index}
            style={{
              display: 'flex',
              gap: 16,
              padding: 16,
              borderRadius: 14,
              background: COLORS.surfaceAlt,
              flexWrap: 'wrap',
            }}
          >
            {photo ? (
              <div
                style={{
                  position: 'relative',
                  width: 96,
                  height: 96,
                  borderRadius: 10,
                  overflow: 'hidden',
                  flex: 'none',
                }}
              >
                <Image src={photo} alt={hotel.name ?? 'Фото'} fill sizes="96px" unoptimized style={{ objectFit: 'cover' }} />
              </div>
            ) : null}

            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.ink }}>
                {hotel.name ?? 'Гостиница'}
                {hotel.stars ? ` ${'★'.repeat(hotel.stars)}` : ''}
              </span>

              <span style={{ fontSize: 14, color: COLORS.muted }}>
                {typeof hotel.rating === 'number' ? `Рейтинг ${hotel.rating.toFixed(1)}` : 'Без оценок'}
                {hotel.review_count ? ` · ${hotel.review_count} отзывов` : ''}
              </span>

              {/* Полный адрес приходит только из деталей; если его нет,
                  показываем расстояние до центра из результатов поиска. */}
              <span style={{ fontSize: 14, color: COLORS.muted }}>
                {hotel.fullAddress ?? hotel.address ?? ''}
              </span>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
                {hotel.phones?.length ? (
                  <a href={`tel:${hotel.phones[0].replace(/[^\d+]/g, '')}`} style={{ color: COLORS.accent, textDecoration: 'none' }}>
                    {hotel.phones[0]}
                  </a>
                ) : null}
                {hotel.checkInTime ? (
                  <span style={{ color: COLORS.mutedSoft }}>заезд с {hotel.checkInTime.slice(0, 5)}</span>
                ) : null}
                {map ? (
                  <a href={map} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: 'none' }}>
                    На карте
                  </a>
                ) : null}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: COLORS.ink,
                  }}
                >
                  {typeof price === 'number' ? formatRub(price) : '—'}
                </span>
                <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>за {nightsLabel}</span>
              </div>

              {hotel.checkout_url ? (
                <a
                  href={hotel.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    padding: '0 20px',
                    borderRadius: 10,
                    background: COLORS.accentSoft,
                    color: '#3B2CA8',
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Забронировать
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
