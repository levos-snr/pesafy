/**
 * Pesafy — M-Pesa Daraja API client
 */

// ─── Core ──────────────────────────────────────────────────────────────────
export { TokenManager } from "./core/auth";
export { encryptSecurityCredential } from "./core/encryption";
// ─── Express helpers ──────────────────────────────────────────────────────
export type { MpesaExpressConfig } from "./express";
export { createMpesaExpressClient, createMpesaExpressRouter } from "./express";
// ─── Main client ──────────────────────────────────────────────────────────
export { Mpesa } from "./mpesa";

// ─── B2B ──────────────────────────────────────────────────────────────────
export type { B2BRequest, B2BResponse } from "./mpesa/b2b";

// ─── B2C ──────────────────────────────────────────────────────────────────
export type { B2CRequest, B2CResponse } from "./mpesa/b2c";

// ─── C2B ──────────────────────────────────────────────────────────────────
export type {
  C2BCallbackPayload,
  C2BCallbackPayloadBase,
  C2BCommandId,
  C2BConfirmationPayload,
  C2BRegisterUrlRequest,
  C2BRegisterUrlResponse,
  C2BRejectionCode,
  C2BSimulateRequest,
  C2BSimulateResponse,
  C2BValidationPayload,
} from "./mpesa/c2b";
export { C2B_REJECTION_CODES } from "./mpesa/c2b";
// ─── QR Code ──────────────────────────────────────────────────────────────
export type { DynamicQRRequest, DynamicQRResponse } from "./mpesa/qr-code";
// ─── Reversal ─────────────────────────────────────────────────────────────
export type { ReversalRequest, ReversalResponse } from "./mpesa/reversal";
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
export type { MpesaConfig } from "./mpesa/types";
export { DARAJA_BASE_URLS } from "./mpesa/types";
// ─── Webhooks ─────────────────────────────────────────────────────────────
export type {
  B2CWebhook,
  C2BWebhook,
  RetryOptions,
  RetryResult,
  StkPushWebhook,
  WebhookEvent,
  WebhookEventType,
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
