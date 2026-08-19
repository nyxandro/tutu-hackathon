/**
 * Гостиницы на случай, когда уехать в нужный день не выходит. Товарные карточки
 * с крупным фото: человек выбирает ночлег глазами, а не по строчке текста.
 *
 * Экспорты:
 * - HotelList — сетка гостиниц запасного плана
 */

'use client';

import Image from 'next/image';
import type { HotelOffer } from '@/modules/tutu/types';
import type { StayOffer } from '@/frontend/hooks/use-agent-search';
import { COLORS, formatRub, hubIn } from '@/frontend/design';
import { pluralize } from '@/frontend/format';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function nightsBetween(from: string, to: string): number {
  const diff = new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime();
  return Math.max(1, Math.round(diff / MS_IN_DAY));
}

function priceOf(hotel: HotelOffer): number | undefined {
  return (hotel.best_offer as { price?: { amount?: number } } | undefined)?.price?.amount;
}

export function HotelList({ stay, anchorId }: { stay: StayOffer; anchorId: string }) {
  if (stay.hotels.length === 0) return null;

  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const nightsLabel = `${nights} ${pluralize(nights, 'ночь', 'ночи', 'ночей')}`;

  return (
    <div id={anchorId} style={{ display: 'flex', flexDirection: 'column', gap: 16, scrollMarginTop: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: COLORS.ink }}>
          Где переночевать в {hubIn(stay.city)}
        </div>
        <div style={{ fontSize: 15, color: COLORS.muted }}>
          Нужно {nightsLabel} — цены за всё проживание
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {stay.hotels.map((hotel, index) => (
          <HotelCard key={hotel.hotel_id ?? index} hotel={hotel} nightsLabel={nightsLabel} />
        ))}
      </div>
    </div>
  );
}

function HotelCard({ hotel, nightsLabel }: { hotel: HotelOffer; nightsLabel: string }) {
  const price = priceOf(hotel);
  const photo = hotel.photos?.[0];
  const address = hotel.fullAddress ?? hotel.address;
  const map = address ? `https://yandex.ru/maps/?text=${encodeURIComponent(address)}` : undefined;

  return (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: 18,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Фото крупное: ночлег выбирают глазами, а миниатюра ничего не говорит */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: COLORS.surfaceAlt }}>
        {photo ? (
          <Image
            src={photo}
            alt={hotel.name ?? 'Фото гостиницы'}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            unoptimized
            style={{ objectFit: 'cover' }}
          />
        ) : null}

        {typeof hotel.rating === 'number' ? (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              padding: '5px 10px',
              borderRadius: 999,
              background: 'rgba(21,12,86,.82)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {hotel.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.ink, lineHeight: 1.25 }}>
            {hotel.name ?? 'Гостиница'}
          </span>
          {hotel.stars ? (
            <span style={{ fontSize: 13, color: '#F5A623', letterSpacing: 1 }}>
              {'★'.repeat(hotel.stars)}
            </span>
          ) : null}
        </div>

        {address ? (
          <span style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.4 }}>{address}</span>
        ) : null}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
          {hotel.review_count ? (
            <span style={{ color: COLORS.mutedSoft }}>{hotel.review_count} отзывов</span>
          ) : null}
          {hotel.checkInTime ? (
            <span style={{ color: COLORS.mutedSoft }}>заезд с {hotel.checkInTime.slice(0, 5)}</span>
          ) : null}
          {hotel.phones?.length ? (
            <a
              href={`tel:${hotel.phones[0].replace(/[^\d+]/g, '')}`}
              style={{ color: COLORS.accent, textDecoration: 'none' }}
            >
              {hotel.phones[0]}
            </a>
          ) : null}
          {map ? (
            <a href={map} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: 'none' }}>
              На карте
            </a>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-.015em',
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
                background: COLORS.accent,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Забронировать
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
