/**
 * Страница помощи: зачем сервис нужен и как им пользоваться.
 */

import type { Metadata } from 'next';
import { HelpPage } from '@/frontend/components/help/help-page';

export const metadata: Metadata = {
  title: 'Помощь — Как добраться',
  description: 'Как пользоваться поиском поездок через пересадку, когда прямого билета нет.',
};

export default function Help() {
  return <HelpPage />;
}
