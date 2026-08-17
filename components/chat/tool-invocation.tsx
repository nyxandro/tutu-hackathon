/**
 * Отображение вызова инструмента MCP: пока идёт поиск — статус, когда пришёл
 * ответ — карточки. Именно здесь полный ответ Туту превращается в интерфейс.
 *
 * Экспорты:
 * - ToolInvocation — рендер одной tool-части сообщения
 * - ToolPart — форма части сообщения с вызовом инструмента
 */

'use client';

import { useState } from 'react';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { UI_OFFERS_LIMIT } from '@/lib/config';
import {
  extractList,
  TOOL_STATUS_LABELS,
  type HotelOffer,
  type TransportOffer,
  type TutuToolPayload,
} from '@/lib/tutu-types';
import { HotelCard } from '@/components/cards/hotel-card';
import { TransportCard } from '@/components/cards/transport-card';
import { Button } from '@/components/ui/button';

export type ToolPart = {
  type: string;
  toolCallId: string;
  state: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

/** Строка статуса: «Ищу поезда…», «Сверяюсь с правилами…». */
function StatusLine({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {done ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <Loader2 className="size-3.5 animate-spin" />
      )}
      <span>{done ? label : `${label}…`}</span>
    </div>
  );
}

export function ToolInvocation({ part }: { part: ToolPart }) {
  const [expanded, setExpanded] = useState(false);

  const toolName = part.toolName ?? part.type.replace(/^tool-/, '');
  const label = TOOL_STATUS_LABELS[toolName] ?? 'Обращаюсь к Туту';

  // Поиск ещё идёт — показываем, чем занят агент, чтобы экран не выглядел зависшим.
  if (part.state !== 'output-available' && part.state !== 'output-error') {
    return <StatusLine label={label} done={false} />;
  }

  const payload = part.output as TutuToolPayload | undefined;
  const failed = part.state === 'output-error' || Boolean(payload?.error);

  // Ошибку показываем спокойной плашкой: демо не должно выглядеть падающим.
  if (failed) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
        <TriangleAlert className="size-4 shrink-0" />
        <span>Не удалось получить данные Туту. Попробуйте повторить запрос.</span>
      </div>
    );
  }

  const { kind, items } = extractList(payload);

  // Плейбуки и служебные вызовы: список рисовать нечего, отмечаем факт вызова.
  if (kind === 'none' || items.length === 0) {
    return <StatusLine label={label} done />;
  }

  const visible = expanded ? items : items.slice(0, UI_OFFERS_LIMIT);
  const hidden = items.length - visible.length;

  return (
    <div className="flex flex-col gap-3">
      <StatusLine label={`${label}: нашлось ${items.length}`} done />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item, index) =>
          kind === 'transport' ? (
            <TransportCard
              key={(item as TransportOffer).offer_id ?? index}
              offer={item as TransportOffer}
            />
          ) : (
            <HotelCard key={(item as HotelOffer).hotel_id ?? index} hotel={item as HotelOffer} />
          ),
        )}
      </div>

      {hidden > 0 ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setExpanded(true)}>
          Показать ещё {hidden}
        </Button>
      ) : null}
    </div>
  );
}
