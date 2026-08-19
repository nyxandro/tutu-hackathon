/**
 * Экран поиска: форма, лента работы агента и найденные маршруты.
 *
 * Поиск идёт через агента: модель сама решает, какие города и даты проверять,
 * а стыковки считает код. Если агент недоступен, хук молча уходит на
 * детерминированный поиск — экран обязан показать результат в любом случае.
 *
 * Экспорты:
 * - RouteSearch — весь экран продукта
 */

'use client';

import { useState } from 'react';
import { COLORS, formatRub } from '@/frontend/design';
import { formatTime, pluralize } from '@/frontend/format';
import { useAgentSearch, type SearchQuery } from '@/frontend/hooks/use-agent-search';
import { AgentTrace } from '@/frontend/components/route/agent-trace';
import { ChainCard } from '@/frontend/components/route/chain-card';
import { HotelList } from '@/frontend/components/route/hotel-list';
import { HowItWorks } from '@/frontend/components/route/how-it-works';
import { SearchForm } from '@/frontend/components/route/search-form';

type Sort = 'departure' | 'arrival' | 'price';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const STAY_ANCHOR = 'stay-options';

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function humanDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function RouteSearch() {
  const [from, setFrom] = useState('Москва');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(() =>
    new Date(Date.now() + MS_IN_DAY).toISOString().slice(0, 10),
  );
  // По умолчанию — раньше уехать: человеку, который не может выбраться, важнее
  // всего не ждать, а не выиграть час в дороге.
  const [sort, setSort] = useState<Sort>('departure');

  const { steps, chains, stay, summary, status, search } = useAgentSearch();

  function run(query: SearchQuery) {
    if (!query.origin.trim() || !query.destination.trim()) return;
    void search(query);
  }

  const sorted = [...chains].sort((a, b) => {
    if (sort === 'price') return a.totalPrice - b.totalPrice;
    if (sort === 'arrival') return a.arrivalAt.localeCompare(b.arrivalAt);
    return a.departureAt.localeCompare(b.departureAt);
  });
  const earliestDeparture = [...chains].sort((a, b) =>
    a.departureAt.localeCompare(b.departureAt),
  )[0];
  const cheapest = [...chains].sort((a, b) => a.totalPrice - b.totalPrice)[0];
  const transfers = chains.filter((chain) => chain.kind === 'transfer');
  const hubs = [...new Set(transfers.map((chain) => chain.hub).filter(Boolean))];

  // Агент мог найти маршрут на другой день: в запрошенный не сходилось
  // расписание. Об этом надо сказать прямо, иначе человек решит, что уезжает
  // сегодня, и опоздает на сутки.
  const foundDates = [...new Set(chains.map((chain) => chain.departureAt.slice(0, 10)))];
  const otherDay = foundDates.length > 0 && !foundDates.includes(date);

  const idle = status === 'idle';
  const running = status === 'running';
  const nothing = status === 'done' && chains.length === 0;

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.inkSoft }}>
      <SearchForm
        from={from}
        to={to}
        date={date}
        showExamples={idle}
        onFrom={setFrom}
        onTo={setTo}
        onDate={setDate}
        onSearch={() => run({ origin: from, destination: to, date })}
        onExample={(example) => {
          setFrom(example.origin);
          setTo(example.destination);
          run({ origin: example.origin, destination: example.destination, date });
        }}
      />

      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '28px 24px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {idle ? <HowItWorks /> : null}

        <AgentTrace key={steps[0]?.id ?? 'idle'} steps={steps} done={!running} />

        {chains.length > 0 ? (
          <>
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
                {otherDay
                  ? `${date === foundDates[0] ? '' : 'В этот день уехать нельзя — '}нашли маршрут на ${humanDay(foundDates[0])}`
                  : transfers.length === chains.length
                    ? `Прямого рейса ${from} → ${to} нет`
                    : `Нашли ${chains.length} ${pluralize(chains.length, 'способ', 'способа', 'способов')} добраться`}
              </div>
              <div style={{ fontSize: 16, color: COLORS.inkSoft, lineHeight: 1.45 }}>
                {[
                  otherDay
                    ? `В ${humanDay(date)} уехать не получается.`
                    : `Прямых рейсов нет, но добраться можно.`,
                  `Собрали ${chains.length} ${pluralize(chains.length, 'вариант', 'варианта', 'вариантов')}${hubs.length ? ` через ${hubs.join(' или ')}` : ''}.`,
                  earliestDeparture
                    ? `Раньше всего выезд в ${formatTime(earliestDeparture.departureAt)}, на месте в ${formatTime(earliestDeparture.arrivalAt)}.`
                    : '',
                  cheapest ? `Дешевле всего — ${formatRub(cheapest.totalPrice)}.` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              </div>

              {/* Уехать удалось только в другой день — значит ночевать
                  придётся здесь. Ведём к гостиницам сразу, не заставляя
                  человека искать блок самому. */}
              {otherDay && stay && stay.hotels.length > 0 ? (
                <button
                  onClick={() => {
                    document
                      .getElementById(STAY_ANCHOR)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: 6,
                    height: 46,
                    padding: '0 22px',
                    border: 'none',
                    borderRadius: 12,
                    background: COLORS.accent,
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Посмотреть, где переночевать
                </button>
              ) : null}
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
                {chains.length} {pluralize(chains.length, 'вариант', 'варианта', 'вариантов')}
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
                <SortButton active={sort === 'departure'} onClick={() => setSort('departure')}>
                  Раньше уеду
                </SortButton>
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

            {stay ? <HotelList stay={stay} anchorId={STAY_ANCHOR} /> : null}
          </>
        ) : null}

        {nothing ? (
          <div
            style={{
              background: COLORS.surface,
              borderRadius: 20,
              boxShadow: '0 4px 18px rgba(21,12,86,.06)',
              padding: '30px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: COLORS.ink }}>
              Уехать в этот день не получится
            </div>
            <div style={{ fontSize: 16, color: COLORS.inkSoft, lineHeight: 1.45 }}>
              {summary || 'Ни прямых рейсов, ни стыковок через соседние города на эту дату не нашлось.'}
            </div>
            <button
              onClick={() => {
                const next = new Date(new Date(date).getTime() + MS_IN_DAY).toISOString().slice(0, 10);
                setDate(next);
                run({ origin: from, destination: to, date: next });
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

            {stay ? <HotelList stay={stay} anchorId={STAY_ANCHOR} /> : null}
          </div>
        ) : null}

        {status === 'error' ? (
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
                onClick={() => run({ origin: from, destination: to, date })}
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
