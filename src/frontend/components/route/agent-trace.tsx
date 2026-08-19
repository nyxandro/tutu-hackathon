/**
 * Лента работы агента: что он проверяет прямо сейчас и что нашёл.
 * Технические вызовы инструментов переводятся в человеческие фразы.
 *
 * Экспорты:
 * - AgentTrace — лента шагов
 * - TraceStep — один шаг для отрисовки
 */

'use client';

import { useEffect, useState } from 'react';
import { COLORS } from '@/frontend/design';
import { TRACE_COLLAPSE_DELAY_MS } from '@/frontend/config';

export type TraceStep = {
  id: string;
  /** Что агент делает: показывается сразу, ещё до результата. */
  action: string;
  /** Чем закончилось: приходит, когда инструмент ответил. */
  result?: string;
  /** Шаг не дал результата — показываем приглушённо, но не прячем. */
  empty?: boolean;
};

/**
 * Пока агент работает, блок обведён бегущей кромкой: экран должен выглядеть
 * живым, а не зависшим. Когда поиск закончен, обёртка исчезает вместе с ней.
 */
function LiveShell({ live, children }: { live: boolean; children: React.ReactNode }) {
  if (!live) return <>{children}</>;
  return <div className="agent-live">{children}</div>;
}

export function AgentTrace({ steps, done }: { steps: TraceStep[]; done: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  // Через секунду после окончания поиска лента сворачивается: своё дело она
  // сделала, а место нужно результатам. Сбрасывать состояние не требуется —
  // родитель пересоздаёт компонент на каждый новый поиск через key.
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setCollapsed(true), TRACE_COLLAPSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [done]);

  // Первый шаг приходит через несколько секунд: модель успевает подумать
  // и только потом зовёт инструмент. Без заглушки экран в это время пустой,
  // и поиск выглядит сломанным.
  if (steps.length === 0) {
    if (done) return null;

    return (
      <LiveShell live>
        <div
          style={{
            background: COLORS.surface,
            borderRadius: 19,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
        <span
          style={{
            width: 20,
            height: 20,
            flex: '0 0 20px',
            borderRadius: '50%',
            border: `2px solid ${COLORS.accentSoft}`,
            borderTopColor: COLORS.accent,
            animation: 'route-spin .9s linear infinite',
          }}
        />
          <span style={{ fontSize: 16, color: COLORS.ink }}>
            Агент изучает варианты на выбранную дату
          </span>
        </div>
      </LiveShell>
    );
  }

  const found = steps.filter((step) => step.result && !step.empty).length;

  return (
    <LiveShell live={!done}>
      <div
        style={{
          background: COLORS.surface,
          borderRadius: done ? 20 : 19,
          boxShadow: done ? '0 4px 18px rgba(21,12,86,.06)' : undefined,
          padding: collapsed ? '18px 28px' : '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: collapsed ? 0 : 14,
          transition: 'padding .35s ease, gap .35s ease',
        }}
      >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        disabled={!done}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          width: '100%',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: done ? 'pointer' : 'default',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: COLORS.mutedSoft,
          }}
        >
          {done ? 'Как искали' : 'Ищем'}
          {collapsed ? ` · ${steps.length} шагов, ${found} с результатом` : ''}
        </span>

        {done ? (
          <span
            aria-hidden
            style={{
              fontFamily: "'Material Symbols Rounded'",
              fontSize: 22,
              lineHeight: 1,
              color: COLORS.mutedSoft,
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform .35s ease',
            }}
          >
            expand_more
          </span>
        ) : null}
      </button>

      {/* Плавное сворачивание через grid: 1fr → 0fr анимируется, в отличие
          от height:auto, и не требует знать высоту содержимого заранее. */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: collapsed ? '0fr' : '1fr',
          opacity: collapsed ? 0 : 1,
          transition: 'grid-template-rows .35s ease, opacity .25s ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14 }}>
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              const running = !done && isLast && !step.result;

              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <Marker running={running} empty={step.empty} finished={Boolean(step.result)} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 16,
                        color: running ? COLORS.ink : COLORS.inkSoft,
                        fontWeight: running ? 600 : 400,
                        lineHeight: 1.4,
                      }}
                    >
                      {step.action}
                    </span>
                    {step.result ? (
                      <span
                        style={{
                          fontSize: 14,
                          color: step.empty ? COLORS.mutedSoft : COLORS.muted,
                          lineHeight: 1.4,
                        }}
                      >
                        {step.result}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    </LiveShell>
  );
}

function Marker({
  running,
  empty,
  finished,
}: {
  running: boolean;
  empty?: boolean;
  finished: boolean;
}) {
  const base = {
    width: 22,
    height: 22,
    borderRadius: 999,
    flex: 'none' as const,
    marginTop: 1,
  };

  if (running) {
    return (
      <span
        style={{
          ...base,
          border: `2px solid ${COLORS.accent}`,
          borderTopColor: 'transparent',
          animation: 'route-spin 1s linear infinite',
        }}
      />
    );
  }

  if (!finished) {
    return <span style={{ ...base, border: `2px solid ${COLORS.line}` }} />;
  }

  return (
    <span
      style={{
        ...base,
        background: empty ? COLORS.surfaceAlt : COLORS.accentSoft,
        color: empty ? COLORS.mutedSoft : COLORS.accent,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {empty ? '–' : '✓'}
    </span>
  );
}
