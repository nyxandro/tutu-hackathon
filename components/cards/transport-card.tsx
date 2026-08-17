/**
 * Карточка транспортного оффера: самолёт, поезд, автобус, электричка.
 * Формат ответа Туту у всех четырёх доменов общий, поэтому карточка одна.
 *
 * Экспорты:
 * - TransportCard — карточка одного оффера
 */

'use client';

import { ArrowRight, ExternalLink } from 'lucide-react';
import type { TransportOffer } from '@/lib/tutu-types';
import { formatDate, formatDuration, formatPrice, formatTime, pluralize } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TRANSPORT_LABELS: Record<string, string> = {
  avia: 'Самолёт',
  airplane: 'Самолёт',
  railway: 'Поезд',
  rail: 'Поезд',
  train: 'Поезд',
  bus: 'Автобус',
  etrain: 'Электричка',
  suburban: 'Электричка',
};

export function TransportCard({ offer }: { offer: TransportOffer }) {
  const leg = offer.legs?.[0];
  const transfers = Math.max((offer.segments_count ?? 1) - 1, 0);
  const label = TRANSPORT_LABELS[offer.transport ?? ''] ?? 'Маршрут';
  const link = offer.checkout_url ?? offer.search_results_url;

  return (
    <Card className="flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="font-normal">
          {label}
        </Badge>
        {offer.carriers?.length ? (
          <span className="truncate text-xs text-muted-foreground">{offer.carriers.join(', ')}</span>
        ) : null}
      </div>

      {/* Основная строка: время отправления и прибытия — то, на что смотрят первым делом */}
      <div className="flex items-center gap-3">
        <div>
          <div className="text-xl font-semibold tabular-nums">{formatTime(offer.departure_at)}</div>
          <div className="text-xs text-muted-foreground">{formatDate(offer.departure_at)}</div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[11px] text-muted-foreground">
            {formatDuration(offer.duration_min)}
          </span>
          <div className="flex w-full items-center gap-1">
            <div className="h-px flex-1 bg-border" />
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {transfers === 0
              ? 'без пересадок'
              : `${transfers} ${pluralize(transfers, 'пересадка', 'пересадки', 'пересадок')}`}
          </span>
        </div>

        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums">{formatTime(offer.arrival_at)}</div>
          <div className="text-xs text-muted-foreground">{formatDate(offer.arrival_at)}</div>
        </div>
      </div>

      {leg?.from && leg?.to ? (
        <div className="text-xs leading-snug text-muted-foreground">
          {leg.from} → {leg.to}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <div className="text-lg font-semibold">
          {formatPrice(offer.price?.amount, offer.price?.currency)}
        </div>
        {link ? (
          <Button asChild size="sm">
            <a href={link} target="_blank" rel="noreferrer">
              Выбрать
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
