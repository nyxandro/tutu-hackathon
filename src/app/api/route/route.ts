/**
 * Поиск маршрутов: прямых и составных. Считает код, а не языковая модель —
 * стыковки и цены должны быть воспроизводимы и не зависеть от настроения LLM.
 *
 * Экспорты:
 * - POST — приём запроса «откуда / куда / когда»
 */

import { buildRoutes } from '@/modules/routing/builder';

export const maxDuration = 120;

type RouteRequest = {
  origin?: string;
  destination?: string;
  date?: string;
  modes?: string[];
};

export async function POST(req: Request) {
  const { origin, destination, date }: RouteRequest = await req.json();

  // Все три поля обязательны: MCP Туту не умеет искать без направления,
  // и подставлять что-то за пользователя нельзя.
  if (!origin?.trim() || !destination?.trim() || !date?.trim()) {
    return Response.json(
      {
        code: 'APP_ROUTE_QUERY_INCOMPLETE',
        message: 'Укажите город отправления, город назначения и дату поездки.',
      },
      { status: 400 },
    );
  }

  try {
    const result = await buildRoutes(origin.trim(), destination.trim(), date.trim());
    return Response.json(result);
  } catch (error) {
    // Граница UI: наверх уходит понятный текст, подробности — в лог.
    console.error('[api/route] поиск не удался', error);
    return Response.json(
      {
        code: 'APP_ROUTE_SEARCH_FAILED',
        message: 'Не удалось получить данные Туту. Попробуйте повторить запрос через минуту.',
      },
      { status: 502 },
    );
  }
}
