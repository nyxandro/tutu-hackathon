/**
 * Повторные попытки для обращений к Туту.
 *
 * Повторяем только временные сбои (429, таймаут, обрыв связи) и только для
 * идемпотентных операций — поиск рейсов ничего не меняет на стороне Туту,
 * поэтому повтор безопасен. Число попыток ограничено, каждая логируется:
 * скрытые бесконечные ретраи маскируют проблему и добивают чужой сервер.
 *
 * Экспорты:
 * - withRetry() — выполняет операцию с ограниченным числом повторов
 */

import { RETRY_ATTEMPTS, RETRY_BASE_DELAY_MS } from '@/modules/agent/config';
import { classifyFailure } from '@/modules/agent/errors';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; code: ReturnType<typeof classifyFailure>['code'] }> {
  let lastCode: ReturnType<typeof classifyFailure>['code'] = 'TUTU_UNAVAILABLE';

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return { ok: true, value: await operation() };
    } catch (cause) {
      const { code, retryable } = classifyFailure(cause);
      lastCode = code;

      if (!retryable || attempt === RETRY_ATTEMPTS) {
        console.error(`[retry] ${label}: ${code}, попытка ${attempt} из ${RETRY_ATTEMPTS}, сдаёмся`);
        return { ok: false, code };
      }

      // Пауза растёт: на rate limit имеет смысл подождать дольше.
      const delay = RETRY_BASE_DELAY_MS * attempt;
      console.error(`[retry] ${label}: ${code}, повтор через ${delay} мс`);
      await sleep(delay);
    }
  }

  return { ok: false, code: lastCode };
}
