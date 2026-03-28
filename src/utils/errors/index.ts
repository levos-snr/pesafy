// 📁 PATH: src/utils/errors/index.ts

/**
 * Pesafy error types — single source of truth.
 *
 * All codes map to a specific failure category so callers can handle
 * them without string-matching on the message.
 */

// ── Error codes ───────────────────────────────────────────────────────────────

export const ERROR_CODES = [
  "AUTH_FAILED",
  "INVALID_CREDENTIALS",
  "INVALID_PHONE",
  "ENCRYPTION_FAILED",
  "VALIDATION_ERROR",
  "API_ERROR",
  "HTTP_ERROR",
  "NETWORK_ERROR",
  "REQUEST_FAILED",
  "INVALID_RESPONSE",
  "TIMEOUT",
  "RATE_LIMITED",
  "INSUFFICIENT_FUNDS",
  "TRANSACTION_FAILED",
  "DUPLICATE_REQUEST",
  "IDEMPOTENCY_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

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
  /** Whether this error is retryable */
  retryable?: boolean;
}

// ── PesafyError class ─────────────────────────────────────────────────────────

export class PesafyError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number | undefined;
  readonly response: unknown;
  readonly requestId: string | undefined;
  override readonly cause: unknown;
  readonly retryable: boolean;

  constructor(options: PesafyErrorOptions) {
    super(options.message);
    Object.defineProperty(this, "name", { value: "PesafyError" });
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.response = options.response;
    this.requestId = options.requestId;
    this.cause = options.cause;
    // 429 / 503 / network errors are retryable
    this.retryable =
      options.retryable ??
      (options.code === "NETWORK_ERROR" ||
        options.code === "TIMEOUT" ||
        options.code === "RATE_LIMITED" ||
        options.code === "REQUEST_FAILED");

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PesafyError);
    }
  }

  /** Returns true if this is a validation error (user bug — do not retry) */
  get isValidation(): boolean {
    return this.code === "VALIDATION_ERROR";
  }

  /** Returns true if this is an auth error */
  get isAuth(): boolean {
    return this.code === "AUTH_FAILED" || this.code === "INVALID_CREDENTIALS";
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      requestId: this.requestId,
      retryable: this.retryable,
    };
  }
}

/** Convenience factory */
export function createError(options: PesafyErrorOptions): PesafyError {
  return new PesafyError(options);
}

/** Type guard */
export function isPesafyError(err: unknown): err is PesafyError {
  return err instanceof PesafyError;
}
