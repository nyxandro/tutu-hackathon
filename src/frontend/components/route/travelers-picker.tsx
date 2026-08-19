/**
 * Поле «Кто едет» в строке поиска: выбор числа взрослых пассажиров.
 *
 * Экспорты:
 * - TravelersPicker — поле с выпадающим списком от одного до MAX_TRAVELERS
 * - describeTravelers() — склонение «1 человек / 2 человека / 5 человек»
 */

'use client';

import { useState } from 'react';
import { COLORS } from '@/frontend/design';
import { MAX_TRAVELERS } from '@/modules/routing/config';

/** Русское склонение: 1 человек, 2–4 человека, 5 и больше — человек. */
export function describeTravelers(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} человек`;
  if (last === 1) return `${count} человек`;
  if (last >= 2 && last <= 4) return `${count} человека`;
  return `${count} человек`;
}

export function TravelersPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = Array.from({ length: MAX_TRAVELERS }, (_, index) => index + 1);

  return (
    <div
      style={{
        flex: '0 1 170px',
        minWidth: 140,
        position: 'relative',
        borderRight: `1px solid ${COLORS.line}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          minHeight: 72,
          border: 'none',
          background: 'transparent',
          padding: '13px 18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
          fontFamily: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>Кто едет</span>
        <span style={{ fontSize: 17, fontWeight: 500, color: COLORS.ink }}>
          {describeTravelers(value)}
        </span>
      </button>

      {open ? (
        <>
          {/* Подложка ловит клик мимо списка: без неё он остаётся открытым. */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              minWidth: 200,
              zIndex: 31,
              background: COLORS.surface,
              borderRadius: 14,
              boxShadow: '0 18px 44px rgba(21,12,86,.22)',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {options.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  onChange(count);
                  setOpen(false);
                }}
                style={{
                  border: 'none',
                  background: count === value ? COLORS.accentSoft : 'transparent',
                  color: count === value ? COLORS.accent : COLORS.ink,
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: count === value ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {describeTravelers(count)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
