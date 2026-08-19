/**
 * Разведчик MCP Туту: показывает список инструментов и форму ответа.
 * Запуск: npm run mcp:probe [имя_инструмента]
 *
 * Нужен, чтобы проверять контракт на живом сервере, не поднимая приложение.
 */

import { createMCPClient } from '@ai-sdk/mcp';
import { MCP_CLIENT_NAME, MCP_SERVER_URL } from '../modules/tutu/config';

async function main() {
  const client = await createMCPClient({
    transport: { type: 'http', url: MCP_SERVER_URL },
    clientName: MCP_CLIENT_NAME,
  });

  const tools = await client.tools();
  console.log('Инструментов:', Object.keys(tools).length);
  console.log(Object.keys(tools).join(', '));

  const toolName = process.argv[2] ?? 'search_rail';
  const tool = tools[toolName];
  if (!tool?.execute) {
    console.log(`Инструмент ${toolName} не найден или не исполняем`);
    await client.close();
    return;
  }

  const args =
    toolName === 'search_rail'
      ? {
          origin: 'Москва',
          destination: 'Санкт-Петербург',
          departure_date: '2026-08-25',
          view: 'compact',
        }
      : {};

  console.log(`\n=== ${toolName}(${JSON.stringify(args)}) ===`);
  const raw = await tool.execute(args as never, {
    toolCallId: 'probe',
    messages: [],
  } as never);

  console.log('typeof:', typeof raw);
  console.log('верхние ключи:', raw && typeof raw === 'object' ? Object.keys(raw) : '—');
  const asText = JSON.stringify(raw);
  console.log('размер JSON:', asText.length, 'символов');
  console.log('первые 700 символов:\n', asText.slice(0, 700));

  await client.close();
}

main().catch((error) => {
  console.error('Разведка не удалась:', error);
  process.exit(1);
});
