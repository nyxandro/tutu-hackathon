/**
 * Выбор даты по макету: попап с сеткой месяца, переключением месяцев и
 * быстрыми кнопками «Сегодня» / «Завтра».
 *
 * Экспорты:
 * - DatePicker — поле «Когда» вместе с календарём
 */

'use client';

import { useMemo, useState } from 'react';
import { COLORS } from '@/frontend/design';

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const MONTHS_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_IN_GRID = 42;
const DAYS_WITHOUT_TRAILING_WEEK = 35;

/** Локальная дата в формате YYYY-MM-DD: toISOString сдвинул бы день по UTC. */
function toIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function humanDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  // Ближайшие два дня называем словами: так понятнее, что поиск идёт «прямо
  // сейчас», а не про абстрактную дату в календаре.
  const today = new Date();
  if (iso === toIso(today)) return 'Сегодня';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === toIso(tomorrow)) return 'Завтра';
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
}

export function DatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<string | null>(null);

  const { days, monthLabel, base } = useMemo(() => {
    const selected = new Date(`${value}T00:00:00`);
    const anchor = month
      ? new Date(`${month}-01T00:00:00`)
      : new Date(selected.getFullYear(), selected.getMonth(), 1);

    const todayIso = toIso(new Date());
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    // Неделя начинается с понедельника, а getDay() считает от воскресенья.
    const shift = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - shift);

    const cells = Array.from({ length: DAYS_IN_GRID }, (_, index) => {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const iso = toIso(day);
      return {
        iso,
        label: String(day.getDate()),
        outside: day.getMonth() !== anchor.getMonth(),
        selected: iso === value,
        today: iso === todayIso,
      };
    });

    // Последняя неделя целиком из соседнего месяца — не показываем её.
    const trimmed = cells.slice(DAYS_WITHOUT_TRAILING_WEEK).every((cell) => cell.outside)
      ? cells.slice(0, DAYS_WITHOUT_TRAILING_WEEK)
      : cells;

    return {
      days: trimmed,
      monthLabel: `${MONTHS_NOMINATIVE[anchor.getMonth()]} ${anchor.getFullYear()}`,
      base: anchor,
    };
  }, [value, month]);

  function shiftMonth(step: number) {
    const next = new Date(base.getFullYear(), base.getMonth() + step, 1);
    setMonth(toIso(next).slice(0, 7));
  }

  function pick(iso: string) {
    onChange(iso);
    setMonth(iso.slice(0, 7));
    setOpen(false);
  }

  function pickOffset(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    pick(toIso(date));
  }

  return (
    <div
      style={{
        flex: '0 1 210px',
        minWidth: 170,
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
          justifyContent: 'center',
          gap: 2,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>Когда</span>
        <span style={{ fontSize: 17, fontWeight: 500, color: COLORS.ink }}>{humanDate(value)}</span>
      </button>

      {open ? (
        <>
          {/* Прозрачный слой: клик мимо календаря закрывает его */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />

          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 40,
              width: 322,
              background: COLORS.surface,
              borderRadius: 20,
              boxShadow: '0 18px 50px rgba(21,12,86,.28)',
              padding: '18px 18px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.ink }}>{monthLabel}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <MonthButton icon="chevron_left" onClick={() => shiftMonth(-1)} />
                <MonthButton icon="chevron_right" onClick={() => shiftMonth(1)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.mutedSoft,
                    paddingBottom: 4,
                  }}
                >
                  {day}
                </span>
              ))}

              {days.map((day) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => pick(day.iso)}
                  style={{
                    height: 40,
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    background: day.selected ? COLORS.accent : 'transparent',
                    color: day.selected ? '#FFFFFF' : day.outside ? '#C6C3E4' : COLORS.ink,
                    fontWeight: day.selected || day.today ? 600 : 400,
                    boxShadow: !day.selected && day.today ? `inset 0 0 0 1.5px ${COLORS.dash}` : 'none',
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${COLORS.line}`, paddingTop: 12 }}>
              <QuickButton onClick={() => pickOffset(0)}>Сегодня</QuickButton>
              <QuickButton onClick={() => pickOffset(1)}>Завтра</QuickButton>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MonthButton({ icon, onClick }: { icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        border: 'none',
        borderRadius: 10,
        background: COLORS.surfaceAlt,
        color: COLORS.muted,
        fontFamily: "'Material Symbols Rounded'",
        fontSize: 20,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      {icon}
    </button>
  );
}

function QuickButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 14px',
        border: 'none',
        borderRadius: 999,
        background: COLORS.surfaceAlt,
        color: '#3B2CA8',
        fontFamily: 'inherit',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
