import type {
  CheckWhatsappRequest,
  CheckWhatsappResponse,
  DeleteNotificationResponse,
  GetChatHistoryRequest,
  GetChatHistoryResponse,
  GetChatsResponse,
  GetStateInstanceResponse,
  InstanceState,
  ReceiveNotificationResponse,
  SendMessageRequest,
  SendMessageResponse
} from '@/types/Api'
import type { Credentials } from '@/types/Credentials'

/* ---------- Errors ---------- */

export type GreenApiErrorKind =
  | 'network' // no connection, DNS, CORS, wrong apiUrl
  | 'timeout' // request took longer than timeoutMs
  | 'aborted' // cancelled by the caller's AbortSignal
  | 'http' // server answered with a non-2xx status
  | 'parse' // response body is not valid JSON

export class GreenApiError extends Error {
  readonly kind: GreenApiErrorKind
  readonly status?: number
  /** Raw response body or original error message, for logs */
  readonly details?: string

  constructor(kind: GreenApiErrorKind, options: { status?: number; details?: string; cause?: unknown } = {}) {
    super(options.status ? `Green API ${kind} error ${options.status}` : `Green API ${kind} error`, {
      cause: options.cause,
    })
    this.name = 'GreenApiError'
    this.kind = kind
    this.status = options.status
    this.details = options.details
  }
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: GreenApiError }

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Некорректный запрос. Проверьте введённые данные',
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Доступ запрещён. Проверьте idInstance и apiTokenInstance',
  404: 'Инстанс не найден. Проверьте API URL и idInstance',
  429: 'Слишком много запросов. Подождите немного и попробуйте снова',
  466: 'Превышен лимит тарифа: на бесплатном тарифе можно писать только ограниченному числу контактов',
  500: 'Внутренняя ошибка сервера Green API. Попробуйте позже',
  502: 'Сервер Green API временно недоступен. Попробуйте позже',
  503: 'Сервер Green API временно недоступен. Попробуйте позже',
  504: 'Сервер Green API не ответил вовремя. Попробуйте позже',
}

/** Turns any error from the API layer into a message for the user */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof GreenApiError)) {
    return 'Произошла неизвестная ошибка'
  }

  switch (error.kind) {
    case 'network':
      return 'Не удалось подключиться к серверу. Проверьте интернет и API URL'
    case 'timeout':
      return 'Сервер не ответил вовремя. Попробуйте ещё раз'
    case 'aborted':
      return 'Запрос отменён'
    case 'parse':
      return 'Сервер вернул некорректный ответ'
    case 'http': {
      const status = error.status ?? 0
      if (HTTP_ERROR_MESSAGES[status]) return HTTP_ERROR_MESSAGES[status]
      if (status >= 500) return `Ошибка сервера Green API (${status}). Попробуйте позже`
      return `Ошибка запроса (${status})`
    }
  }
}

/* ---------- Request wrapper ---------- */

const DEFAULT_TIMEOUT_MS = 15_000

interface RequestOptions {
  httpMethod?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  /** Appended after the token: /{method}/{token}{pathSuffix} */
  pathSuffix?: string
  query?: Record<string, string | number | undefined>
  signal?: AbortSignal
  timeoutMs?: number
}

function buildUrl(credentials: Credentials, method: string, options: RequestOptions): string {
  const base = credentials.apiUrl.replace(/\/+$/, '')
  const url = new URL(
    `${base}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${options.pathSuffix ?? ''}`,
  )
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

/**
 * Calls a Green API method. Never throws: every failure is returned
 * as { ok: false, error } so callers handle errors explicitly.
 */
export async function greenApiRequest<T>(
  credentials: Credentials,
  method: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { httpMethod = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  let url: string
  try {
    url = buildUrl(credentials, method, options)
  } catch (cause) {
    return { ok: false, error: new GreenApiError('network', { details: 'Invalid apiUrl', cause }) }
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  let response: Response
  try {
    response = await fetch(url, {
      method: httpMethod,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
    })
  } catch (cause) {
    if (timeoutSignal.aborted) {
      return { ok: false, error: new GreenApiError('timeout', { cause }) }
    }
    if (signal?.aborted) {
      return { ok: false, error: new GreenApiError('aborted', { cause }) }
    }
    return {
      ok: false,
      error: new GreenApiError('network', { details: cause instanceof Error ? cause.message : String(cause), cause }),
    }
  }

  let text: string
  try {
    text = await response.text()
  } catch (cause) {
    return { ok: false, error: new GreenApiError('network', { status: response.status, cause }) }
  }

  if (!response.ok) {
    return { ok: false, error: new GreenApiError('http', { status: response.status, details: text }) }
  }

  // Some methods (e.g. receiveNotification with an empty queue) return "null" or an empty body
  if (!text) return { ok: true, data: null as T }

  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch (cause) {
    return { ok: false, error: new GreenApiError('parse', { status: response.status, details: text, cause }) }
  }
}

/** Explains why a non-authorized instance can't be used */
export function getInstanceStateMessage(state: InstanceState): string {
  switch (state) {
    case 'authorized':
      return 'Инстанс авторизован'
    case 'notAuthorized':
      return 'Инстанс не авторизован. Перейдите в личный кабинет Green API для активации.'
    case 'blocked':
      return 'Инстанс заблокирован'
    default:
      return `Инстанс недоступен (состояние: ${state})`
  }
}

export function createGreenApi(credentials: Credentials) {
  return {
    getStateInstance: (signal?: AbortSignal) =>
      greenApiRequest<GetStateInstanceResponse>(credentials, 'getStateInstance', { signal }),

    /** Checks whether the number has a WhatsApp account (Developer plan: 100 checks/month) */
    checkWhatsapp: (payload: CheckWhatsappRequest, signal?: AbortSignal) =>
      greenApiRequest<CheckWhatsappResponse>(credentials, 'checkWhatsapp', {
        httpMethod: 'POST',
        body: payload,
        signal,
      }),

    sendMessage: (payload: SendMessageRequest, signal?: AbortSignal) =>
      greenApiRequest<SendMessageResponse>(credentials, 'sendMessage', {
        httpMethod: 'POST',
        body: payload,
        signal,
      }),

    receiveNotification: (receiveTimeout = 5, signal?: AbortSignal) =>
      greenApiRequest<ReceiveNotificationResponse | null>(credentials, 'receiveNotification', {
        query: { receiveTimeout },
        timeoutMs: (receiveTimeout + 10) * 1000,
        signal,
      }),

    deleteNotification: (receiptId: number, signal?: AbortSignal) =>
      greenApiRequest<DeleteNotificationResponse>(credentials, 'deleteNotification', {
        httpMethod: 'DELETE',
        pathSuffix: `/${receiptId}`,
        signal,
      }),

    /** Chats sorted by activity; the list updates on the server at most once a minute */
    getChats: (count?: number, signal?: AbortSignal) =>
      greenApiRequest<GetChatsResponse>(credentials, 'getChats', {
        query: { count },
        signal,
      }),

    /** Messages of a chat, newest first (up to 5000 messages / 3 months back) */
    getChatHistory: (payload: GetChatHistoryRequest, signal?: AbortSignal) =>
      greenApiRequest<GetChatHistoryResponse>(credentials, 'getChatHistory', {
        httpMethod: 'POST',
        body: payload,
        signal,
      }),
  }
}

export type GreenApi = ReturnType<typeof createGreenApi>
