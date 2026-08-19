/**
 * Тёмная шапка с формой поиска: города, дата с календарём, особые условия
 * и примеры городов без прямого сообщения.
 *
 * Экспорты:
 * - SearchForm — шапка экрана
 */

'use client';

import { TRANSPORT_MODES, TRAVEL_CONSTRAINTS } from '@/frontend/config';
import { COLORS, TRANSPORT_ICONS } from '@/frontend/design';
import { CityInput, isKnownCity } from '@/frontend/components/route/city-input';
import { DatePicker } from '@/frontend/components/route/date-picker';
import { TravelersPicker } from '@/frontend/components/route/travelers-picker';

export function SearchForm({
  from,
  to,
  date,
  constraints,
  excluded,
  onFrom,
  onTo,
  onDate,
  travelers,
  onTravelers,
  onSearch,
  onConstraint,
  onMode,
  onDetect,
  detecting,
  detected,
  detectError,
  compact,
}: {
  from: string;
  to: string;
  date: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onDate: (value: string) => void;
  travelers: number;
  onTravelers: (count: number) => void;
  onSearch: () => void;
  constraints: Record<string, boolean>;
  onConstraint: (key: string) => void;
  excluded: string[];
  onMode: (key: string) => void;
  onDetect: () => void;
  detecting: boolean;
  detected: boolean;
  detectError: string | null;
  /** После запуска поиска шапка сжимается: место нужно результатам. */
  compact: boolean;
}) {

  // Оба города обязаны быть из справочника: на выдуманном названии MCP Туту
  // молча вернёт пустоту, и человек решит, что рейсов нет.
  const ready = isKnownCity(from) && isKnownCity(to);

  return (
    <div
      style={{
        // Фотография с затемнением: без слоя поверх белый текст и поля на
        // светлых участках снимка становятся нечитаемыми.
        backgroundColor: COLORS.headerBg,
        backgroundImage:
          `linear-gradient(180deg, rgba(21,12,86,.82) 0%, rgba(21,12,86,.90) 100%), url('/bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 35%',
        padding: compact ? '18px 24px 24px' : '44px 24px 52px',
        // До первого поиска обложка крупная, но не во весь экран: под ней
        // должна помещаться карточка «что происходит после запроса», иначе
        // человек её просто не видит. С началом поиска высота схлопывается —
        // место нужно результатам, поэтому min-height анимируется с padding.
        minHeight: compact ? '0vh' : '58vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'padding .45s cubic-bezier(.4,0,.2,1), min-height .45s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div
        style={{
          width: '100%',
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
            <span
              style={{
                fontSize: compact ? 22 : 30,
                fontWeight: 800,
                letterSpacing: '-.03em',
                color: '#FFFFFF',
                transition: 'font-size .45s cubic-bezier(.4,0,.2,1)',
              }}
            >
              как
            </span>
            <span
              style={{
                fontSize: compact ? 22 : 30,
                fontWeight: 800,
                letterSpacing: '-.03em',
                color: COLORS.accentLight,
                transition: 'font-size .45s cubic-bezier(.4,0,.2,1)',
              }}
            >
              доехать
            </span>
          </div>
          <div
            style={{
              fontSize: compact ? 15 : 17,
              color: COLORS.headerText,
              transition: 'font-size .45s cubic-bezier(.4,0,.2,1)',
            }}
          >
            Поможем найти ближайший билет
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!ready) return;
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

            <TravelersPicker value={travelers} onChange={onTravelers} />

            <button
              type="submit"
              disabled={!ready}
              style={{
                flex: '0 0 170px',
                minHeight: 72,
                padding: '0 20px',
                border: 'none',
                borderRadius: '0 14px 14px 0',
                background: ready ? COLORS.accent : COLORS.accentSoft,
                color: ready ? '#FFFFFF' : COLORS.mutedSoft,
                fontFamily: 'inherit',
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.15,
                cursor: ready ? 'pointer' : 'default',
                transition: 'background .2s, color .2s',
              }}
            >
              Подобрать
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
                // По умолчанию включены все виды: человек выключает лишнее,
                // а не собирает список с нуля — так быстрее в срочной ситуации.
                const on = !excluded.includes(mode.key);

                return (
                  <button
                    key={mode.key}
                    onClick={() => onMode(mode.key)}
                    title={on ? mode.label : `${mode.label} — не искать`}
                    aria-label={mode.label}
                    aria-pressed={on}
                    style={{
                      width: 36,
                      height: 32,
                      border: 'none',
                      borderRadius: 9,
                      background: COLORS.headerChip,
                      color: on ? COLORS.success : COLORS.faint,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Material Symbols Rounded'",
                      fontSize: 18,
                      lineHeight: 1,
                      transition: 'color .15s ease',
                    }}
                  >
                    {TRANSPORT_ICONS[mode.key] ?? 'help'}
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

        </div>
      </div>
    </div>
  );
}
