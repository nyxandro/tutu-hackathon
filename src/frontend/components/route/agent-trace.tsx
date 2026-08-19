/**
 * Лента работы агента: что он проверяет прямо сейчас и что нашёл.
 * Технические вызовы инструментов переводятся в человеческие фразы.
 *
 * Экспорты:
 * - AgentTrace — лента шагов
 * - TraceStep — один шаг для отрисовки
 */

'use client';

import { COLORS } from '@/frontend/design';

export type TraceStep = {
  id: string;
  /** Что агент делает: показывается сразу, ещё до результата. */
  action: string;
  /** Чем закончилось: приходит, когда инструмент ответил. */
  result?: string;
  /** Шаг не дал результата — показываем приглушённо, но не прячем. */
  empty?: boolean;
};

export function AgentTrace({ steps, done }: { steps: TraceStep[]; done: boolean }) {
  if (steps.length === 0) return null;

  return (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: 20,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: COLORS.mutedSoft,
        }}
      >
        {done ? 'Как искали' : 'Ищем'}
      </div>

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
