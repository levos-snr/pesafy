// 📁 PATH: src/index.ts

// ── Main client ───────────────────────────────────────────────────────────────
export { Mpesa } from './mpesa'

// ── Core types ────────────────────────────────────────────────────────────────
export type { Environment, MpesaConfig } from './mpesa/types'
export { DARAJA_BASE_URLS } from './mpesa/types'

// ── Auth ──────────────────────────────────────────────────────────────────────
export type { AuthErrorCode, AuthErrorResponse, TokenCacheEntry, TokenResponse } from './core/auth'
export { AUTH_ERROR_CODES, TokenManager } from './core/auth'

// ── Branded types & helpers ───────────────────────────────────────────────────
export type {
  CheckoutRequestID,
  ConversationID,
  DeepReadonly,
  KesAmount,
  MpesaReceiptNumber,
  MsisdnKE,
  NonEmptyString,
  OriginatorConversationID,
  PaybillCode,
  Result,
  ShortCode,
  StrictPick,
  TillCode,
} from './types/branded'
export {
  err,
  ok,
  toKesAmount,
  toMsisdn,
  toNonEmpty,
  toPaybill,
  toShortCode,
  toTill,
} from './types/branded'

// ── Errors ────────────────────────────────────────────────────────────────────
export type { ErrorCode, PesafyErrorOptions } from './utils/errors'
export { createError, isPesafyError, PesafyError } from './utils/errors'

// ── Encryption ────────────────────────────────────────────────────────────────
export { encryptSecurityCredential } from './core/encryption'

// ── Phone utilities ───────────────────────────────────────────────────────────
export { formatSafaricomPhone } from './utils/phone'

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
} from './mpesa/stk-push'
export {
  formatPhoneNumber,
  getCallbackValue,
  getTimestamp,
  isStkCallbackSuccess,
} from './mpesa/stk-push'

// ── C2B ───────────────────────────────────────────────────────────────────────
export type {
  C2BApiVersion,
  C2BCommandID,
  C2BConfirmationAck,
  C2BConfirmationPayload,
  C2BRegisterUrlErrorCode,
  C2BRegisterUrlRequest,
  C2BRegisterUrlResponse,
  C2BResponseType,
  C2BSimulateRequest,
  C2BSimulateResponse,
  C2BValidationPayload,
  C2BValidationResponse,
  C2BValidationResultCode,
} from './mpesa/c2b'
export {
  // API clients
  registerC2BUrls,
  simulateC2B,
  // Error code constants (from Daraja troubleshooting docs)
  C2B_REGISTER_URL_ERROR_CODES,
  // Validation result code constants (from Daraja validation docs)
  C2B_VALIDATION_RESULT_CODES,
  // Webhook helpers
  acceptC2BValidation,
  acknowledgeC2BConfirmation,
  getC2BAccountRef,
  getC2BAmount,
  getC2BCustomerName,
  getC2BTransactionId,
  isBuyGoodsPayment,
  isC2BPayload,
  isPaybillPayment,
  rejectC2BValidation,
} from './mpesa/c2b'

// ── B2C ───────────────────────────────────────────────────────────────────────
export type {
  B2CCommandID,
  B2CErrorCode,
  B2CErrorResponse,
  B2CRequest,
  B2CResponse,
  B2CResult,
  B2CResultCode,
  B2CResultParameter,
  B2CResultParameterKey,
} from './mpesa/b2c'
export {
  B2C_ERROR_CODES,
  B2C_RESULT_CODES,
  getB2CAmount,
  getB2CConversationId,
  getB2CCurrency,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
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
  isKnownB2CResultCode,
} from './mpesa/b2c'

// ── B2B Express Checkout ──────────────────────────────────────────────────────
export type {
  B2BExpressCheckoutCallback,
  B2BExpressCheckoutCallbackCancelled,
  B2BExpressCheckoutCallbackSuccess,
  B2BExpressCheckoutErrorCode,
  B2BExpressCheckoutErrorResponse,
  B2BExpressCheckoutRequest,
  B2BExpressCheckoutResponse,
} from './mpesa/b2b-express-checkout'
export {
  getB2BAmount,
  getB2BConversationId,
  getB2BRequestId,
  getB2BTransactionId,
  initiateB2BExpressCheckout,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
} from './mpesa/b2b-express-checkout'

// ── B2B Buy Goods ─────────────────────────────────────────────────────────────
export type {
  B2BBuyGoodsCommandID,
  B2BBuyGoodsErrorCode,
  B2BBuyGoodsErrorResponse,
  B2BBuyGoodsReferenceItem,
  B2BBuyGoodsRequest,
  B2BBuyGoodsResponse,
  B2BBuyGoodsResult,
  B2BBuyGoodsResultCode,
  B2BBuyGoodsResultParameter,
  B2BBuyGoodsResultParameterKey,
} from './mpesa/b2b-buy-goods'
export {
  // API client
  initiateB2BBuyGoods,
  // Result code constants
  B2B_BUY_GOODS_ERROR_CODES,
  B2B_BUY_GOODS_RESULT_CODES,
  // Webhook helpers — type guards
  isB2BBuyGoodsFailure,
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  isKnownB2BBuyGoodsResultCode,
  // Webhook helpers — field extractors
  getB2BBuyGoodsAmount,
  getB2BBuyGoodsBillReferenceNumber,
  getB2BBuyGoodsCompletedTime,
  getB2BBuyGoodsConversationId,
  getB2BBuyGoodsCurrency,
  getB2BBuyGoodsDebitAccountBalance,
  getB2BBuyGoodsDebitPartyAffectedBalance,
  getB2BBuyGoodsDebitPartyCharges,
  getB2BBuyGoodsInitiatorBalance,
  getB2BBuyGoodsOriginatorConversationId,
  getB2BBuyGoodsQueueTimeoutUrl,
  getB2BBuyGoodsReceiverName,
  getB2BBuyGoodsResultCode,
  getB2BBuyGoodsResultDesc,
  getB2BBuyGoodsResultParam,
  getB2BBuyGoodsTransactionId,
} from './mpesa/b2b-buy-goods'

// ── B2B Pay Bill ──────────────────────────────────────────────────────────────
export type {
  B2BPayBillCommandID,
  B2BPayBillErrorCode,
  B2BPayBillErrorResponse,
  B2BPayBillReferenceItem,
  B2BPayBillRequest,
  B2BPayBillResponse,
  B2BPayBillResult,
  B2BPayBillResultCode,
  B2BPayBillResultParameter,
  B2BPayBillResultParameterKey,
} from './mpesa/b2b-pay-bill'
export {
  // API client
  initiateB2BPayBill,
  // Result code constants
  B2B_PAY_BILL_ERROR_CODES,
  B2B_PAY_BILL_RESULT_CODES,
  // Webhook helpers — type guards
  isB2BPayBillFailure,
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  isKnownB2BPayBillResultCode,
  // Webhook helpers — field extractors
  getB2BPayBillAmount,
  getB2BPayBillBillReferenceNumber,
  getB2BPayBillCompletedTime,
  getB2BPayBillConversationId,
  getB2BPayBillCurrency,
  getB2BPayBillDebitAccountBalance,
  getB2BPayBillDebitPartyAffectedBalance,
  getB2BPayBillDebitPartyCharges,
  getB2BPayBillInitiatorBalance,
  getB2BPayBillOriginatorConversationId,
  getB2BPayBillReceiverName,
  getB2BPayBillResultCode,
  getB2BPayBillResultDesc,
  getB2BPayBillResultParam,
  getB2BPayBillTransactionId,
} from './mpesa/b2b-pay-bill'

// ── Tax Remittance ────────────────────────────────────────────────────────────
export type {
  TaxRemittanceErrorResponse,
  TaxRemittanceRequest,
  TaxRemittanceResponse,
  TaxRemittanceResult,
  TaxRemittanceResultParameter,
  TaxRemittanceResultParameterKey,
} from './mpesa/tax-remittance'
export {
  // API client
  KRA_SHORTCODE,
  remitTax,
  TAX_COMMAND_ID,
  // Webhook helpers — type guards
  isTaxRemittanceFailure,
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
  // Webhook helpers — field extractors
  getTaxAmount,
  getTaxCompletedTime,
  getTaxConversationId,
  getTaxOriginatorConversationId,
  getTaxReceiverName,
  getTaxResultCode,
  getTaxResultDesc,
  getTaxResultParam,
  getTaxTransactionId,
} from './mpesa/tax-remittance'

// ── Transaction Status ────────────────────────────────────────────────────────
export type {
  TransactionStatusErrorCode,
  TransactionStatusRequest,
  TransactionStatusResponse,
  TransactionStatusResult,
  TransactionStatusResultCode,
  TransactionStatusResultParameter,
  TransactionStatusResultParameterKey,
} from './mpesa/transaction-status'
export {
  // API client
  queryTransactionStatus,
  // Error & result code constants
  TRANSACTION_STATUS_ERROR_CODES,
  TRANSACTION_STATUS_RESULT_CODES,
  // Webhook helpers — type guards
  isTransactionStatusFailure,
  isTransactionStatusResult,
  isTransactionStatusSuccess,
  isKnownTransactionStatusResultCode,
  // Webhook helpers — core field extractors
  getTransactionStatusConversationId,
  getTransactionStatusOriginatorConversationId,
  getTransactionStatusResultCode,
  getTransactionStatusResultDesc,
  getTransactionStatusTransactionId,
  // Webhook helpers — result parameter extractors
  getTransactionStatusAmount,
  getTransactionStatusCreditPartyName,
  getTransactionStatusDebitAccountBalance,
  getTransactionStatusDebitPartyName,
  getTransactionStatusReceiptNo,
  getTransactionStatusResultParam,
  getTransactionStatusStatus,
  getTransactionStatusTransactionDate,
} from './mpesa/transaction-status'

// ── Account Balance ───────────────────────────────────────────────────────────
export type {
  AccountBalanceData,
  AccountBalanceRequest,
  AccountBalanceResponse,
  AccountBalanceResult,
  ParsedAccount,
} from './mpesa/account-balance'
export {
  getAccountBalanceParam,
  isAccountBalanceSuccess,
  parseAccountBalance,
} from './mpesa/account-balance'

// ── Reversal ──────────────────────────────────────────────────────────────────
export type { ReversalRequest, ReversalResponse, ReversalResult } from './mpesa/reversal'
export {
  getReversalConversationId,
  getReversalTransactionId,
  isReversalSuccess,
} from './mpesa/reversal'

// ── Bill Manager ──────────────────────────────────────────────────────────────
export type {
  BillManagerBulkInvoiceRequest,
  BillManagerBulkInvoiceResponse,
  BillManagerCancelInvoiceRequest,
  BillManagerCancelInvoiceResponse,
  BillManagerInvoiceItem,
  BillManagerOptInRequest,
  BillManagerOptInResponse,
  BillManagerPaymentNotification,
  BillManagerSingleInvoiceRequest,
  BillManagerSingleInvoiceResponse,
} from './mpesa/bill-manager'

// ── Dynamic QR ────────────────────────────────────────────────────────────────
export type { DynamicQRRequest, DynamicQRResponse, QRTransactionCode } from './mpesa/dynamic-qr'

// ── Webhooks ──────────────────────────────────────────────────────────────────
export type {
  RetryOptions,
  RetryResult,
  StkPushWebhook,
  WebhookEvent,
  WebhookEventType,
  WebhookHandlerOptions,
  WebhookHandlerResult,
} from './mpesa/webhooks'
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
} from './mpesa/webhooks'

// ── HTTP (advanced users) ─────────────────────────────────────────────────────
export type { HttpRequestOptions, HttpResponse } from './utils/http'
export { httpRequest } from './utils/http'
