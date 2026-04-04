/**
 * src/index.ts
 *
 * Root package entry point — exports everything consumers need.
 *
 * Sections:
 *   1.  Mpesa client class
 *   2.  Core types (environment, config)
 *   3.  Auth (TokenManager, token types)
 *   4.  Branded types & Result helpers
 *   5.  Errors (PesafyError, createError, isPesafyError)
 *   6.  Encryption
 *   7.  Phone utilities
 *   8.  STK Push              (FIXED: added STK_PUSH_LIMITS, STK_RESULT_CODES, isKnownStkResultCode, StkResultCode)
 *   9.  C2B
 *   10. B2C Account Top Up
 *   11. B2B Express Checkout
 *   12. B2B Buy Goods
 *   13. B2B Pay Bill
 *   14. Tax Remittance
 *   15. Transaction Status
 *   16. Account Balance
 *   17. Reversal
 *   18. Bill Manager
 *   19. Dynamic QR            (FIXED: added generateDynamicQR, validators, QR_TRANSACTION_CODES, extra types)
 *   20. B2C Disbursement      (FIXED: was entirely missing — full module now exported)
 *   21. Webhooks
 *   22. HTTP (advanced)
 */

// ── 1. Mpesa client ───────────────────────────────────────────────────────────
export { Mpesa } from './mpesa'

// ── 2. Core types ─────────────────────────────────────────────────────────────
export type { Environment, MpesaConfig } from './mpesa/types'
export { DARAJA_BASE_URLS } from './mpesa/types'

// ── 3. Auth ───────────────────────────────────────────────────────────────────
export type { AuthErrorCode, AuthErrorResponse, TokenCacheEntry, TokenResponse } from './core/auth'
export { AUTH_ERROR_CODES, TokenManager } from './core/auth'

// ── 4. Branded types & helpers ────────────────────────────────────────────────
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

// ── 5. Errors ─────────────────────────────────────────────────────────────────
export type { ErrorCode, PesafyErrorOptions } from './utils/errors'
export { createError, isPesafyError, PesafyError } from './utils/errors'

// ── 6. Encryption ─────────────────────────────────────────────────────────────
export { encryptSecurityCredential } from './core/encryption'

// ── 7. Phone utilities ────────────────────────────────────────────────────────
export { formatSafaricomPhone } from './utils/phone'

// ── 8. STK Push ───────────────────────────────────────────────────────────────
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
  StkResultCode,
  TransactionType,
} from './mpesa/stk-push'
export {
  // Constants — were missing before this fix
  STK_PUSH_LIMITS,
  STK_RESULT_CODES,
  // Type guard — was missing before this fix
  isKnownStkResultCode,
  // Helpers
  formatPhoneNumber,
  getCallbackValue,
  getTimestamp,
  isStkCallbackSuccess,
} from './mpesa/stk-push'

// ── 9. C2B ────────────────────────────────────────────────────────────────────
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
  registerC2BUrls,
  simulateC2B,
  C2B_REGISTER_URL_ERROR_CODES,
  C2B_VALIDATION_RESULT_CODES,
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

// ── 10. B2C Account Top Up ────────────────────────────────────────────────────
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

// ── 11. B2B Express Checkout ──────────────────────────────────────────────────
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
  // FIXED: B2B_RESULT_CODES was missing — caused B2B_RESULT_CODES.SUCCESS and
  // B2B_RESULT_CODES.CANCELLED to resolve as undefined in the root index tests.
  B2B_RESULT_CODES,
  getB2BAmount,
  getB2BConversationId,
  getB2BRequestId,
  getB2BTransactionId,
  initiateB2BExpressCheckout,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
} from './mpesa/b2b-express-checkout'

// ── 12. B2B Buy Goods ─────────────────────────────────────────────────────────
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
  initiateB2BBuyGoods,
  B2B_BUY_GOODS_ERROR_CODES,
  B2B_BUY_GOODS_RESULT_CODES,
  isB2BBuyGoodsFailure,
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  isKnownB2BBuyGoodsResultCode,
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

// ── 13. B2B Pay Bill ──────────────────────────────────────────────────────────
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
  initiateB2BPayBill,
  B2B_PAY_BILL_ERROR_CODES,
  B2B_PAY_BILL_RESULT_CODES,
  isB2BPayBillFailure,
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  isKnownB2BPayBillResultCode,
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

// ── 14. Tax Remittance ────────────────────────────────────────────────────────
export type {
  TaxRemittanceErrorResponse,
  TaxRemittanceRequest,
  TaxRemittanceResponse,
  TaxRemittanceResult,
  TaxRemittanceResultParameter,
  TaxRemittanceResultParameterKey,
} from './mpesa/tax-remittance'
export {
  KRA_SHORTCODE,
  remitTax,
  TAX_COMMAND_ID,
  isTaxRemittanceFailure,
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
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

// ── 15. Transaction Status ────────────────────────────────────────────────────
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
  queryTransactionStatus,
  TRANSACTION_STATUS_ERROR_CODES,
  TRANSACTION_STATUS_RESULT_CODES,
  isTransactionStatusFailure,
  isTransactionStatusResult,
  isTransactionStatusSuccess,
  isKnownTransactionStatusResultCode,
  getTransactionStatusConversationId,
  getTransactionStatusOriginatorConversationId,
  getTransactionStatusResultCode,
  getTransactionStatusResultDesc,
  getTransactionStatusTransactionId,
  getTransactionStatusAmount,
  getTransactionStatusCreditPartyName,
  getTransactionStatusDebitAccountBalance,
  getTransactionStatusDebitPartyName,
  getTransactionStatusReceiptNo,
  getTransactionStatusResultParam,
  getTransactionStatusStatus,
  getTransactionStatusTransactionDate,
} from './mpesa/transaction-status'

// ── 16. Account Balance ───────────────────────────────────────────────────────
export type {
  AccountBalanceData,
  AccountBalanceErrorCode,
  AccountBalanceRequest,
  AccountBalanceResponse,
  AccountBalanceResult,
  AccountBalanceReferenceItem,
  AccountBalanceResultParameter,
  AccountBalanceResultParameterKey,
  ParsedAccount,
} from './mpesa/account-balance'
export {
  queryAccountBalance,
  ACCOUNT_BALANCE_ERROR_CODES,
  isAccountBalanceSuccess,
  parseAccountBalance,
  getAccountBalanceParam,
  getAccountBalanceTransactionId,
  getAccountBalanceConversationId,
  getAccountBalanceOriginatorConversationId,
  getAccountBalanceCompletedTime,
  getAccountBalanceRawBalance,
  getAccountBalanceReferenceItem,
} from './mpesa/account-balance'

// ── 17. Reversal ──────────────────────────────────────────────────────────────
export type {
  ReversalErrorCode,
  ReversalRequest,
  ReversalResponse,
  ReversalResult,
  ReversalResultCode,
  ReversalResultParameter,
  ReversalResultParameterKey,
} from './mpesa/reversal'
export {
  requestReversal,
  REVERSAL_COMMAND_ID,
  REVERSAL_ERROR_CODES,
  REVERSAL_RECEIVER_IDENTIFIER_TYPE,
  REVERSAL_RESULT_CODES,
  isKnownReversalResultCode,
  isReversalFailure,
  isReversalResult,
  isReversalSuccess,
  getReversalAmount,
  getReversalCharge,
  getReversalCompletedTime,
  getReversalConversationId,
  getReversalCreditPartyPublicName,
  getReversalDebitAccountBalance,
  getReversalDebitPartyPublicName,
  getReversalOriginalTransactionId,
  getReversalOriginatorConversationId,
  getReversalResultCode,
  getReversalResultDesc,
  getReversalResultParam,
  getReversalTransactionId,
} from './mpesa/reversal'

// ── 18. Bill Manager ──────────────────────────────────────────────────────────
export type {
  BillManagerBulkInvoiceRequest,
  BillManagerBulkInvoiceResponse,
  BillManagerCancelBulkInvoiceRequest,
  BillManagerCancelBulkInvoiceResponse,
  BillManagerCancelInvoiceRequest,
  BillManagerCancelInvoiceResponse,
  BillManagerInvoiceItem,
  BillManagerOptInRequest,
  BillManagerOptInResponse,
  BillManagerPaymentCallbackResponse,
  BillManagerPaymentNotification,
  BillManagerReconciliationRequest,
  BillManagerReconciliationResponse,
  BillManagerSingleInvoiceRequest,
  BillManagerSingleInvoiceResponse,
  BillManagerUpdateOptInRequest,
  BillManagerUpdateOptInResponse,
} from './mpesa/bill-manager'
export {
  billManagerOptIn,
  cancelBulkInvoices,
  cancelInvoice,
  reconcilePayment,
  sendBulkInvoices,
  sendSingleInvoice,
  updateOptIn,
} from './mpesa/bill-manager'

// ── 19. Dynamic QR ────────────────────────────────────────────────────────────
// FIXED: generateDynamicQR function, QR_TRANSACTION_CODES constant, all
// validators, and extra types were missing in the previous version.
export type {
  DynamicQRDarajaPayload,
  DynamicQRErrorResponse,
  DynamicQRRequest,
  DynamicQRResponse,
  QRTransactionCode,
  ValidationFail,
  ValidationOk,
  ValidationResult,
} from './mpesa/dynamic-qr'
export {
  generateDynamicQR,
  QR_TRANSACTION_CODES,
  DEFAULT_QR_SIZE,
  MAX_QR_SIZE,
  MIN_AMOUNT,
  MIN_QR_SIZE,
  validateAmount,
  validateCpi,
  validateDynamicQRRequest,
  validateMerchantName,
  validateRefNo,
  validateSize,
  validateTrxCode,
} from './mpesa/dynamic-qr'

// ── 20. B2C Disbursement ──────────────────────────────────────────────────────
// FIXED: this entire module was missing from the previous version of src/index.ts.
export type {
  B2CDisbursementCommandID,
  B2CDisbursementErrorResponse,
  B2CDisbursementRequest,
  B2CDisbursementResponse,
  B2CDisbursementResult,
  B2CDisbursementResultCode,
  B2CDisbursementResultParameter,
  B2CDisbursementResultParameterKey,
} from './mpesa/b2c-disbursement'
export {
  initiateB2CDisbursement,
  B2C_DISBURSEMENT_RESULT_CODES,
  getB2CDisbursementAmount,
  getB2CDisbursementCompletedTime,
  getB2CDisbursementConversationId,
  getB2CDisbursementOriginatorConversationId,
  getB2CDisbursementReceiptNumber,
  getB2CDisbursementReceiverName,
  getB2CDisbursementResultCode,
  getB2CDisbursementResultDesc,
  getB2CDisbursementResultParam,
  getB2CDisbursementTransactionId,
  getB2CDisbursementUtilityBalance,
  getB2CDisbursementWorkingBalance,
  isB2CDisbursementFailure,
  isB2CDisbursementRecipientRegistered,
  isB2CDisbursementResult,
  isB2CDisbursementSuccess,
  isKnownB2CDisbursementResultCode,
} from './mpesa/b2c-disbursement'

// ── 21. Webhooks ──────────────────────────────────────────────────────────────
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

// ── 22. HTTP (advanced users) ─────────────────────────────────────────────────
export type { HttpRequestOptions, HttpResponse } from './utils/http'
export { httpRequest } from './utils/http'
