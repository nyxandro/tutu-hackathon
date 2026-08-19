/**
 * Тёмная шапка с формой поиска: города, дата с календарём, особые условия
 * и примеры городов без прямого сообщения.
 *
 * Экспорты:
 * - SearchForm — шапка экрана
 */

'use client';

import { ROUTE_EXAMPLES, TRANSPORT_MODES, TRAVEL_CONSTRAINTS } from '@/frontend/config';
import { COLORS, TRANSPORT_ICONS } from '@/frontend/design';
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
  onDetect,
  detecting,
  detected,
  detectError,
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
  onDetect: () => void;
  detecting: boolean;
  detected: boolean;
  detectError: string | null;
}) {

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <CityInput
              label="Откуда"
              value={from}
              onChange={onFrom}
              placeholder="Москва"
              first
              onDetect={onDetect}
              detecting={detecting}
              detected={detected}
              detectError={detectError}
            />
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

          {/* Фильтры видны всегда: в срочной ситуации человек не должен искать,
              где их раскрыть. Транспорт — иконками, чтобы строка не разрасталась. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 13, color: COLORS.mutedSoft }}>Выбранный транспорт</span>

            <div style={{ display: 'flex', gap: 6 }}>
              {TRANSPORT_MODES.map((mode) => {
                const picked = modes.includes(mode.key);
                // Пока не выбрано ничего, ищем любым транспортом — значит
                // исключённых нет и крестики рисовать не за что.
                const excluded = modes.length > 0 && !picked;

                return (
                  <button
                    key={mode.key}
                    onClick={() => onMode(mode.key)}
                    title={excluded ? `${mode.label} — исключён` : mode.label}
                    aria-label={mode.label}
                    aria-pressed={picked}
                    style={{
                      position: 'relative',
                      width: 36,
                      height: 32,
                      border: 'none',
                      borderRadius: 9,
                      background: excluded ? COLORS.surface : picked ? COLORS.accentSoft : COLORS.headerChip,
                      color: excluded ? COLORS.faint : picked ? COLORS.ink : COLORS.chipText,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Material Symbols Rounded'",
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    {TRANSPORT_ICONS[mode.key] ?? 'help'}

                    {excluded ? (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          top: -5,
                          right: -5,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          background: COLORS.surface,
                          color: COLORS.accent,
                          fontFamily: "'Material Symbols Rounded'",
                          fontSize: 13,
                          lineHeight: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 4px rgba(21,12,86,.3)',
                        }}
                      >
                        close
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <span
              style={{
                width: 1,
                height: 20,
                background: 'rgba(255,255,255,.14)',
                margin: '0 2px',
              }}
            />

            {TRAVEL_CONSTRAINTS.map((item) => {
              const active = Boolean(constraints[item.key]);
              return (
                <button
                  key={item.key}
                  onClick={() => onConstraint(item.key)}
                  aria-pressed={active}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    border: 'none',
                    borderRadius: 999,
                    background: active ? COLORS.accentSoft : COLORS.headerChip,
                    color: active ? COLORS.ink : COLORS.chipText,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
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
