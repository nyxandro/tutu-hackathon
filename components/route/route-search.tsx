/**
 * Экран поиска по макету: тёмная шапка с формой, состояния пустого экрана,
 * прогресса, результатов, «уехать нельзя» и ошибки.
 *
 * Экспорты:
 * - RouteSearch — весь экран продукта
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { RouteChain, RouteSearchResult } from '@/modules/routing/builder';
import { ROUTE_EXAMPLES, SEARCH_STAGE_MS } from '@/lib/config';
import { COLORS, formatRub } from '@/lib/design';
import { formatTime, pluralize } from '@/lib/format';
import { ChainCard } from '@/components/route/chain-card';
import { HotelList } from '@/components/route/hotel-list';
import { SearchForm } from '@/components/route/search-form';

type View = 'empty' | 'loading' | 'results' | 'none' | 'error';
type Sort = 'arrival' | 'price';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function stageLabels(hub?: string): string[] {
  return [
    'Проверяем прямые рейсы',
    'Прямых нет. Ищем, через какие города можно проехать',
    hub ? `Проверяем расписание: ${hub}` : 'Проверяем расписание соседних городов',
    'Сводим стыковки по времени',
  ];
}

export function RouteSearch() {
  const [from, setFrom] = useState('Москва');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(() =>
    new Date(Date.now() + MS_IN_DAY).toISOString().slice(0, 10),
  );

  const [view, setView] = useState<View>('empty');
  const [stage, setStage] = useState(0);
  const [sort, setSort] = useState<Sort>('arrival');
  const [result, setResult] = useState<RouteSearchResult | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function search(query: { from: string; to: string; date: string }) {
    if (!query.from.trim() || !query.to.trim()) return;

    // Этапы двигаются по времени: поиск идёт секунды, и пользователь должен
    // видеть, что именно происходит, а не крутящийся кружок.
    timers.current.forEach(clearTimeout);
    setView('loading');
    setStage(0);
    setResult(null);
    timers.current = SEARCH_STAGE_MS.map((ms, index) =>
      setTimeout(() => setStage(index + 1), ms),
    );

    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: query.from, destination: query.to, date: query.date }),
      });
      const data = await response.json();
      timers.current.forEach(clearTimeout);

      if (!response.ok) {
        setView('error');
        return;
      }

      const found = data as RouteSearchResult;
      setResult(found);
      setView(found.direct.length + found.transfers.length > 0 ? 'results' : 'none');
    } catch {
      timers.current.forEach(clearTimeout);
      setView('error');
    }
  }

  const chains: RouteChain[] = result ? [...result.direct, ...result.transfers] : [];
  const sorted = [...chains].sort((a, b) =>
    sort === 'price' ? a.totalPrice - b.totalPrice : a.arrivalAt.localeCompare(b.arrivalAt),
  );
  const earliest = [...chains].sort((a, b) => a.arrivalAt.localeCompare(b.arrivalAt))[0];
  const cheapest = [...chains].sort((a, b) => a.totalPrice - b.totalPrice)[0];
  const noDirect = result ? result.direct.length === 0 : false;
  const total = chains.length;

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.inkSoft }}>
      <SearchForm
        from={from}
        to={to}
        date={date}
        showExamples={view === 'empty'}
        onFrom={setFrom}
        onTo={setTo}
        onDate={setDate}
        onSearch={() => search({ from, to, date })}
        onExample={(example) => {
          setFrom(example.origin);
          setTo(example.destination);
          void search({ from: example.origin, to: example.destination, date });
        }}
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 80px' }}>
        {view === 'empty' ? <HowItWorks /> : null}

        {view === 'loading' ? <Stages stage={stage} hub={result?.triedHubs[0]} /> : null}

        {view === 'results' && result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                background: COLORS.accentSoft,
                borderRadius: 20,
                padding: '26px 30px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  lineHeight: 1.12,
                  letterSpacing: '-.025em',
                  color: COLORS.ink,
                }}
              >
                {noDirect
                  ? `Прямого рейса ${result.query.origin} → ${result.query.destination} нет`
                  : `Нашли ${total} ${pluralize(total, 'способ', 'способа', 'способов')} добраться`}
              </div>
              <div style={{ fontSize: 16, color: COLORS.inkSoft, lineHeight: 1.45 }}>
                {noDirect
                  ? `Но доехать можно — собрали ${result.transfers.length} ${pluralize(result.transfers.length, 'вариант', 'варианта', 'вариантов')} с пересадкой. Самый быстрый: на месте в ${earliest ? formatTime(earliest.arrivalAt) : ''}.`
                  : `Быстрее всего — на месте в ${earliest ? formatTime(earliest.arrivalAt) : ''}, дешевле всего — ${cheapest ? formatRub(cheapest.totalPrice) : ''}.`}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: 15, color: COLORS.muted }}>
                {total} {pluralize(total, 'вариант', 'варианта', 'вариантов')}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 4,
                  gap: 4,
                  background: COLORS.surface,
                  borderRadius: 12,
                }}
              >
                <SortButton active={sort === 'arrival'} onClick={() => setSort('arrival')}>
                  Раньше приеду
                </SortButton>
                <SortButton active={sort === 'price'} onClick={() => setSort('price')}>
                  Дешевле
                </SortButton>
              </div>
            </div>

            {sorted.map((chain, index) => (
              <ChainCard key={`${chain.hub ?? 'direct'}-${chain.departureAt}-${index}`} chain={chain} />
            ))}

            <Notes notes={result.notes} />
          </div>
        ) : null}

        {view === 'none' && result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                background: COLORS.surface,
                borderRadius: 20,
                boxShadow: '0 4px 18px rgba(21,12,86,.06)',
                padding: '30px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: '-.02em',
                    color: COLORS.ink,
                  }}
                >
                  Уехать в этот день не получится
                </div>
                <div style={{ fontSize: 16, color: COLORS.inkSoft, lineHeight: 1.45 }}>
                  Ни прямых рейсов, ни стыковок через соседние города на эту дату не нашлось.
                </div>
              </div>
              <button
                onClick={() => {
                  const next = new Date(new Date(date).getTime() + MS_IN_DAY)
                    .toISOString()
                    .slice(0, 10);
                  setDate(next);
                  void search({ from, to, date: next });
                }}
                style={{
                  height: 52,
                  padding: '0 26px',
                  border: 'none',
                  borderRadius: 12,
                  background: COLORS.accent,
                  color: '#FFFFFF',
                  fontFamily: 'inherit',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: 'fit-content',
                }}
              >
                Посмотреть следующий день
              </button>
            </div>

            {result.stay ? <HotelList stay={result.stay} /> : null}
            <Notes notes={result.notes} />
          </div>
        ) : null}

        {view === 'error' ? (
          <div
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              padding: '22px 24px',
              background: COLORS.errorBg,
              borderRadius: 20,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: COLORS.error,
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              !
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 16, color: COLORS.errorInk, lineHeight: 1.45 }}>
                Не удалось получить данные Туту. Попробуйте повторить запрос через минуту.
              </div>
              <button
                onClick={() => search({ from, to, date })}
                style={{
                  height: 48,
                  padding: '0 22px',
                  border: 'none',
                  borderRadius: 12,
                  background: COLORS.error,
                  color: '#FFFFFF',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: 'fit-content',
                }}
              >
                Повторить
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 18px',
        border: 'none',
        borderRadius: 9,
        background: active ? COLORS.accentSoft : COLORS.surface,
        color: active ? COLORS.ink : COLORS.muted,
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function HowItWorks() {
  const steps = [
    'Проверяем прямые рейсы: поезда, автобусы, самолёты, электрички.',
    'Если прямых нет — подбираем соседние города, через которые можно проехать.',
    'Сводим стыковки по времени и показываем, во сколько вы будете на месте.',
  ];

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
        {steps.map((text, index) => (
          <div key={text} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.accentLight }}>
              0{index + 1}
            </span>
            <span style={{ fontSize: 16, color: COLORS.inkSoft, lineHeight: 1.45 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stages({ stage, hub }: { stage: number; hub?: string }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: 20,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        padding: '28px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {stageLabels(hub).map((text, index) => {
        const done = index < stage;
        const current = index === stage;

        return (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {done ? (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: COLORS.accentSoft,
                  color: COLORS.accent,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flex: 'none',
                }}
              >
                ✓
              </span>
            ) : current ? (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: `2px solid ${COLORS.accent}`,
                  borderTopColor: 'transparent',
                  flex: 'none',
                  animation: 'route-spin 1s linear infinite',
                }}
              />
            ) : (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: `2px solid ${COLORS.line}`,
                  flex: 'none',
                }}
              />
            )}
            <span
              style={{
                fontSize: 16,
                color: done ? COLORS.mutedSoft : current ? COLORS.ink : COLORS.faint,
                fontWeight: current ? 600 : 400,
              }}
            >
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Notes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 4px 0' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: COLORS.mutedSoft,
        }}
      >
        Что проверили
      </div>
      {notes.map((note) => (
        <div key={note} style={{ fontSize: 13, color: COLORS.mutedSoft, lineHeight: 1.5 }}>
          {note}
        </div>
      ))}
    </div>
  );
}

export { ROUTE_EXAMPLES };
