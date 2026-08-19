/**
 * Страница помощи: зачем сервис нужен и как им пользоваться. Примеры собраны
 * из настоящих элементов интерфейса, а не из картинок — так они не устареют
 * при следующей правке вёрстки.
 *
 * Экспорты:
 * - HelpPage — страница целиком
 * - Section — заголовок и содержимое одного раздела
 * - Shot — «скриншот»: кусок интерфейса на подложке экрана
 */

import Link from 'next/link';
import { COLORS } from '@/frontend/design';
import { HELP_HOTEL_PHOTO } from '@/frontend/config';

const PAGE_WIDTH = 900;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-.02em',
          color: COLORS.ink,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 17, lineHeight: 1.55, color: COLORS.inkSoft, margin: 0 }}>{children}</p>
  );
}

/** Подложка под пример: намекает, что внутри — кусок настоящего экрана. */
function Shot({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 18,
        background: dark ? COLORS.headerBg : COLORS.surfaceAlt,
        border: `1px solid ${dark ? 'transparent' : COLORS.line}`,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

/** Строка поиска в том же виде, что на главной, но без обработчиков. */
function SearchShot() {
  const field = (label: string, value: string) => (
    <div
      key={label}
      style={{
        flex: '1 1 0',
        minWidth: 120,
        padding: '13px 18px',
        borderRight: `1px solid ${COLORS.line}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>{label}</span>
      <span style={{ fontSize: 17, fontWeight: 500, color: COLORS.ink }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        background: COLORS.surface,
        borderRadius: 14,
        boxShadow: '0 8px 30px rgba(21,12,86,.24)',
        flexWrap: 'wrap',
      }}
    >
      {field('Откуда', 'Москва')}
      {field('Куда', 'Углич')}
      {field('Когда', 'Сегодня')}
      <div
        style={{
          flex: '0 0 130px',
          padding: '13px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span style={{ fontSize: 12, color: COLORS.mutedSoft }}>Сколько вас</span>
        <span style={{ fontSize: 17, fontWeight: 600, color: COLORS.ink }}>1</span>
      </div>
      <div
        style={{
          flex: '0 0 150px',
          minHeight: 72,
          borderRadius: '0 14px 14px 0',
          background: COLORS.accent,
          color: '#FFFFFF',
          fontSize: 17,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Подобрать
      </div>
    </div>
  );
}

/** Карточка маршрута: те же цифры, что выдаёт поиск Москва → Углич. */
function RouteShot() {
  const leg = (
    transport: string,
    time: string,
    from: string,
    to: string,
    date: string,
    number: number,
  ) => (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span
        style={{
          width: 22,
          height: 22,
          flex: 'none',
          borderRadius: 999,
          background: COLORS.accentSoft,
          color: COLORS.accent,
          fontSize: 12,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {number}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 16, color: COLORS.ink }}>
          {time} · {from} → {to}
        </span>
        <span style={{ fontSize: 14, color: COLORS.muted }}>
          {transport}, {date}
        </span>
      </div>
    </div>
  );

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
          padding: '20px 24px',
          borderBottom: `1px solid ${COLORS.line}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink }}>
            22:30 → 08:40, в пути 10 ч 10 м
          </span>
          <span style={{ fontSize: 14, color: COLORS.muted }}>
            Пересадка в Ярославле, ждать 3 ч 5 м
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: COLORS.ink }}>1 881 ₽</span>
          <span style={{ fontSize: 13, color: COLORS.mutedSoft }}>за два билета</span>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {leg('Автобус', '22:30 → 02:50', 'Москва', 'Ярославль', 'сегодня', 1)}
        {leg('Автобус', '05:55 → 08:40', 'Ярославль', 'Углич', 'завтра', 2)}
      </div>
    </div>
  );
}

/** Карточка гостиницы с настоящей фотографией из ответа Туту. */
function HotelShot() {
  return (
    <div
      style={{
        maxWidth: 320,
        background: COLORS.surface,
        borderRadius: 18,
        boxShadow: '0 4px 18px rgba(21,12,86,.06)',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
        {/* Обычный img, а не next/image: на этой странице оптимизация не нужна,
            снимок статичный и грузится один раз. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HELP_HOTEL_PHOTO}
          alt="Фотография гостиницы из ответа Туту"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.ink }}>
          Гостиница у вокзала
        </span>
        <span style={{ fontSize: 14, color: COLORS.muted }}>1,2 км от вас · 1 ночь</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink }}>3 400 ₽</span>
      </div>
    </div>
  );
}

export function HelpPage() {
  return (
    <div style={{ background: COLORS.bg, minHeight: '100%' }}>
      {/* Шапка повторяет главную, чтобы страница не выглядела чужой */}
      <div
        style={{
          background: COLORS.headerBg,
          backgroundImage: `linear-gradient(180deg, rgba(21,12,86,.58) 0%, rgba(21,12,86,.78) 100%), url('/bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          padding: '28px 24px 34px',
        }}
      >
        <div
          style={{
            maxWidth: PAGE_WIDTH,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, textDecoration: 'none' }}
          >
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em', color: '#FFFFFF' }}>
              как
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-.03em',
                color: COLORS.accentLight,
              }}
            >
              добраться
            </span>
          </Link>
          <Link href="/" style={{ fontSize: 15, color: COLORS.chipText, textDecoration: 'none' }}>
            ← К поиску
          </Link>
        </div>
      </div>

      <div
        style={{
          maxWidth: PAGE_WIDTH,
          margin: '0 auto',
          padding: '40px 24px 56px',
          display: 'flex',
          flexDirection: 'column',
          gap: 44,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-.03em',
              color: COLORS.ink,
              margin: 0,
            }}
          >
            Когда прямого билета нет
          </h1>
          <Paragraph>
            Билет отменили, рейс отложили или на нужную дату вообще ничего не продаётся — а уехать
            надо. Обычный поиск в такой ситуации показывает пустую страницу: прямой связи между
            вашими городами нет, и разговор окончен. Мы отвечаем на другой вопрос — не «есть ли
            билет», а «как добраться ближайшим возможным способом».
          </Paragraph>
        </div>

        <Section title="Что мы делаем">
          <Paragraph>
            Проверяем прямые рейсы всеми видами транспорта сразу: поезда, автобусы, самолёты и
            электрички. Если прямых нет, подбираем города, через которые можно проехать, и
            составляем поездку из двух билетов — например, поездом до крупного города, дальше
            автобусом. Оба билета настоящие и продаются прямо сейчас.
          </Paragraph>
          <Paragraph>
            Стыковки считаем по времени: учитываем, сколько нужно на пересадку между конкретными
            видами транспорта, и показываем только те варианты, на которые вы успеваете. Если
            сегодня уехать нельзя, ищем ближайший день, когда получится.
          </Paragraph>
        </Section>

        <Section title="Как искать">
          <Paragraph>
            Укажите города и дату, при необходимости — сколько вас едет. Города выбираются из
            списка: начните печатать, и подсказка появится даже с опечаткой. Кнопка с прицелом
            рядом с полем «Откуда» определит ваш город по геопозиции.
          </Paragraph>
          <Shot dark>
            <SearchShot />
          </Shot>
          <Paragraph>
            Ниже строки поиска — виды транспорта: по умолчанию включены все, выключите ненужное.
            Там же условия «Не подходит ночная поездка» и «Без тесных пересадок» — они убирают из
            выдачи неудобные варианты.
          </Paragraph>
        </Section>

        <Section title="Что вы получите">
          <Paragraph>
            Каждый вариант — это готовая поездка целиком: во сколько выезжаете, где и сколько
            ждёте, во сколько будете на месте и сколько стоят все билеты вместе. Варианты можно
            отсортировать по времени выезда, времени прибытия или цене.
          </Paragraph>
          <Shot>
            <RouteShot />
          </Shot>
        </Section>

        <Section title="Если уехать удастся только завтра">
          <Paragraph>
            Тогда вместе с билетами мы покажем, где переночевать в городе отправления: гостиницы
            рядом, с ценой за нужное число ночей, адресом и расстоянием от вас, если вы разрешили
            определить местоположение. Значок с лапой означает, что пускают с животными.
          </Paragraph>
          <Shot>
            <HotelShot />
          </Shot>
        </Section>

        <Section title="Откуда данные">
          <Paragraph>
            Все рейсы, цены и гостиницы приходят из сервисов Туту в момент вашего запроса. Мы
            ничего не выдумываем и ничего не досочиняем: если вариант показан, его можно купить.
            Покупка происходит на стороне Туту — мы доводим вас до оплаты.
          </Paragraph>
        </Section>

        <Link
          href="/"
          style={{
            alignSelf: 'flex-start',
            padding: '14px 24px',
            borderRadius: 12,
            background: COLORS.accent,
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Найти маршрут
        </Link>
      </div>
    </div>
  );
}
