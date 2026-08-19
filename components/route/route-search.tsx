/**
 * Экран поиска маршрута. Главная мысль интерфейса: когда прямого рейса нет,
 * пользователь видит не пустую выдачу, а собранный маршрут с пересадкой.
 *
 * Экспорты:
 * - RouteSearch — форма запроса и результаты
 */

'use client';

import { useState } from 'react';
import { Loader2, Route as RouteIcon, SearchX, TriangleAlert } from 'lucide-react';
import type { RouteSearchResult } from '@/lib/route-builder';
import { ROUTE_EXAMPLES } from '@/lib/config';
import { pluralize as plural } from '@/lib/format';
import { ChainCard } from '@/components/route/chain-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Query = { origin: string; destination: string; date: string };

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export function RouteSearch() {
  // Дата считается лениво на клиенте: серверный компонент обязан быть чистым,
  // а поездка «прямо сейчас» чаще всего планируется на завтра.
  const [query, setQuery] = useState<Query>(() => ({
    origin: '',
    destination: '',
    date: new Date(Date.now() + MS_IN_DAY).toISOString().slice(0, 10),
  }));
  const [result, setResult] = useState<RouteSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(next: Query) {
    setQuery(next);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? 'Не удалось выполнить поиск.');
        return;
      }
      setResult(data as RouteSearchResult);
    } catch {
      // Сеть могла отвалиться на стороне клиента — показываем спокойный текст.
      setError('Нет связи с сервисом. Проверьте подключение и попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  const nothingFound =
    result && result.direct.length === 0 && result.transfers.length === 0;

  // В баннере называем города пересадки, а не регион: «через Ярославль» звучит
  // как ответ, «через Ярославская область» — как ошибка.
  const hubList = result
    ? [...new Set(result.transfers.map((chain) => chain.hub).filter(Boolean))].join(' или ')
    : '';

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <RouteIcon className="size-6 text-primary" />
        <div>
          <h1 className="text-lg leading-tight font-semibold">Туда, куда не ищется</h1>
          <p className="text-sm text-muted-foreground">
            Собираем поездку через пересадку, когда прямого билета нет
          </p>
        </div>
      </header>

      <form
        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          search(query);
        }}
      >
        <Input
          value={query.origin}
          onChange={(e) => setQuery({ ...query, origin: e.target.value })}
          placeholder="Откуда"
          className="h-11"
        />
        <Input
          value={query.destination}
          onChange={(e) => setQuery({ ...query, destination: e.target.value })}
          placeholder="Куда"
          className="h-11"
        />
        <Input
          type="date"
          value={query.date}
          onChange={(e) => setQuery({ ...query, date: e.target.value })}
          className="h-11"
        />
        <Button type="submit" className="h-11" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Найти'}
        </Button>
      </form>

      {!result && !loading && !error ? (
        <div className="flex flex-wrap gap-2">
          <span className="w-full text-xs text-muted-foreground">Попробуйте:</span>
          {ROUTE_EXAMPLES.map((example) => (
            <Button
              key={`${example.origin}-${example.destination}`}
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => search({ ...example, date: query.date })}
            >
              {example.origin} → {example.destination}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          Проверяем прямые рейсы, а если их нет — подбираем пересадку…
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-6">
          {/* Ключевой кадр: прямых нет, но поездка всё равно собирается */}
          {result.direct.length === 0 && result.transfers.length > 0 ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium">
                Прямого рейса {result.query.origin} → {result.query.destination} нет
              </p>
              <p className="text-sm text-muted-foreground">
                Но доехать можно — собрали {result.transfers.length}{' '}
                {plural(result.transfers.length, 'вариант', 'варианта', 'вариантов')} с
                пересадкой{hubList ? ` через ${hubList}` : ''}.
              </p>
            </div>
          ) : null}

          {result.direct.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Прямые рейсы</h2>
              {result.direct.slice(0, 6).map((chain, index) => (
                <ChainCard key={`direct-${index}`} chain={chain} />
              ))}
            </section>
          ) : null}

          {result.transfers.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                С пересадкой — таких вариантов нет в обычном поиске
              </h2>
              {result.transfers.map((chain, index) => (
                <ChainCard key={`transfer-${index}`} chain={chain} />
              ))}
            </section>
          ) : null}

          {nothingFound ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <SearchX className="size-8 text-muted-foreground" />
              <p className="font-medium">Уехать в этот день не получится</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Ни прямых рейсов, ни стыковок через соседние города на выбранную дату
                не нашлось. Попробуйте соседнюю дату.
              </p>
            </div>
          ) : null}

          {result.notes.length > 0 ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {result.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
