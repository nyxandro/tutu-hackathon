/**
 * Главная и единственная страница продукта: поиск способов добраться,
 * когда прямого билета нет.
 */

import { RouteSearch } from '@/frontend/components/route/route-search';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <RouteSearch />;
}
