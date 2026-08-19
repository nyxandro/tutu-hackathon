/**
 * Поле «Сколько вас» в строке поиска: число взрослых пассажиров с шагом ±1.
 *
 * Экспорты:
 * - TravelersPicker — поле со счётчиком от одного до MAX_TRAVELERS
 * - describeTravelers() — склонение «1 человек / 2 человека / 5 человек»
 *   для подписей в других местах интерфейса
 */

'use client';

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

function StepButton({
  sign,
  disabled,
  onClick,
}: {
  sign: '−' | '+';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={sign === '+' ? 'Добавить человека' : 'Убрать человека'}
      style={{
        width: 30,
        height: 30,
        flex: '0 0 30px',
        border: 'none',
        borderRadius: 9,
        background: disabled ? COLORS.line : COLORS.accentSoft,
        color: disabled ? COLORS.mutedSoft : COLORS.accent,
        fontFamily: 'inherit',
        fontSize: 17,
        fontWeight: 600,
        lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {sign}
    </button>
  );
}

export function TravelersPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (count: number) => void;
}) {
  return (
    <div
      style={{
        flex: '0 1 170px',
        minWidth: 150,
        borderRight: `1px solid ${COLORS.line}`,
        minHeight: 72,
        padding: '13px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>Сколько вас</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StepButton sign="−" disabled={value <= 1} onClick={() => onChange(value - 1)} />
        <span
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: COLORS.ink,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 14,
            textAlign: 'center',
          }}
        >
          {value}
        </span>
        <StepButton
          sign="+"
          disabled={value >= MAX_TRAVELERS}
          onClick={() => onChange(value + 1)}
        />
      </div>
    </div>
  );
}
