/**
 * Карточка маршрута по макету: шапка с бейджем узла и ценой, плечи поездки,
 * полоса пересадки между ними и сноска про два отдельных билета.
 *
 * Экспорты:
 * - ChainCard — карточка одного варианта поездки
 */

'use client';

import type { RouteChain, RouteLeg } from '@/modules/routing/builder';
import {
  COLORS,
  TRANSPORT_ICONS,
  TRANSPORT_LABELS,
  formatDur,
  formatRub,
  hubIn,
} from '@/lib/design';
import { formatDate, formatTime } from '@/lib/format';

function Icon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  return (
    <span
      aria-hidden
      style={{
        fontFamily: "'Material Symbols Rounded'",
        fontSize: size,
        lineHeight: 1,
        color,
        fontVariationSettings: "'FILL' 1, 'wght' 500, 'opsz' 20",
        flex: 'none',
      }}
    >
      {name}
    </span>
  );
}

function Leg({ leg, number }: { leg: RouteLeg; number?: number }) {
  const buyUrl = leg.checkoutUrl ?? leg.searchUrl;

  return (
    <div style={{ padding: '22px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {number ? (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: COLORS.surfaceAlt,
            color: COLORS.muted,
            fontSize: 14,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            marginTop: 2,
          }}
        >
          {number}
        </span>
      ) : null}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: COLORS.ink,
              }}
            >
              {formatTime(leg.departureAt)} → {formatTime(leg.arrivalAt)}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13,
                fontWeight: 600,
                color: COLORS.muted,
              }}
            >
              <Icon name={TRANSPORT_ICONS[leg.transport] ?? 'directions_bus'} />
              {TRANSPORT_LABELS[leg.transport] ?? leg.transport}
            </span>
            <span style={{ fontSize: 14, color: COLORS.mutedSoft }}>{formatDur(leg.durationMin)}</span>
          </div>

          <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.45 }}>
            {leg.from} → {leg.to}
          </div>
          {leg.carriers.length ? (
            <div style={{ fontSize: 13, color: COLORS.mutedSoft }}>{leg.carriers.join(', ')}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color: COLORS.ink,
            }}
          >
            {formatRub(leg.price)}
          </span>
          {buyUrl ? (
            <a
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                padding: '0 24px',
                borderRadius: 10,
                background: COLORS.accentSoft,
                color: '#3B2CA8',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              В корзину
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Полоса пересадки: спокойная при нормальном запасе, оранжевая когда впритык. */
function Layover({ chain }: { chain: RouteChain }) {
  const tight = chain.tight;

  return (
    <div
      style={{
        margin: '0 24px',
        padding: '13px 16px',
        borderRadius: 14,
        background: COLORS.surface,
        border: `1.5px dashed ${tight ? COLORS.warn : COLORS.dash}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon
        name={tight ? 'warning' : 'schedule'}
        size={tight ? 21 : 20}
        color={tight ? COLORS.warn : COLORS.accentLight}
      />
      <span style={{ fontSize: 15, color: COLORS.inkSoft, lineHeight: 1.45 }}>
        {tight
          ? `Пересадка ${chain.layoverMin} минут — впритык. Опоздание первого рейса ломает стыковку.`
          : `Пересадка в ${hubIn(chain.hub ?? '')} — ${formatDur(chain.layoverMin ?? 0)}`}
      </span>
    </div>
  );
}

export function ChainCard({ chain }: { chain: RouteChain }) {
  const isTransfer = chain.kind === 'transfer';

  return (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: 20,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          padding: '20px 24px',
          borderBottom: `1px solid ${COLORS.line}`,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 32,
              padding: '0 15px',
              borderRadius: 999,
              background: isTransfer ? COLORS.accentSoft : COLORS.surfaceAlt,
              color: isTransfer ? COLORS.ink : COLORS.muted,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {isTransfer ? `через ${chain.hub}` : 'прямой'}
          </span>
          <span style={{ fontSize: 15, color: COLORS.muted }}>
            {formatDate(chain.departureAt)} · {formatDur(chain.totalDurationMin)} в пути · на месте в{' '}
            {formatTime(chain.arrivalAt)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span
            style={{
              fontSize: 26,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-.015em',
              color: COLORS.ink,
            }}
          >
            {formatRub(chain.totalPrice)}
          </span>
          <span style={{ fontSize: 13, color: COLORS.mutedSoft }}>
            {isTransfer ? 'за два билета' : 'один билет'}
          </span>
        </div>
      </div>

      {chain.legs.map((leg, index) => (
        <div key={`${leg.departureAt}-${index}`}>
          <Leg leg={leg} number={isTransfer ? index + 1 : undefined} />
          {isTransfer && index < chain.legs.length - 1 ? <Layover chain={chain} /> : null}
        </div>
      ))}

      {isTransfer ? (
        <div
          style={{
            padding: '15px 24px',
            background: COLORS.surfaceAlt,
            fontSize: 13,
            color: COLORS.muted,
            lineHeight: 1.5,
          }}
        >
          Это два отдельных билета. Единого документа на всю поездку нет — при опоздании второй
          билет не защищён.
        </div>
      ) : null}
    </div>
  );
}
