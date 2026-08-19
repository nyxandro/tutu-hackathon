/**
 * Пустой экран до первого поиска: объясняет, что произойдёт после запроса.
 *
 * Экспорты:
 * - HowItWorks — карточка «Что происходит после запроса»
 */

'use client';

import { COLORS } from '@/frontend/design';

const STEPS = [
  'Проверяем прямые рейсы: поезда, автобусы, самолёты, электрички.',
  'Если прямых нет — подбираем соседние города, через которые можно проехать.',
  'Сводим стыковки по времени и показываем, во сколько вы будете на месте.',
];

export function HowItWorks() {
  return (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: 20,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        padding: '28px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: COLORS.ink }}>
        Что происходит после запроса
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
        }}
      >
        {STEPS.map((text, index) => (
          <div key={text} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span
              style={{
                fontSize: 44,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-.04em',
                color: COLORS.accentLight,
              }}
            >
              0{index + 1}
            </span>
            <span style={{ fontSize: 16, color: COLORS.inkSoft, lineHeight: 1.45 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
