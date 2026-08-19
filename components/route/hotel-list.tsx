/**
 * Блок «где переночевать»: показывается, когда уехать в выбранный день нельзя.
 * Число ночей считается до ближайшего дня отъезда, цена — за всё проживание.
 *
 * Экспорты:
 * - HotelList — список гостиниц запасного плана
 */

'use client';

import type { StayFallback } from '@/modules/routing/builder';
import { COLORS, formatRub } from '@/lib/design';
import { pluralize } from '@/lib/format';

export function HotelList({ stay }: { stay: StayFallback }) {
  if (stay.hotels.length === 0) return null;

  const nightsLabel = `${stay.nights} ${pluralize(stay.nights, 'ночь', 'ночи', 'ночей')}`;

  return (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: 20,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        padding: '26px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.015em', color: COLORS.ink }}>
        Где переночевать в {stay.city} — нужно {nightsLabel}
        {stay.nextDepartureDate ? `, до ${stay.nextDepartureDate}` : ''}
      </div>

      {stay.hotels.map((hotel, index) => {
        const price = (hotel.best_offer as { price?: { amount?: number } } | undefined)?.price
          ?.amount;

        return (
          <div
            key={hotel.hotel_id ?? index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 18px',
              borderRadius: 14,
              background: COLORS.surfaceAlt,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.ink }}>
                {hotel.name ?? 'Гостиница'}
                {hotel.stars ? ` ${'★'.repeat(hotel.stars)}` : ''}
              </span>
              <span style={{ fontSize: 14, color: COLORS.muted }}>
                {hotel.rating ? `Рейтинг ${hotel.rating.toFixed(1)}` : 'Без оценок'}
                {hotel.address ? ` · ${hotel.address}` : ''}
              </span>
            </div>

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
                  height: 48,
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
        );
      })}
    </div>
  );
}
