/**
 * Pesafy error types and utilities.
 *
 * Single source of truth — no duplicate definitions.
 * Previously this file had two conflicting ErrorCode aliases and two
 * PesafyError class definitions which caused TypeScript to use an
 * unpredictable one at runtime.
 */

// ── Error code union ──────────────────────────────────────────────────────────

export type ErrorCode =
  | "AUTH_FAILED"
  | "INVALID_CREDENTIALS"
  | "INVALID_PHONE"
  | "ENCRYPTION_FAILED"
  | "VALIDATION_ERROR"
  | "API_ERROR"
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "REQUEST_FAILED"
  | "INVALID_RESPONSE"
  | "TIMEOUT";

// ── Error options ─────────────────────────────────────────────────────────────

export interface PesafyErrorOptions {
  code: ErrorCode;
  message: string;
  /** HTTP status code from Daraja (if applicable) */
  statusCode?: number;
  /** Raw Daraja response body (for debugging) */
  response?: unknown;
  /** Underlying caught error (network, crypto, etc.) */
  cause?: unknown;
  /** Daraja requestId from the error envelope */
  requestId?: string;
}

// ── PesafyError class ─────────────────────────────────────────────────────────

export class PesafyError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number | undefined;
  readonly response: unknown;
  readonly requestId: string | undefined;
  override readonly cause: unknown;

  constructor(options: PesafyErrorOptions) {
    super(options.message);
    // Ensure instanceof checks work correctly
    Object.defineProperty(this, "name", { value: "PesafyError" });
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.response = options.response;
    this.requestId = options.requestId;
    this.cause = options.cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PesafyError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      requestId: this.requestId,
    };
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/** Convenience factory — identical API to `new PesafyError(...)` */
export function createError(options: PesafyErrorOptions): PesafyError {
  return new PesafyError(options);
}
