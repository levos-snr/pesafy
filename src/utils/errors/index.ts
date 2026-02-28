/**
 * Pesafy error utilities
 */
export type ErrorCode =
  | "INVALID_CREDENTIALS"
  | "AUTH_FAILED"
  | "VALIDATION_ERROR"
  | "ENCRYPTION_FAILED"
  | "REQUEST_FAILED"
  | "INVALID_PHONE"
  | "HTTP_ERROR"
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE";

export interface PesafyErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  response?: unknown;
  cause?: unknown;
  requestId?: string;
}

export class PesafyError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number | undefined;
  readonly response: unknown;
  readonly requestId: string | undefined;
  override readonly cause: unknown;

  constructor(options: PesafyErrorOptions) {
    super(options.message);
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

/** Convenience factory — identical API to `new PesafyError(...)` */
export function createError(options: PesafyErrorOptions): PesafyError {
  return new PesafyError(options);
}
