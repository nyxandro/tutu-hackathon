/**
 * Кнопка «наверх»: появляется, когда страницу отмотали далеко вниз, и плавно
 * возвращает к форме поиска.
 *
 * Экспорты:
 * - ScrollTop — плавающая кнопка в правом нижнем углу
 */

'use client';

import { useEffect, useState } from 'react';
import { COLORS } from '@/frontend/design';
import { SCROLL_TOP_AFTER_PX } from '@/frontend/config';

export function ScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_TOP_AFTER_PX);
    onScroll();
    // passive: слушатель ничего не отменяет, и браузер не ждёт его при прокрутке.
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Наверх"
      title="Наверх"
      // Кнопка не размонтируется, а гаснет: так у появления и ухода есть
      // анимация, а не мигание.
      style={{
        position: 'fixed',
        right: 28,
        bottom: 28,
        zIndex: 40,
        width: 48,
        height: 48,
        border: 'none',
        borderRadius: 14,
        background: COLORS.accent,
        color: '#FFFFFF',
        boxShadow: '0 10px 28px rgba(21,12,86,.28)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Material Symbols Rounded'",
        fontSize: 24,
        lineHeight: 1,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity .25s, transform .25s',
      }}
    >
      arrow_upward
    </button>
  );
}
