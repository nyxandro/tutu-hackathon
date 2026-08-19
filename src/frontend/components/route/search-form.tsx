/**
 * Тёмная шапка с формой поиска: города, дата с календарём, особые условия
 * и примеры городов без прямого сообщения.
 *
 * Экспорты:
 * - SearchForm — шапка экрана
 */

'use client';

import { useState } from 'react';
import { ROUTE_EXAMPLES, TRANSPORT_MODES, TRAVEL_CONSTRAINTS } from '@/frontend/config';
import { COLORS } from '@/frontend/design';
import { CityInput } from '@/frontend/components/route/city-input';
import { DatePicker } from '@/frontend/components/route/date-picker';

export function SearchForm({
  from,
  to,
  date,
  showExamples,
  constraints,
  modes,
  onFrom,
  onTo,
  onDate,
  onSearch,
  onExample,
  onConstraint,
  onMode,
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
  constraints: Record<string, boolean>;
  onConstraint: (key: string) => void;
  modes: string[];
  onMode: (key: string) => void;
}) {
  const [extrasOpen, setExtrasOpen] = useState(false);

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
            <CityInput label="Откуда" value={from} onChange={onFrom} placeholder="Москва" first />
            <CityInput label="Куда" value={to} onChange={onTo} placeholder="Углич" />

            <DatePicker value={date} onChange={onDate} />

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: COLORS.mutedSoft }}>Чем ехать:</span>
                  {TRANSPORT_MODES.map((mode) => {
                    const active = modes.includes(mode.key);
                    return (
                      <button
                        key={mode.key}
                        onClick={() => onMode(mode.key)}
                        style={{
                          height: 34,
                          padding: '0 14px',
                          border: 'none',
                          borderRadius: 999,
                          background: active ? COLORS.accentSoft : COLORS.headerChip,
                          color: active ? COLORS.ink : COLORS.chipText,
                          fontFamily: 'inherit',
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                  {modes.length > 0 ? (
                    <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>
                      выбрано — ищем только этим
                    </span>
                  ) : null}
                </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TRAVEL_CONSTRAINTS.map((item) => {
                  const active = Boolean(constraints[item.key]);
                  return (
                    <button
                      key={item.key}
                      onClick={() => onConstraint(item.key)}
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
