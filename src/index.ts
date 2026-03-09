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
  B2BExpressCheckoutCallback,
  B2BExpressCheckoutCallbackCancelled,
  B2BExpressCheckoutCallbackSuccess,
  B2BExpressCheckoutErrorCode,
  B2BExpressCheckoutErrorResponse,
  B2BExpressCheckoutRequest,
  B2BExpressCheckoutResponse,
} from "./mpesa/b2b-express-checkout";
// ── B2B Express Checkout (USSD Push to Till) ──────────────────────────────────
export {
  getB2BAmount,
  getB2BConversationId,
  getB2BRequestId,
  getB2BTransactionId,
  initiateB2BExpressCheckout,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
} from "./mpesa/b2b-express-checkout";
export type {
  B2CCommandID,
  B2CErrorResponse,
  B2CRequest,
  B2CResponse,
  B2CResult,
  B2CResultParameter,
} from "./mpesa/b2c";
// ── B2C Payment / Account Top Up ─────────────────────────────────────────────
export {
  getB2CAmount,
  getB2CConversationId,
  getB2CCurrency,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
  getB2CInitiatorAccountBalance,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CResultDesc,
  getB2CResultParam,
  getB2CTransactionCompletedTime,
  getB2CTransactionId,
  initiateB2CPayment,
  isB2CFailure,
  isB2CResult,
  isB2CSuccess,
} from "./mpesa/b2c";
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
  acceptC2BValidation,
  acknowledgeC2BConfirmation,
  getC2BAccountRef,
  getC2BAmount,
  getC2BCustomerName,
  getC2BTransactionId,
  isBuyGoodsPayment,
  isC2BPayload,
  isPaybillPayment,
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
export type {
  TaxRemittanceErrorResponse,
  TaxRemittanceRequest,
  TaxRemittanceResponse,
  TaxRemittanceResult,
  TaxRemittanceResultParameter,
} from "./mpesa/tax-remittance";

// ── Tax Remittance ────────────────────────────────────────────────────────────
export {
  KRA_SHORTCODE,
  remitTax,
  TAX_COMMAND_ID,
} from "./mpesa/tax-remittance";
// ── Transaction Status ────────────────────────────────────────────────────────
export type {
  TransactionStatusRequest,
  TransactionStatusResponse,
  TransactionStatusResult,
  TransactionStatusResultParameter,
} from "./mpesa/transaction-status";
// ── Core types ────────────────────────────────────────────────────────────────
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
