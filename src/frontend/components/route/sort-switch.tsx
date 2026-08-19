/**
 * Переключатель сортировки выдачи: подложка активного пункта переезжает
 * между вариантами, а не перекрашивается скачком.
 *
 * Экспорты:
 * - SortSwitch — группа кнопок с бегущей подложкой
 */

'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { COLORS } from '@/frontend/design';

const SLIDE_MS = 280;

export function SortSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ key: T; label: string }>;
  onChange: (key: T) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const box = useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  // Первую позицию ставим без анимации: иначе при появлении блока подложка
  // приезжает из левого края, хотя ничего не переключали.
  const [animated, setAnimated] = useState(false);

  const measure = useCallback(() => {
    const node = buttons.current.get(value);
    if (!node) return;
    setPill({ left: node.offsetLeft, width: node.offsetWidth });
  }, [value]);

  useLayoutEffect(() => {
    measure();
    // Ширины зависят от шрифта и от того, влезла ли строка в ряд: следим за
    // размерами, иначе после подгрузки шрифта подложка встаёт мимо кнопки.
    const target = box.current;
    if (!target || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={box}
      style={{
        position: 'relative',
        display: 'inline-flex',
        padding: 4,
        gap: 4,
        background: COLORS.surface,
        borderRadius: 12,
      }}
    >
      {pill ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 0,
            width: pill.width,
            transform: `translateX(${pill.left}px)`,
            background: COLORS.accentSoft,
            borderRadius: 9,
            transition: animated
              ? `transform ${SLIDE_MS}ms cubic-bezier(.4,0,.2,1), width ${SLIDE_MS}ms cubic-bezier(.4,0,.2,1)`
              : undefined,
          }}
        />
      ) : null}

      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            ref={(node) => {
              if (node) buttons.current.set(option.key, node);
              else buttons.current.delete(option.key);
            }}
            onClick={() => {
              setAnimated(true);
              onChange(option.key);
            }}
            style={{
              position: 'relative',
              padding: '9px 18px',
              border: 'none',
              borderRadius: 9,
              background: 'transparent',
              color: active ? COLORS.ink : COLORS.muted,
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color .2s',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
