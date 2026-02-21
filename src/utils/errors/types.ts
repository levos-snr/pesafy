/**
 * Error types for Pesafy library
 */

export type ErrorCode =
  | "AUTH_FAILED"
  | "INVALID_CREDENTIALS"
  | "ENCRYPTION_FAILED"
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "VALIDATION_ERROR"
  | "INVALID_RESPONSE"
  | "REQUEST_FAILED"
  | "TIMEOUT";

export interface PesafyErrorOptions {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  statusCode?: number;
  response?: unknown;
  requestId?: string;
}
