/**
 * Minimal HTTP client for Daraja API calls.
 *
 * Why not use axios/got/ky?
 *   - Zero extra dependencies
 *   - Works in Node.js, Bun, and edge runtimes unchanged
 *   - Daraja only needs POST + GET with JSON bodies
 *
 * Exported: httpRequest (the ONLY export — never export "httpClient")
 */

// src/utils/http/index.ts

import { PesafyError } from "../errors";

export interface HttpRequestOptions {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  /** Will be JSON-serialised and sent as application/json */
  body?: unknown;
  /**
   * Number of times to retry on transient errors (503, 429, network failures).
   * Default: 4. Set to 0 to disable retries.
   */
  retries?: number;
  /**
   * Base delay in ms before first retry. Doubles each attempt + jitter.
   * Default: 2000 (2 s). Daraja sandbox needs longer gaps than typical APIs.
   */
  retryDelay?: number;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/** Status codes that are transient and safe to retry */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/** Sleep for `ms` milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a delay with ±25 % jitter to avoid retry storms.
 * Daraja sandbox 503s are caused by sandbox overload — spreading
 * retries prevents making it worse.
 */
function jitter(baseMs: number): number {
  const spread = baseMs * 0.25;
  return baseMs + (Math.random() * spread * 2 - spread);
}

/**
 * Sends an HTTP request and returns parsed JSON.
 *
 * Automatically retries on transient errors (503, 429, network failures)
 * with exponential backoff + jitter. Never retries on 4xx client errors.
 *
 * NOTE: `httpClient` is NOT exported — the only export is `httpRequest`.
 */
export async function httpRequest<T = unknown>(
  url: string,
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const maxRetries = options.retries ?? 4;
  const baseDelay = options.retryDelay ?? 2000;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  const init: RequestInit = {
    method: options.method,
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  };

  let lastError: PesafyError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Wait before retry (not before the first attempt)
    if (attempt > 0) {
      const delay = jitter(baseDelay * Math.pow(2, attempt - 1));
      await sleep(delay);
    }

    let response: Response;

    try {
      response = await fetch(url, init);
    } catch (err) {
      // Network-level failure (DNS, connection refused, etc.)
      lastError = new PesafyError({
        code: "NETWORK_ERROR",
        message: `Network error calling ${url}: ${String(err)}`,
        cause: err,
      });

      if (attempt < maxRetries) continue; // retry
      throw lastError;
    }

    // Parse body regardless of status so we can include it in errors
    let data: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    try {
      data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    } catch {
      data = null;
    }

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (response.ok) {
      return {
        data: data as T,
        status: response.status,
        headers: responseHeaders,
      };
    }

    // ── Error response ────────────────────────────────────────────────────────
    const isTransient = RETRYABLE_STATUSES.has(response.status);

    // Daraja error shape: { requestId, errorCode, errorMessage }
    const daraja = (data ?? {}) as Record<string, unknown>;
    const message =
      (daraja.errorMessage as string) ??
      (daraja.ResponseDescription as string) ??
      `HTTP ${response.status}`;

    lastError = new PesafyError({
      code: isTransient ? "REQUEST_FAILED" : "HTTP_ERROR",
      message,
      statusCode: response.status,
      response: data,
      requestId: daraja.requestId as string | undefined,
    });

    // Only retry transient errors — never retry 4xx client errors
    if (isTransient && attempt < maxRetries) {
      continue;
    }

    throw lastError;
  }

  // Should never reach here, but TypeScript requires it
  throw lastError!;
}
