/**
 * Карточка отеля. У отелей своя структура ответа Туту (hotels[] с фото,
 * рейтингом и best_offer), поэтому она отделена от транспортной.
 *
 * Экспорты:
 * - HotelCard — карточка одного отеля
 */

'use client';

import Image from 'next/image';
import { ExternalLink, Star } from 'lucide-react';
import type { HotelOffer } from '@/lib/tutu-types';
import { formatPrice, pluralize } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Ниже этой оценки бейдж рейтинга перестаёт быть «зелёным» — визуальная подсказка.
const GOOD_RATING = 8;

export function HotelCard({ hotel }: { hotel: HotelOffer }) {
  const bestOffer = hotel.best_offer as
    | { price?: { amount?: number; currency?: string } }
    | undefined;
  const photo = hotel.photos?.[0];
  const reviews = hotel.review_count ?? 0;

  return (
    <Card className="flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md">
      {photo ? (
        <div className="relative h-36 w-full bg-muted">
          <Image
            src={photo}
            alt={hotel.name ?? 'Фото отеля'}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm leading-snug font-semibold">{hotel.name ?? 'Отель'}</h4>
          {typeof hotel.rating === 'number' ? (
            <Badge variant={hotel.rating >= GOOD_RATING ? 'default' : 'secondary'}>
              {hotel.rating.toFixed(1)}
            </Badge>
          ) : null}
        </div>

        {typeof hotel.stars === 'number' && hotel.stars > 0 ? (
          <div className="flex gap-0.5">
            {Array.from({ length: hotel.stars }).map((_, index) => (
              <Star key={index} className="size-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
        ) : null}

        {hotel.address ? (
          <p className="text-xs leading-snug text-muted-foreground">{hotel.address}</p>
        ) : null}

        {reviews > 0 ? (
          <p className="text-xs text-muted-foreground">
            {reviews} {pluralize(reviews, 'отзыв', 'отзыва', 'отзывов')}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="text-base font-semibold">
            {formatPrice(bestOffer?.price?.amount, bestOffer?.price?.currency)}
          </div>
          {hotel.checkout_url ? (
            <Button asChild size="sm">
              <a href={hotel.checkout_url} target="_blank" rel="noreferrer">
                Смотреть
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
