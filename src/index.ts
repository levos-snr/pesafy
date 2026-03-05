/**
 * pesafy — M-Pesa Daraja API SDK
 *
 * Public exports
 */

// ── Encryption ────────────────────────────────────────────────────────────────
export { encryptSecurityCredential } from "./core/encryption";
// ── Main client ───────────────────────────────────────────────────────────────
export { Mpesa } from "./mpesa";
export type {
  C2BApiVersion,
  C2BCommandID,
  C2BConfirmationAck,
  C2BConfirmationPayload,
  C2BRegisterUrlRequest,
  C2BRegisterUrlResponse,
  C2BResponseType,
  C2BSimulateRequest,
  C2BSimulateResponse,
  C2BValidationPayload,
  C2BValidationResponse,
  C2BValidationResultCode,
} from "./mpesa/c2b";
// ── C2B (Customer to Business) ────────────────────────────────────────────────
export {
  // Validation helpers
  acceptC2BValidation,
  acknowledgeC2BConfirmation,
  getC2BAccountRef,
  // Payload extractors
  getC2BAmount,
  getC2BCustomerName,
  getC2BTransactionId,
  isBuyGoodsPayment,
  // Payload type guards
  isC2BPayload,
  isPaybillPayment,
  // Core functions
  registerC2BUrls,
  rejectC2BValidation,
  simulateC2B,
} from "./mpesa/c2b";
// ── Dynamic QR ────────────────────────────────────────────────────────────────
export type {
  DynamicQRRequest,
  DynamicQRResponse,
  QRTransactionCode,
} from "./mpesa/dynamic-qr";
// ── STK Push ──────────────────────────────────────────────────────────────────
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
  TransactionType,
} from "./mpesa/stk-push";
export {
  formatPhoneNumber,
  getCallbackValue,
  getTimestamp,
  isStkCallbackSuccess,
} from "./mpesa/stk-push";
// ── Transaction Status ────────────────────────────────────────────────────────
export type {
  TransactionStatusRequest,
  TransactionStatusResponse,
  TransactionStatusResult,
  TransactionStatusResultParameter,
} from "./mpesa/transaction-status";
export type { Environment, MpesaConfig } from "./mpesa/types";
export { DARAJA_BASE_URLS } from "./mpesa/types";
// ── Webhooks ──────────────────────────────────────────────────────────────────
export type {
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
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,
  parseStkPushWebhook,
  retryWithBackoff,
  SAFARICOM_IPS,
  verifyWebhookIP,
} from "./mpesa/webhooks";
// ── Errors ────────────────────────────────────────────────────────────────────
export type { ErrorCode, PesafyErrorOptions } from "./utils/errors";
export { createError, PesafyError } from "./utils/errors";
