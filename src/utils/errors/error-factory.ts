/**
 * Error creation utilities for Pesafy
 */

import type { ErrorCode, PesafyErrorOptions } from "./types";

export class PesafyError extends Error {
  readonly code: ErrorCode;
  readonly statusCode?: number;
  readonly response?: unknown;
  readonly requestId?: string;
  override readonly cause?: unknown;

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

export function createError(options: PesafyErrorOptions): PesafyError {
  return new PesafyError(options);
}
