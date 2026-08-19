import type { Metadata } from 'next';
import { Onest } from 'next/font/google';
import '@/frontend/globals.css';
import { SiteFooter } from '@/frontend/components/site-footer';

const onest = Onest({
  variable: '--font-onest',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Туда, куда не ищется',
  description:
    'Собираем поездку через пересадку, когда прямого билета нет. На живых данных Туту.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning нужен из-за расширений браузера: LanguageTool и
    // подобные дописывают свои атрибуты в <html> до того, как React загрузится,
    // и без этого консоль на демо засоряется ошибкой гидратации.
    <html
      lang="ru"
      className={`${onest.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Иконки макета: Material Symbols подключаются шрифтом, как в дизайне */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..700,0..1,0&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* Подвал прижат к низу окна, пока страница короткая, и уезжает в поток,
          как только контент заполнил экран: main растягивается, footer — нет. */}
      <body className="flex min-h-full flex-col">
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
