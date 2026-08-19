/**
 * Ошибки инструментов как данные, а не строки.
 *
 * Модель принимает решение по ответу инструмента, поэтому ошибка должна
 * сообщать три вещи: что случилось (код), можно ли повторить (retryable) и
 * что делать дальше (remediation). Строка «что-то пошло не так» заставляет
 * модель угадывать, и она начинает ходить по кругу.
 *
 * Экспорты:
 * - ToolError — форма ошибки для модели
 * - toolError() — сборка ошибки
 * - classifyFailure() — разбор исключения в код и признак повторяемости
 */

export type ToolErrorCode =
  | 'TUTU_UNAVAILABLE'
  | 'TUTU_RATE_LIMITED'
  | 'TUTU_TIMEOUT'
  | 'SEARCH_BUDGET_SPENT'
  | 'DUPLICATE_REQUEST'
  | 'LEG_NOT_FOUND'
  | 'LEGS_DO_NOT_MEET'
  | 'DEADLINE_REACHED'
  | 'ORIGIN_DEAD_FOR_DATE';

export type ToolError = {
  error: true;
  code: ToolErrorCode;
  message: string;
  /** Повторять ли этот же вызов: true только для временных сбоев. */
  retryable: boolean;
  /** Что модели делать дальше — без этого она угадывает. */
  remediation: string;
};

export function toolError(
  code: ToolErrorCode,
  message: string,
  remediation: string,
  retryable = false,
): ToolError {
  return { error: true, code, message, retryable, remediation };
}

/** Разбирает исключение сети или MCP в код ошибки. */
export function classifyFailure(cause: unknown): { code: ToolErrorCode; retryable: boolean } {
  const text = cause instanceof Error ? `${cause.name} ${cause.message}` : String(cause);

  // 429 и «rate limit» — временные: сервер просит подождать, а не отказывает.
  if (/429|rate.?limit|too many requests/i.test(text)) {
    return { code: 'TUTU_RATE_LIMITED', retryable: true };
  }
  if (/timeout|timed out|ETIMEDOUT|aborted/i.test(text)) {
    return { code: 'TUTU_TIMEOUT', retryable: true };
  }
  // Обрыв соединения тоже повторяем: у Туту бывают короткие провалы.
  if (/ECONNRESET|ECONNREFUSED|socket hang up|fetch failed|EAI_AGAIN/i.test(text)) {
    return { code: 'TUTU_UNAVAILABLE', retryable: true };
  }
  return { code: 'TUTU_UNAVAILABLE', retryable: false };
}
