// 📁 PATH: src/utils/http/index.ts

/**
 * HTTP client for Daraja API calls.
 *
 * Single, canonical implementation — retries transient errors with
 * exponential back-off + ±25 % jitter. Never retries 4xx errors.
 */

import { PesafyError } from '../errors'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HttpRequestOptions {
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  /**
   * Request body — JSON-serialised and sent as application/json.
   * Omit or pass `undefined` to send no body.
   */
  body?: unknown
  /**
   * Retry attempts on transient errors (503, 429, 502, 504, network).
   * Default: 4. Set 0 to disable.
   */
  retries?: number
  /**
   * Base delay in ms before first retry. Doubles each attempt + ±25 % jitter.
   * Default: 2000 ms.
   */
  retryDelay?: number
  /**
   * Per-attempt timeout in ms. Does NOT cover total retry duration.
   * Default: 30 000 ms.
   */
  timeout?: number
  /**
   * Optional idempotency key — passed as Idempotency-Key header.
   * Daraja ignores it but useful for your own gateway layer.
   */
  idempotencyKey?: string
}

export interface HttpResponse<T> {
  data: T
  status: number
  headers: Record<string, string>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function withJitter(base: number): number {
  const spread = base * 0.25
  return base + (Math.random() * spread * 2 - spread)
}

// ── httpRequest ───────────────────────────────────────────────────────────────

/**
 * Sends an HTTP request to Daraja and returns parsed JSON.
 * Automatically retries transient failures with exponential back-off.
 *
 * @throws {PesafyError} on non-retryable errors or exhausted retries.
 */
export async function httpRequest<T = unknown>(
  url: string,
  options: HttpRequestOptions,
): Promise<HttpResponse<T>> {
  const maxRetries = options.retries ?? 4
  const baseDelay = options.retryDelay ?? 2_000
  const timeout = options.timeout ?? 30_000

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey
  }

  const init: RequestInit = {
    method: options.method,
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  }

  let lastError: PesafyError | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = withJitter(baseDelay * Math.pow(2, attempt - 1))
      console.warn(
        `[pesafy] Retry ${attempt}/${maxRetries} → ${options.method} ${url} in ${Math.round(delay)} ms`,
      )
      await sleep(delay)
    }

    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), timeout)
    let response: Response

    try {
      response = await fetch(url, { ...init, signal: controller.signal })
    } catch (err) {
      clearTimeout(tid)
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new PesafyError({
          code: 'TIMEOUT',
          message: `Request to ${url} timed out after ${timeout} ms`,
          cause: err,
          retryable: true,
        })
      } else {
        lastError = new PesafyError({
          code: 'NETWORK_ERROR',
          message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
          cause: err,
          retryable: true,
        })
      }
      if (attempt < maxRetries) continue
      throw lastError
    } finally {
      clearTimeout(tid)
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let rawText = ''
    let data: unknown = null
    const ct = response.headers.get('content-type') ?? ''

    try {
      rawText = await response.text()
      if (rawText) {
        data = ct.includes('application/json') ? JSON.parse(rawText) : rawText
      }
    } catch {
      data = rawText || null
    }

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((v, k) => {
      responseHeaders[k] = v
    })

    if (response.ok) {
      return {
        data: data as T,
        status: response.status,
        headers: responseHeaders,
      }
    }

    // ── Error path ───────────────────────────────────────────────────────────
    const isTransient = RETRYABLE_STATUSES.has(response.status)
    const daraja =
      typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : {}

    const message =
      (daraja['errorMessage'] as string | undefined) ??
      (daraja['ResponseDescription'] as string | undefined) ??
      (daraja['resultDesc'] as string | undefined) ??
      rawText ??
      `HTTP ${response.status}`

    lastError = new PesafyError({
      code: isTransient ? 'REQUEST_FAILED' : 'API_ERROR',
      message,
      statusCode: response.status,
      response: data,
      requestId: daraja['requestId'] as string | undefined,
      retryable: isTransient,
    })

    if (isTransient && attempt < maxRetries) continue
    throw lastError
  }

  throw lastError!
}
