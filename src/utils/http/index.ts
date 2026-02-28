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

import { PesafyError } from "../errors";

export interface HttpRequestOptions {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  /** Will be JSON-serialised and sent as application/json */
  body?: unknown;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Sends an HTTP request and returns parsed JSON.
 * Throws PesafyError on non-2xx responses.
 */
export async function httpRequest<T = unknown>(
  url: string,
  options: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  const init: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    throw new PesafyError({
      code: "REQUEST_FAILED",
      message: `Network error calling ${url}: ${String(err)}`,
      cause: err,
    });
  }

  // Parse body regardless of status so we can attach it to the error
  let data: unknown;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    // Daraja error shape: { requestId, errorCode, errorMessage }
    const daraja = data as Record<string, unknown>;
    const message =
      (daraja?.errorMessage as string) ??
      (daraja?.ResponseDescription as string) ??
      `HTTP ${response.status}`;

    throw new PesafyError({
      code: "HTTP_ERROR",
      message,
      statusCode: response.status,
      response: data,
    });
  }

  // Collect response headers into a plain object
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    data: data as T,
    status: response.status,
    headers: responseHeaders,
  };
}
