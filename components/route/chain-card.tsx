/**
 * Карточка маршрута: прямого или составного. Составной показывается цепочкой
 * с явной пересадкой — это главное, чего нет в обычной выдаче.
 *
 * Экспорты:
 * - ChainCard — карточка одного варианта поездки
 */

'use client';

import { ArrowRight, Clock, ExternalLink, TriangleAlert } from 'lucide-react';
import type { RouteChain, RouteLeg } from '@/lib/route-builder';
import { formatDate, formatDuration, formatPrice, formatTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TRANSPORT_LABELS: Record<string, string> = {
  avia: 'Самолёт',
  railway: 'Поезд',
  rail: 'Поезд',
  bus: 'Автобус',
  etrain: 'Электричка',
};

function LegRow({ leg, index }: { leg: RouteLeg; index: number }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-lg font-semibold tabular-nums">{formatTime(leg.departureAt)}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span className="text-lg font-semibold tabular-nums">{formatTime(leg.arrivalAt)}</span>
          <Badge variant="secondary" className="font-normal">
            {TRANSPORT_LABELS[leg.transport] ?? leg.transport}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatPrice(leg.price, leg.currency)}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {leg.from} → {leg.to}
          {leg.carriers.length ? ` · ${leg.carriers.join(', ')}` : ''}
        </p>
      </div>

      {leg.checkoutUrl ?? leg.searchUrl ? (
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <a href={leg.checkoutUrl ?? leg.searchUrl} target="_blank" rel="noreferrer">
            Купить
            <ExternalLink className="size-3" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function ChainCard({ chain }: { chain: RouteChain }) {
  const isTransfer = chain.kind === 'transfer';

  return (
    <Card className="flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isTransfer ? (
            <Badge className="font-normal">через {chain.hub}</Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              прямой
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDate(chain.departureAt)} · в пути {formatDuration(chain.totalDurationMin)}
          </span>
        </div>
        <div className="text-lg font-semibold">
          {formatPrice(chain.totalPrice, chain.currency)}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <LegRow leg={chain.legs[0]} index={0} />

        {isTransfer && chain.legs[1] ? (
          <>
            {/* Пересадка — самое важное место карточки: здесь человек рискует */}
            <div
              className={`ml-3 flex items-center gap-2 border-l-2 py-1 pl-4 text-xs ${
                chain.tight
                  ? 'border-amber-400 text-amber-700 dark:text-amber-400'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {chain.tight ? <TriangleAlert className="size-3.5" /> : <Clock className="size-3.5" />}
              <span>
                Пересадка в {chain.hub} — {formatDuration(chain.layoverMin)}
                {chain.tight ? ' · впритык, опоздание первого рейса ломает стыковку' : ''}
              </span>
            </div>

            <LegRow leg={chain.legs[1]} index={1} />
          </>
        ) : null}
      </div>

      {isTransfer ? (
        <p className="border-t pt-2 text-xs text-muted-foreground">
          Это два отдельных билета. Единого документа на всю поездку нет — при опоздании
          второй билет не защищён.
        </p>
      ) : null}
    </Card>
  );
}
