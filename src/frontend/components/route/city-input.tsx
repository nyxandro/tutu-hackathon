/**
 * Поле города с подсказками. У MCP Туту нет автодополнения, поэтому список
 * берётся из локального справочника городов России.
 *
 * Экспорты:
 * - CityInput — поле ввода с выпадающими подсказками
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import cities from '@/modules/routing/cities.json';
import { CITY_SUGGESTIONS_LIMIT } from '@/frontend/config';
import { COLORS } from '@/frontend/design';

type City = { n: string; r: string; p: number };

const ALL_CITIES = cities as City[];

/** Ё и е в русских названиях пишут вперемешку: Плёс ищется и как «Плес». */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е');
}

/**
 * Город принимается, только если он есть в справочнике: MCP Туту ищет по
 * названию, и на выдуманном городе поиск молча вернёт пустоту вместо ошибки.
 */
export function isKnownCity(value: string): boolean {
  const needle = normalize(value);
  if (!needle) return false;
  return ALL_CITIES.some((city) => normalize(city.n) === needle);
}

function findCities(query: string): City[] {
  const needle = normalize(query);
  if (needle.length < 2) return [];

  const starts: City[] = [];
  const contains: City[] = [];

  for (const city of ALL_CITIES) {
    const name = normalize(city.n);
    if (name === needle) continue;
    if (name.startsWith(needle)) starts.push(city);
    else if (name.includes(needle)) contains.push(city);
    if (starts.length >= CITY_SUGGESTIONS_LIMIT) break;
  }

  // Справочник отсортирован по населению, поэтому крупные города идут первыми.
  return [...starts, ...contains].slice(0, CITY_SUGGESTIONS_LIMIT);
}

export function CityInput({
  label,
  value,
  placeholder,
  first,
  onChange,
  onDetect,
  detecting,
  detected,
  detectError,
}: {
  label: string;
  value: string;
  placeholder: string;
  first?: boolean;
  onChange: (value: string) => void;
  /** Кнопка «определить мой город» — только у поля отправления. */
  onDetect?: () => void;
  detecting?: boolean;
  /** Город определён успешно — подсвечиваем прицел зелёным. */
  detected?: boolean;
  /** Текст ошибки: показывается всплывашкой над полем. */
  detectError?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Показываем «выберите из списка» только после того, как человек ушёл из
  // поля: ругаться на каждую букву во время набора незачем.
  const [dirty, setDirty] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => (open ? findCities(value) : []), [open, value]);

  function choose(city: City) {
    onChange(city.n);
    setOpen(false);
    setDirty(false);
  }

  const unknown = dirty && value.trim().length > 0 && !isKnownCity(value);

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 130,
        position: 'relative',
        borderRight: `1px solid ${COLORS.line}`,
        borderRadius: first ? '14px 0 0 14px' : undefined,
      }}
    >
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
          padding: '13px 18px',
          paddingRight: onDetect ? 46 : 18,
          minHeight: 72,
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>{label}</span>
        <input
          value={detecting ? 'Определяем город…' : value}
          readOnly={detecting}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(0);
            setDirty(false);
          }}
          onFocus={() => setOpen(true)}
          // Клик по подсказке приходит после blur, поэтому закрываем с задержкой.
          // Заодно решаем судьбу набранного текста: единственная подсказка
          // подставляется сама, иначе поле помечается как незаполненное.
          onBlur={() => {
            blurTimer.current = setTimeout(() => {
              setOpen(false);
              if (!value.trim() || isKnownCity(value)) {
                setDirty(false);
                return;
              }
              const matches = findCities(value);
              if (matches.length === 1) onChange(matches[0].n);
              else setDirty(true);
            }, 150);
          }}
          onKeyDown={(event) => {
            if (!suggestions.length) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => (index + 1) % suggestions.length);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === 'Enter' && open) {
              event.preventDefault();
              choose(suggestions[active]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: 17,
            fontWeight: 500,
            color: detecting ? COLORS.mutedSoft : unknown ? '#E0402F' : COLORS.ink,
            background: 'transparent',
            padding: 0,
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
      </label>

      {unknown ? (
        <span
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 18,
            fontSize: 12,
            color: '#FF9C90',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Выберите город из списка
        </span>
      ) : null}

      {onDetect ? (
        <button
          type="button"
          onClick={() => {
            setErrorOpen(false);
            onDetect();
          }}
          onMouseEnter={() => detectError && setErrorOpen(true)}
          onMouseLeave={() => setErrorOpen(false)}
          title="Определить мой город"
          aria-label="Определить мой город"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 30,
            height: 30,
            border: 'none',
            borderRadius: 8,
            background: 'transparent',
            color: detectError ? '#E0402F' : detected ? '#1FA971' : detecting ? COLORS.faint : COLORS.accent,
            cursor: detecting ? 'default' : 'pointer',
            fontFamily: "'Material Symbols Rounded'",
            fontSize: 20,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {detecting ? 'more_horiz' : detectError ? 'location_off' : 'my_location'}
        </button>
      ) : null}

      {/* Ошибку показываем поверх поля, а не строкой под формой: она
          относится к этому полю и не должна занимать место постоянно. */}
      {detectError && errorOpen ? (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            right: 8,
            zIndex: 50,
            width: 230,
            padding: '10px 12px',
            borderRadius: 12,
            background: COLORS.ink,
            color: '#FFFFFF',
            fontSize: 13,
            lineHeight: 1.4,
            boxShadow: '0 10px 28px rgba(21,12,86,.32)',
          }}
        >
          {detectError}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 40,
            width: 320,
            maxHeight: 320,
            overflowY: 'auto',
            background: COLORS.surface,
            borderRadius: 16,
            boxShadow: '0 18px 50px rgba(21,12,86,.28)',
            padding: 6,
          }}
        >
          {suggestions.map((city, index) => (
            <button
              key={`${city.n}-${city.r}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                choose(city);
              }}
              onMouseEnter={() => setActive(index)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                width: '100%',
                padding: '9px 12px',
                border: 'none',
                borderRadius: 10,
                background: index === active ? COLORS.surfaceAlt : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 500, color: COLORS.ink }}>{city.n}</span>
              <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>{city.r}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
