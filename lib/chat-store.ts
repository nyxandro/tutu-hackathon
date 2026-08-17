/**
 * Персист диалогов в Postgres. Нужен, чтобы демо переживало перезагрузку
 * страницы и показанный судьям сценарий не приходилось набирать заново.
 *
 * Экспорты:
 * - saveChat() — сохраняет диалог целиком (сессия + сообщения)
 * - loadChat() — читает сообщения сессии
 * - listChats() — список последних диалогов для боковой панели
 */

import type { UIMessage } from 'ai';
import { prisma } from '@/lib/db';
import { CHAT_LIST_LIMIT, CHAT_TITLE_MAX_CHARS } from '@/lib/config';

/** Заголовок диалога — первые слова первого вопроса пользователя. */
function buildTitle(messages: UIMessage[]): string | undefined {
  const firstUser = messages.find((message) => message.role === 'user');
  const text = firstUser?.parts
    ?.filter((part) => part.type === 'text')
    .map((part) => (part as { text: string }).text)
    .join(' ')
    .trim();

  if (!text) return undefined;
  return text.length > CHAT_TITLE_MAX_CHARS ? `${text.slice(0, CHAT_TITLE_MAX_CHARS)}…` : text;
}

/**
 * Сохраняет диалог целиком. Сообщения перезаписываются, а не дописываются:
 * стрим отдаёт финальное состояние, и полная замена исключает расхождение
 * между тем, что на экране, и тем, что в базе.
 */
export async function saveChat(sessionId: string, messages: UIMessage[]): Promise<void> {
  const title = buildTitle(messages);

  await prisma.$transaction([
    prisma.chatSession.upsert({
      where: { id: sessionId },
      create: { id: sessionId, ...(title ? { title } : {}) },
      update: { ...(title ? { title } : {}) },
    }),
    prisma.message.deleteMany({ where: { sessionId } }),
    prisma.message.createMany({
      data: messages.map((message) => ({
        id: message.id,
        sessionId,
        role: message.role,
        parts: message.parts as object,
      })),
    }),
  ]);
}

export async function loadChat(sessionId: string): Promise<UIMessage[]> {
  const rows = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((row) => ({
    id: row.id,
    role: row.role as UIMessage['role'],
    parts: row.parts as UIMessage['parts'],
  }));
}

export async function listChats() {
  return prisma.chatSession.findMany({
    orderBy: { updatedAt: 'desc' },
    take: CHAT_LIST_LIMIT,
    select: { id: true, title: true, updatedAt: true },
  });
}
