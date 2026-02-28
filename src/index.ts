/**
 * Pesafy — M-Pesa Daraja API (STK Push focused)
 */

// ─── Core ──────────────────────────────────────────────────────────────────
export { TokenManager } from "./core/auth";
export { encryptSecurityCredential } from "./core/encryption";

// ─── Express helpers ──────────────────────────────────────────────────────
export type { MpesaExpressConfig } from "./express";
export { createMpesaExpressClient, createMpesaExpressRouter } from "./express";

// ─── Main client ──────────────────────────────────────────────────────────
export { Mpesa } from "./mpesa";

// ─── STK Push ─────────────────────────────────────────────────────────────
export type {
  StkCallbackFailure,
  StkCallbackInner,
  StkCallbackMetadataItem,
  StkCallbackSuccess,
  StkPushCallback,
  StkPushRequest,
  StkPushResponse,
  StkQueryRequest,
  StkQueryResponse,
} from "./mpesa/stk-push";
export {
  formatPhoneNumber,
  getCallbackValue,
  getTimestamp,
  isStkCallbackSuccess,
} from "./mpesa/stk-push";
// ─── Transaction Status ───────────────────────────────────────────────────
export type {
  TransactionStatusRequest,
  TransactionStatusResponse,
} from "./mpesa/transaction-status";
// ─── Config & Types ───────────────────────────────────────────────────────
export type { MpesaConfig } from "./mpesa/types";
export { DARAJA_BASE_URLS } from "./mpesa/types";

// ─── Webhooks (STK Push only) ──────────────────────────────────────────────
export type {
  RetryOptions,
  RetryResult,
  StkPushWebhook,
  WebhookHandlerOptions,
  WebhookHandlerResult,
} from "./mpesa/webhooks";
export {
  extractAmount,
  extractTransactionId,
  handleWebhook,
  retryWithBackoff,
  verifyWebhookIP,
} from "./mpesa/webhooks";

// ─── Errors ───────────────────────────────────────────────────────────────
export type { ErrorCode } from "./utils/errors";
export { createError, PesafyError } from "./utils/errors";

// ─── Shared phone utils ───────────────────────────────────────────────────
export {
  formatKenyanMsisdn,
  formatSafaricomPhone,
  msisdnToNumber,
} from "./utils/phone";
