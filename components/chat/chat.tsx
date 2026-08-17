/**
 * Экран диалога с агентом: ввод, лента сообщений, карточки результатов.
 *
 * Экспорты:
 * - Chat — клиентский компонент чата
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { ArrowUp, Compass, Square, TriangleAlert } from 'lucide-react';
import { CHAT_SUGGESTIONS } from '@/lib/config';
import { ToolInvocation, type ToolPart } from '@/components/chat/tool-invocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Chat({
  sessionId,
  initialMessages,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/chat', body: { sessionId } }),
  });

  const busy = status === 'submitted' || status === 'streaming';

  // Лента должна сама уезжать вниз, иначе на демо приходится скроллить руками.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput('');
    sendMessage({ text: value });
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-5xl flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Compass className="size-5 text-primary" />
        <div>
          <h1 className="text-sm leading-tight font-semibold">Помощник путешественника</h1>
          <p className="text-xs text-muted-foreground">на живых данных Туту</p>
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-6 pt-16 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Куда едем?</h2>
              <p className="text-sm text-muted-foreground">
                Опишите поездку словами — подберу билеты и отели.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {CHAT_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => submit(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            {message.parts.map((part, index) => {
              // Реплика пользователя — компактный пузырь справа.
              if (part.type === 'text' && message.role === 'user') {
                return (
                  <div key={index} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                      {part.text}
                    </div>
                  </div>
                );
              }

              if (part.type === 'text') {
                return (
                  <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
                    {part.text}
                  </p>
                );
              }

              // Всё, что начинается с tool-, — вызов инструмента MCP Туту.
              if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
                return <ToolInvocation key={index} part={part as unknown as ToolPart} />;
              }

              return null;
            })}
          </div>
        ))}

        {status === 'submitted' ? (
          <p className="text-sm text-muted-foreground">Думаю…</p>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="size-4 shrink-0" />
            <span>Не удалось получить ответ. Проверьте подключение и попробуйте ещё раз.</span>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Например: поезд в Питер в пятницу вечером"
          className="h-11"
        />
        {busy ? (
          <Button type="button" variant="secondary" size="icon" className="size-11" onClick={stop}>
            <Square className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" className="size-11" disabled={!input.trim()}>
            <ArrowUp className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
