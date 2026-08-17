/**
 * Главная страница: новый диалог. Идентификатор сессии выдаётся сервером,
 * чтобы диалог можно было сохранить и потом открыть по адресу /c/<id>.
 */

import { randomUUID } from 'node:crypto';
import { Chat } from '@/components/chat/chat';

// Сессия должна быть новой на каждый заход, поэтому страница не кэшируется.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <Chat sessionId={randomUUID()} initialMessages={[]} />;
}
