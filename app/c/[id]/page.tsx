/**
 * Сохранённый диалог. Открывается по адресу /c/<sessionId> — история
 * поднимается из Postgres вместе с карточками, потому что в parts лежат
 * и вызовы инструментов, и их полные ответы.
 */

import { notFound } from 'next/navigation';
import { loadChat } from '@/lib/chat-store';
import { Chat } from '@/components/chat/chat';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: PageProps<'/c/[id]'>) {
  const { id } = await params;
  const messages = await loadChat(id);

  if (messages.length === 0) {
    notFound();
  }

  return <Chat sessionId={id} initialMessages={messages} />;
}
