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
import { NIGHT_FROM_HOUR, NIGHT_TO_HOUR, TRANSPORT_MODES } from '@/frontend/config';
import { COLORS, formatRub } from '@/frontend/design';
import { formatTime, pluralize } from '@/frontend/format';
import { useAgentSearch, type SearchQuery } from '@/frontend/hooks/use-agent-search';
import { useNearestCity } from '@/frontend/hooks/use-nearest-city';
import { AgentTrace } from '@/frontend/components/route/agent-trace';
import { ChainCard } from '@/frontend/components/route/chain-card';
import { HotelList } from '@/frontend/components/route/hotel-list';
import { HowItWorks } from '@/frontend/components/route/how-it-works';
import { isKnownCity } from '@/frontend/components/route/city-input';
import { SearchForm } from '@/frontend/components/route/search-form';
import { ScrollTop } from '@/frontend/components/route/scroll-top';
import { SortSwitch } from '@/frontend/components/route/sort-switch';

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
  // По умолчанию — сегодня: сценарий продукта в том, что уехать надо сейчас.
  // Дату собираем по местному календарю, а не через toISOString: UTC-сдвиг
  // вечером даёт завтрашний день.
  const [date, setDate] = useState(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  // Сколько взрослых едет: уходит прямо в Туту, поэтому цены в выдаче
  // приходят сразу за всю компанию.
  const [travelers, setTravelers] = useState(1);
  // По умолчанию — раньше уехать: человеку, который не может выбраться, важнее
  // всего не ждать, а не выиграть час в дороге.
  const [sort, setSort] = useState<Sort>('departure');
  const [constraints, setConstraints] = useState<Record<string, boolean>>({});
  // Пустой список — искать любым транспортом; параметр тогда вовсе не уходит.
  // Храним исключённые: по умолчанию ищем всеми видами, человек выключает
  // ненужные. В запрос уходят оставшиеся, а если выключенных нет — ничего.
  const [excluded, setExcluded] = useState<string[]>([]);

  const { steps, chains, stay, summary, status, applied, search } = useAgentSearch();
  const { detect, status: geoStatus, result: geoResult } = useNearestCity();

  function run(query: Omit<SearchQuery, 'modes'>) {
    // Вторая линия защиты: форма кнопку гасит, но запустить поиск можно ещё
    // и с клавиатуры или быстрым сценарием.
    if (!isKnownCity(query.origin) || !isKnownCity(query.destination)) return;
    const modes =
      excluded.length > 0
        ? TRANSPORT_MODES.map((mode) => mode.key).filter((key) => !excluded.includes(key))
        : undefined;
    // Повторный поиск по уже показанной выдаче идёт с её же параметрами:
    // число людей берётся из формы только для нового запроса.
    void search({ ...query, modes, travelers: query.travelers ?? travelers });
  }

  // Условия применяются к готовым маршрутам: данные о времени и стыковках
  // уже есть, лишний запрос к Туту для этого не нужен.
  const visible = chains.filter((chain) => {
    if (constraints.noTight && chain.tight) return false;
    if (constraints.noNight) {
      const departureHour = new Date(chain.departureAt).getHours();
      const arrivalHour = new Date(chain.arrivalAt).getHours();
      const atNight = (hour: number) => hour >= NIGHT_FROM_HOUR || hour < NIGHT_TO_HOUR;
      if (atNight(departureHour) || atNight(arrivalHour)) return false;
    }
    return true;
  });
  const hiddenByFilters = chains.length - visible.length;

  const sorted = [...visible].sort((a, b) => {
    if (sort === 'price') return a.totalPrice - b.totalPrice;
    if (sort === 'arrival') return a.arrivalAt.localeCompare(b.arrivalAt);
    return a.departureAt.localeCompare(b.departureAt);
  });
  const earliestDeparture = [...visible].sort((a, b) =>
    a.departureAt.localeCompare(b.departureAt),
  )[0];
  const cheapest = [...visible].sort((a, b) => a.totalPrice - b.totalPrice)[0];
  const transfers = visible.filter((chain) => chain.kind === 'transfer');
  const hubs = [...new Set(transfers.map((chain) => chain.hub).filter(Boolean))];

  // Агент мог найти маршрут на другой день: в запрошенный не сходилось
  // расписание. Об этом надо сказать прямо, иначе человек решит, что уезжает
  // сегодня, и опоздает на сутки.
  const foundDates = [...new Set(visible.map((chain) => chain.departureAt.slice(0, 10)))];
  const otherDay = foundDates.length > 0 && !foundDates.includes(date);

  const idle = status === 'idle';
  const running = status === 'running';
  const nothing = status === 'done' && chains.length === 0;

  return (
    // Высоту экрана держит макет: main растягивается, подвал идёт следом.
    // Собственный minHeight здесь уводил ссылку «Помощь» за нижний край, хотя
    // до конца экрана оставалось пустое место.
    <div style={{ background: COLORS.bg, color: COLORS.inkSoft }}>
      <SearchForm
        from={from}
        to={to}
        date={date}
        compact={!idle}
        onFrom={setFrom}
        onTo={setTo}
        onDate={setDate}
        travelers={travelers}
        onTravelers={setTravelers}
        constraints={constraints}
        onConstraint={(key) => setConstraints((prev) => ({ ...prev, [key]: !prev[key] }))}
        excluded={excluded}
        detecting={geoStatus === 'asking'}
        detected={geoStatus === 'done'}
        detectError={
          geoStatus === 'denied' || geoStatus === 'failed'
            ? (geoResult?.message ?? 'Не удалось определить город')
            : null
        }
        onDetect={async () => {
          const city = await detect();
          if (city) setFrom(city);
        }}
        onMode={(key) =>
          setExcluded((prev) =>
            prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
          )
        }
        onSearch={() => run({ origin: from, destination: to, date })}
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

        {visible.length > 0 ? (
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
                  : transfers.length === visible.length
                    ? `Как уехать: ${applied?.origin ?? from} → ${applied?.destination ?? to}`
                    : `Нашли ${visible.length} ${pluralize(visible.length, 'способ', 'способа', 'способов')} добраться`}
              </div>
              <div style={{ fontSize: 16, color: COLORS.inkSoft, lineHeight: 1.45 }}>
                {[
                  // Первая фраза зависит от того, что реально нашлось: писать
                  // «прямых нет», когда все варианты прямые, — прямая ложь.
                  otherDay
                    ? `В ${humanDay(date)} уехать не получается.`
                    : transfers.length === 0
                      ? 'Есть прямые рейсы.'
                      : transfers.length === visible.length
                        ? 'Уехать напрямую не выйдет, но добраться можно.'
                        : 'Прямых рейсов мало, поэтому собрали и варианты с пересадкой.',
                  transfers.length === visible.length && hubs.length
                    ? `Собрали ${visible.length} ${pluralize(visible.length, 'вариант', 'варианта', 'вариантов')} через ${hubs.join(' или ')}.`
                    : `Всего ${visible.length} ${pluralize(visible.length, 'вариант', 'варианта', 'вариантов')}${hubs.length ? `, из них с пересадкой через ${hubs.join(' или ')}` : ''}.`,
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
                {visible.length} {pluralize(visible.length, 'вариант', 'варианта', 'вариантов')}
                {hiddenByFilters > 0
                  ? ` · ${hiddenByFilters} ${pluralize(hiddenByFilters, 'скрыт', 'скрыто', 'скрыто')} условиями`
                  : ''}
              </div>
              <SortSwitch
                value={sort}
                onChange={setSort}
                options={[
                  { key: 'departure', label: 'Раньше уеду' },
                  { key: 'arrival', label: 'Раньше приеду' },
                  { key: 'price', label: 'Дешевле' },
                ]}
              />
            </div>

            {sorted.map((chain, index) => (
              <ChainCard travelers={applied?.travelers ?? 1} key={`${chain.hub ?? 'direct'}-${chain.departureAt}-${index}`} chain={chain} />
            ))}

            {stay ? <HotelList stay={stay} anchorId={STAY_ANCHOR} coords={geoResult?.coords} /> : null}
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
                run({
                  origin: applied?.origin ?? from,
                  destination: applied?.destination ?? to,
                  date: next,
                  travelers: applied?.travelers,
                });
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

            {stay ? <HotelList stay={stay} anchorId={STAY_ANCHOR} coords={geoResult?.coords} /> : null}
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
                onClick={() =>
                run({
                  origin: applied?.origin ?? from,
                  destination: applied?.destination ?? to,
                  date: applied?.date ?? date,
                  travelers: applied?.travelers,
                })
              }
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

      <ScrollTop />
    </div>
  );
}
