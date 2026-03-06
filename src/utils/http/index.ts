/**
 * HTTP client for Daraja API calls.
 *
 * Single source of truth — previously this file contained TWO conflicting
 * httpRequest implementations:
 *   1. A retry-capable version (retries, retryDelay options)
 *   2. An older timeout-based version (timeout option, no retries)
 *
 * Having both caused TypeScript to pick an unpredictable implementation.
 * The older version did NOT retry on 503 — meaning Daraja sandbox failures
 * surfaced immediately rather than being absorbed by backoff.
 *
 * This file is the SINGLE canonical export. Only export: httpRequest.
 * Never export "httpClient" — consumers must call httpRequest directly.
 */

import { PesafyError } from "../errors";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HttpRequestOptions {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  /**
   * Request body. Will be JSON.stringify'd and sent as application/json.
   * Pass undefined (not null) to omit the body entirely.
   */
  body?: unknown;
  /**
   * Number of retry attempts on transient errors (503, 429, 502, 504, network).
   * Default: 4. Set to 0 to disable retries.
   *
   * Daraja sandbox is notoriously unstable — 503s are common under load.
   * 4 retries with exponential backoff covers the typical sandbox blip.
   */
  retries?: number;
  /**
   * Base delay in ms before the first retry. Doubles each attempt + ±25% jitter.
   * Default: 2000 (2 s).
   */
  retryDelay?: number;
  /**
   * Per-request timeout in ms. Default: 30000 (30 s).
   * The timeout applies to each individual attempt, not the total retry duration.
   */
  timeout?: number;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** HTTP status codes that are transient and safe to retry */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/** Promise-based sleep */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Adds ±25% jitter to avoid thundering-herd retry storms.
 * Daraja sandbox 503s are caused by sandbox overload — spreading retries
 * across a time window prevents making the overload worse.
 */
function withJitter(baseMs: number): number {
  const spread = baseMs * 0.25;
  return baseMs + (Math.random() * spread * 2 - spread);
}

// ── httpRequest ───────────────────────────────────────────────────────────────

/**
 * Sends an HTTP request and returns parsed JSON.
 *
 * Automatically retries on transient errors with exponential backoff + jitter.
 * Never retries on 4xx client errors — those indicate a logic bug.
 *
 * @throws PesafyError on non-retryable errors or exhausted retries
 */
export async function httpRequest<T = unknown>(
  url: string,
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const maxRetries = options.retries ?? 4;
  const baseDelay = options.retryDelay ?? 2000;
  const timeout = options.timeout ?? 30_000;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  // Build the fetch init once — body is immutable across retries
  const init: RequestInit = {
    method: options.method,
    headers,
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  };

  let lastError: PesafyError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // ── Backoff before retry (not before first attempt) ─────────────────────
    if (attempt > 0) {
      const delay = withJitter(baseDelay * Math.pow(2, attempt - 1));
      console.warn(
        `[pesafy/http] Retry ${attempt}/${maxRetries} for ${options.method} ${url} ` +
          `in ${Math.round(delay)}ms (last error: ${lastError?.message ?? "unknown"})`
      );
      await sleep(delay);
    }

    // ── Per-attempt timeout via AbortController ──────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;

    try {
      response = await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      clearTimeout(timeoutId);

      // AbortError = timeout
      if (err instanceof Error && err.name === "AbortError") {
        lastError = new PesafyError({
          code: "TIMEOUT",
          message: `Request to ${url} timed out after ${timeout}ms`,
          cause: err,
        });
        if (attempt < maxRetries) continue;
        throw lastError;
      }

      // Network-level failure: DNS, ECONNRESET, ECONNREFUSED, etc.
      lastError = new PesafyError({
        code: "NETWORK_ERROR",
        message: `Network error calling ${url}: ${err instanceof Error ? err.message : String(err)}`,
        cause: err,
      });
      if (attempt < maxRetries) continue;
      throw lastError;
    } finally {
      clearTimeout(timeoutId);
    }

    // ── Parse body regardless of status ─────────────────────────────────────
    // We always read the body so we can include Daraja's error message in
    // thrown errors instead of just "HTTP 503".
    let rawText = "";
    let data: unknown;
    const contentType = response.headers.get("content-type") ?? "";

    try {
      rawText = await response.text();
      if (rawText) {
        data = contentType.includes("application/json")
          ? JSON.parse(rawText)
          : rawText;
      } else {
        data = null;
      }
    } catch {
      data = rawText || null;
    }

    // ── Collect response headers ─────────────────────────────────────────────
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // ── Success ──────────────────────────────────────────────────────────────
    if (response.ok) {
      return {
        data: data as T,
        status: response.status,
        headers: responseHeaders,
      };
    }

    // ── Error response ───────────────────────────────────────────────────────
    const isTransient = RETRYABLE_STATUSES.has(response.status);

    // Daraja error envelope shapes:
    //   { requestId, errorCode, errorMessage }
    //   { ResponseCode, ResponseDescription }
    const daraja =
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : {};

    const errorMessage =
      (daraja.errorMessage as string | undefined) ??
      (daraja.ResponseDescription as string | undefined) ??
      rawText ??
      `HTTP ${response.status}`;

    lastError = new PesafyError({
      code: isTransient ? "REQUEST_FAILED" : "API_ERROR",
      message: errorMessage,
      statusCode: response.status,
      response: data,
      requestId: daraja.requestId as string | undefined,
    });

    // Only retry transient errors. 4xx errors are client bugs — never retry.
    if (isTransient && attempt < maxRetries) {
      continue;
    }

    throw lastError;
  }

  // Unreachable — TypeScript requires this
  throw lastError!;
}
