/**
 * Подвал сайта: единственная ссылка на страницу помощи.
 *
 * Экспорты:
 * - SiteFooter — строка со ссылкой, прижата к низу окна на коротких страницах
 */

import Link from 'next/link';
import { COLORS } from '@/frontend/design';

export function SiteFooter() {
  return (
    <footer
      style={{
        padding: '28px 24px 32px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Link
        href="/help"
        style={{
          fontSize: 14,
          color: COLORS.muted,
          textDecoration: 'none',
          borderBottom: `1px solid ${COLORS.line}`,
          paddingBottom: 1,
        }}
      >
        Помощь
      </Link>
    </footer>
  );
}
