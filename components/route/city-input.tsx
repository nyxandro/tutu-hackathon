/**
 * Поле города с подсказками. У MCP Туту нет автодополнения, поэтому список
 * берётся из локального справочника городов России.
 *
 * Экспорты:
 * - CityInput — поле ввода с выпадающими подсказками
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import cities from '@/data/russian-cities.json';
import { CITY_SUGGESTIONS_LIMIT } from '@/lib/config';
import { COLORS } from '@/lib/design';

type City = { n: string; r: string; p: number };

const ALL_CITIES = cities as City[];

/** Ё и е в русских названиях пишут вперемешку: Плёс ищется и как «Плес». */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/ё/g, 'е');
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
}: {
  label: string;
  value: string;
  placeholder: string;
  first?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => (open ? findCities(value) : []), [open, value]);

  function choose(city: City) {
    onChange(city.n);
    setOpen(false);
  }

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
          minHeight: 72,
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>{label}</span>
        <input
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          // Клик по подсказке приходит после blur, поэтому закрываем с задержкой.
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
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
            color: COLORS.ink,
            background: 'transparent',
            padding: 0,
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
      </label>

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
