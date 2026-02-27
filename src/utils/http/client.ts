/**
 * HTTP client for Daraja API requests
 */

import { PesafyError } from "../errors";
import type { HttpRequestOptions, HttpResponse } from "./types";

const DEFAULT_TIMEOUT = 30000;

export async function httpRequest<T = unknown>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse<T>> {
  const {
    method = "GET",
    headers = {},
    body,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: T;
    const text = await response.text();
    try {
      data = (text ? JSON.parse(text) : {}) as T;
    } catch {
      data = { raw: text } as T;
    }

    if (!response.ok) {
      // Include the full Daraja response body so callers can see exactly what
      // Safaricom returned: "Invalid Access Token", "Bad Request - Invalid
      // Shortcode", "Wrong credentials", etc. Previously this was swallowed.
      const bodyStr = text.length > 0 ? ` — ${text}` : "";
      throw new PesafyError({
        code: "API_ERROR",
        message: `Request failed with status ${response.status}${bodyStr}`,
        statusCode: response.status,
        response: data,
      });
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof PesafyError) throw error;
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new PesafyError({
          code: "TIMEOUT",
          message: `Request timed out after ${timeout}ms`,
          cause: error,
        });
      }
      throw new PesafyError({
        code: "NETWORK_ERROR",
        message: error.message,
        cause: error,
      });
    }
    throw new PesafyError({
      code: "REQUEST_FAILED",
      message: "An unknown error occurred",
      cause: error,
    });
  }
}
