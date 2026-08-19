/**
 * Тёмная шапка с формой поиска: города, дата с календарём, особые условия
 * и примеры городов без прямого сообщения.
 *
 * Экспорты:
 * - SearchForm — шапка экрана
 */

'use client';

import { useState } from 'react';
import { ROUTE_EXAMPLES, TRAVEL_CONSTRAINTS } from '@/lib/config';
import { COLORS } from '@/lib/design';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function humanDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function SearchForm({
  from,
  to,
  date,
  showExamples,
  onFrom,
  onTo,
  onDate,
  onSearch,
  onExample,
}: {
  from: string;
  to: string;
  date: string;
  showExamples: boolean;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onDate: (value: string) => void;
  onSearch: () => void;
  onExample: (example: { origin: string; destination: string }) => void;
}) {
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [constraints, setConstraints] = useState<Record<string, boolean>>({});

  return (
    <div style={{ background: COLORS.headerBg, padding: '22px 24px 30px' }}>
      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', color: '#FFFFFF' }}>
              как
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-.03em',
                color: COLORS.accentLight,
              }}
            >
              доехать
            </span>
          </div>
          <div style={{ fontSize: 15, color: COLORS.headerText }}>
            Находим, как доехать, когда прямого билета нет
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSearch();
            }}
            style={{
              display: 'flex',
              background: COLORS.surface,
              borderRadius: 14,
              boxShadow: '0 8px 30px rgba(21,12,86,.24)',
              flexWrap: 'wrap',
            }}
          >
            <Field label="Откуда" value={from} onChange={onFrom} placeholder="Москва" first />
            <Field label="Куда" value={to} onChange={onTo} placeholder="Углич" />

            <label
              style={{
                flex: '0 1 210px',
                minWidth: 170,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 2,
                padding: '13px 18px',
                borderRight: `1px solid ${COLORS.line}`,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>Когда</span>
              <span style={{ fontSize: 17, fontWeight: 500, color: COLORS.ink }}>
                {humanDate(date)}
              </span>
              <input
                type="date"
                value={date}
                onChange={(event) => onDate(event.target.value)}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 170,
                  height: 60,
                  cursor: 'pointer',
                }}
              />
            </label>

            <button
              type="submit"
              style={{
                flex: '0 0 210px',
                minHeight: 72,
                padding: '0 20px',
                border: 'none',
                borderRadius: '0 14px 14px 0',
                background: COLORS.accent,
                color: '#FFFFFF',
                fontFamily: 'inherit',
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Найти способы добраться
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setExtrasOpen((open) => !open)}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 34,
                padding: '0 14px',
                border: 'none',
                borderRadius: 8,
                background: COLORS.headerChip,
                color: COLORS.chipText,
                fontFamily: 'inherit',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Особые условия
            </button>

            {extrasOpen ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TRAVEL_CONSTRAINTS.map((item) => {
                  const active = Boolean(constraints[item.key]);
                  return (
                    <button
                      key={item.key}
                      onClick={() =>
                        setConstraints((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      style={{
                        height: 38,
                        padding: '0 16px',
                        border: 'none',
                        borderRadius: 999,
                        background: active ? COLORS.accentSoft : COLORS.headerChip,
                        color: active ? COLORS.ink : COLORS.chipText,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {showExamples ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: COLORS.mutedSoft }}>Попробуйте:</span>
              {ROUTE_EXAMPLES.map((example) => (
                <button
                  key={`${example.origin}-${example.destination}`}
                  onClick={() => onExample(example)}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    border: 'none',
                    borderRadius: 8,
                    background: COLORS.headerChip,
                    color: COLORS.chipText,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {example.origin} → {example.destination}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  first,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  first?: boolean;
}) {
  return (
    <label
      style={{
        flex: '1 1 0',
        minWidth: 130,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        padding: '13px 18px',
        borderRight: `1px solid ${COLORS.line}`,
        borderRadius: first ? '14px 0 0 14px' : undefined,
      }}
    >
      <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          fontSize: 17,
          fontWeight: 500,
          color: COLORS.ink,
          background: 'transparent',
          padding: 0,
          width: '100%',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}
