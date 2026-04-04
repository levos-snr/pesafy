/**
 * src/mpesa/index.ts
 *
 * Primary M-PESA module entry point.
 *
 * Exports:
 *   1. Mpesa class — the main SDK client
 *   2. All submodule APIs, types, constants, and helpers
 *
 * Submodules re-exported here:
 *   - account-balance
 *   - b2b-buy-goods
 *   - b2b-express-checkout
 *   - b2b-pay-bill
 *   - b2c (Account Top Up)
 *   - b2c-disbursement
 *   - bill-manager
 *   - c2b
 *   - dynamic-qr
 *   - reversal
 *   - stk-push
 *   - tax-remittance
 *   - transaction-status
 *   - webhooks
 */

import { readFile } from 'node:fs/promises'
import { TokenManager } from '../core/auth'
import { encryptSecurityCredential } from '../core/encryption'
import { PesafyError } from '../utils/errors'
import { err, ok, type Result } from '../types/branded'

import {
  queryAccountBalance,
  type AccountBalanceRequest,
  type AccountBalanceResponse,
} from './account-balance'
import {
  initiateB2BExpressCheckout as _initiateB2BExpressCheckout,
  type B2BExpressCheckoutRequest,
  type B2BExpressCheckoutResponse,
} from './b2b-express-checkout'
import {
  initiateB2BBuyGoods as _initiateB2BBuyGoods,
  type B2BBuyGoodsRequest,
  type B2BBuyGoodsResponse,
} from './b2b-buy-goods'
import {
  initiateB2BPayBill as _initiateB2BPayBill,
  type B2BPayBillRequest,
  type B2BPayBillResponse,
} from './b2b-pay-bill'
import { initiateB2CPayment as _initiateB2CPayment, type B2CRequest, type B2CResponse } from './b2c'
import {
  initiateB2CDisbursement as _initiateB2CDisbursement,
  type B2CDisbursementRequest,
  type B2CDisbursementResponse,
} from './b2c-disbursement'
import {
  billManagerOptIn as _billManagerOptIn,
  cancelBulkInvoices as _cancelBulkInvoices,
  cancelInvoice as _cancelInvoice,
  reconcilePayment as _reconcilePayment,
  sendBulkInvoices as _sendBulkInvoices,
  sendSingleInvoice as _sendSingleInvoice,
  updateOptIn as _updateOptIn,
  type BillManagerBulkInvoiceRequest,
  type BillManagerBulkInvoiceResponse,
  type BillManagerCancelBulkInvoiceRequest,
  type BillManagerCancelBulkInvoiceResponse,
  type BillManagerCancelInvoiceRequest,
  type BillManagerCancelInvoiceResponse,
  type BillManagerOptInRequest,
  type BillManagerOptInResponse,
  type BillManagerReconciliationRequest,
  type BillManagerReconciliationResponse,
  type BillManagerSingleInvoiceRequest,
  type BillManagerSingleInvoiceResponse,
  type BillManagerUpdateOptInRequest,
  type BillManagerUpdateOptInResponse,
} from './bill-manager'
import {
  registerC2BUrls as _registerC2BUrls,
  simulateC2B as _simulateC2B,
  type C2BRegisterUrlRequest,
  type C2BRegisterUrlResponse,
  type C2BSimulateRequest,
  type C2BSimulateResponse,
} from './c2b'
import {
  generateDynamicQR as _generateDynamicQR,
  type DynamicQRRequest,
  type DynamicQRResponse,
} from './dynamic-qr'
import { requestReversal, type ReversalRequest, type ReversalResponse } from './reversal'
import { processStkPush, queryStkPush, type StkPushRequest, type StkQueryRequest } from './stk-push'
import {
  remitTax as _remitTax,
  type TaxRemittanceRequest,
  type TaxRemittanceResponse,
} from './tax-remittance'
import { queryTransactionStatus, type TransactionStatusRequest } from './transaction-status'

import { DARAJA_BASE_URLS, type MpesaConfig } from './types'

// ── Mpesa client ──────────────────────────────────────────────────────────────

export class Mpesa {
  private readonly config: MpesaConfig
  private readonly tokenManager: TokenManager
  private readonly baseUrl: string

  constructor(config: MpesaConfig) {
    if (!config.consumerKey || !config.consumerSecret) {
      throw new PesafyError({
        code: 'INVALID_CREDENTIALS',
        message: 'consumerKey and consumerSecret are required.',
      })
    }
    this.config = config
    this.baseUrl = DARAJA_BASE_URLS[config.environment]
    this.tokenManager = new TokenManager(config.consumerKey, config.consumerSecret, this.baseUrl)
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private getToken(): Promise<string> {
    return this.tokenManager.getAccessToken()
  }

  private async buildSecurityCredential(): Promise<string> {
    if (this.config.securityCredential) return this.config.securityCredential

    if (!this.config.initiatorPassword) {
      throw new PesafyError({
        code: 'INVALID_CREDENTIALS',
        message:
          'Provide securityCredential (pre-encrypted) ' +
          'OR (initiatorPassword + certificatePath/certificatePem).',
      })
    }

    let cert: string
    if (this.config.certificatePem) {
      cert = this.config.certificatePem
    } else if (this.config.certificatePath) {
      cert = await readFile(this.config.certificatePath, 'utf-8')
    } else {
      throw new PesafyError({
        code: 'INVALID_CREDENTIALS',
        message: 'certificatePath or certificatePem is required to encrypt the initiator password.',
      })
    }
    return encryptSecurityCredential(this.config.initiatorPassword, cert)
  }

  private requireInitiator(forApi: string): string {
    const name = this.config.initiatorName ?? ''
    if (!name) {
      throw new PesafyError({
        code: 'VALIDATION_ERROR',
        message: `initiatorName is required for ${forApi}.`,
      })
    }
    return name
  }

  // ── Safe wrappers ──────────────────────────────────────────────────────────

  async stkPushSafe(
    request: Omit<StkPushRequest, 'shortCode' | 'passKey'>,
  ): Promise<Result<Awaited<ReturnType<typeof this.stkPush>>>> {
    try {
      return ok(await this.stkPush(request))
    } catch (e) {
      return err(e as PesafyError)
    }
  }

  async accountBalanceSafe(
    request: AccountBalanceRequest,
  ): Promise<Result<AccountBalanceResponse>> {
    try {
      return ok(await this.accountBalance(request))
    } catch (e) {
      return err(e as PesafyError)
    }
  }

  // ── STK Push ───────────────────────────────────────────────────────────────

  async stkPush(request: Omit<StkPushRequest, 'shortCode' | 'passKey'>) {
    const shortCode = this.config.lipaNaMpesaShortCode ?? ''
    const passKey = this.config.lipaNaMpesaPassKey ?? ''

    if (!shortCode || !passKey) {
      throw new PesafyError({
        code: 'VALIDATION_ERROR',
        message: 'lipaNaMpesaShortCode and lipaNaMpesaPassKey are required for STK Push.',
      })
    }

    const token = await this.getToken()
    return processStkPush(this.baseUrl, token, { ...request, shortCode, passKey })
  }

  async stkQuery(request: Omit<StkQueryRequest, 'shortCode' | 'passKey'>) {
    const shortCode = this.config.lipaNaMpesaShortCode ?? ''
    const passKey = this.config.lipaNaMpesaPassKey ?? ''

    if (!shortCode || !passKey) {
      throw new PesafyError({
        code: 'VALIDATION_ERROR',
        message: 'lipaNaMpesaShortCode and lipaNaMpesaPassKey are required for STK Query.',
      })
    }

    const token = await this.getToken()
    return queryStkPush(this.baseUrl, token, { ...request, shortCode, passKey })
  }

  // ── Transaction Status ─────────────────────────────────────────────────────

  async transactionStatus(request: TransactionStatusRequest) {
    const initiator = this.requireInitiator('Transaction Status')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return queryTransactionStatus(this.baseUrl, token, cred, initiator, request)
  }

  // ── Account Balance ────────────────────────────────────────────────────────

  async accountBalance(request: AccountBalanceRequest): Promise<AccountBalanceResponse> {
    const initiator = this.requireInitiator('Account Balance')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return queryAccountBalance(this.baseUrl, token, cred, initiator, request)
  }

  // ── Reversal ───────────────────────────────────────────────────────────────

  async reverseTransaction(request: ReversalRequest): Promise<ReversalResponse> {
    const initiator = this.requireInitiator('Reversal')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return requestReversal(this.baseUrl, token, cred, initiator, request)
  }

  // ── Dynamic QR ─────────────────────────────────────────────────────────────

  async generateDynamicQR(request: DynamicQRRequest): Promise<DynamicQRResponse> {
    const token = await this.getToken()
    return _generateDynamicQR(this.baseUrl, token, request)
  }

  // ── C2B ────────────────────────────────────────────────────────────────────

  async registerC2BUrls(request: C2BRegisterUrlRequest): Promise<C2BRegisterUrlResponse> {
    const token = await this.getToken()
    return _registerC2BUrls(this.baseUrl, token, request)
  }

  async simulateC2B(request: C2BSimulateRequest): Promise<C2BSimulateResponse> {
    const token = await this.getToken()
    return _simulateC2B(this.baseUrl, token, request)
  }

  // ── Tax Remittance ─────────────────────────────────────────────────────────

  async remitTax(request: TaxRemittanceRequest): Promise<TaxRemittanceResponse> {
    const initiator = this.requireInitiator('Tax Remittance')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _remitTax(this.baseUrl, token, cred, initiator, request)
  }

  // ── B2B Express Checkout ───────────────────────────────────────────────────

  async b2bExpressCheckout(
    request: B2BExpressCheckoutRequest,
  ): Promise<B2BExpressCheckoutResponse> {
    const token = await this.getToken()
    return _initiateB2BExpressCheckout(this.baseUrl, token, request)
  }

  // ── B2B Buy Goods ──────────────────────────────────────────────────────────

  async b2bBuyGoods(request: B2BBuyGoodsRequest): Promise<B2BBuyGoodsResponse> {
    const initiator = this.requireInitiator('B2B Buy Goods')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _initiateB2BBuyGoods(this.baseUrl, token, cred, initiator, request)
  }

  // ── B2B Pay Bill ───────────────────────────────────────────────────────────

  async b2bPayBill(request: B2BPayBillRequest): Promise<B2BPayBillResponse> {
    const initiator = this.requireInitiator('B2B Pay Bill')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _initiateB2BPayBill(this.baseUrl, token, cred, initiator, request)
  }

  // ── B2C Payment (Account Top Up) ──────────────────────────────────────────

  async b2cPayment(request: B2CRequest): Promise<B2CResponse> {
    const initiator = this.requireInitiator('B2C Payment')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _initiateB2CPayment(this.baseUrl, token, cred, initiator, request)
  }

  // ── B2C Disbursement ───────────────────────────────────────────────────────

  async b2cDisbursement(request: B2CDisbursementRequest): Promise<B2CDisbursementResponse> {
    const initiator = this.requireInitiator('B2C Disbursement')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _initiateB2CDisbursement(this.baseUrl, token, cred, initiator, request)
  }

  // ── Bill Manager ───────────────────────────────────────────────────────────

  async billManagerOptIn(request: BillManagerOptInRequest): Promise<BillManagerOptInResponse> {
    const token = await this.getToken()
    return _billManagerOptIn(this.baseUrl, token, request)
  }

  async updateOptIn(
    request: BillManagerUpdateOptInRequest,
  ): Promise<BillManagerUpdateOptInResponse> {
    const token = await this.getToken()
    return _updateOptIn(this.baseUrl, token, request)
  }

  async sendInvoice(
    request: BillManagerSingleInvoiceRequest,
  ): Promise<BillManagerSingleInvoiceResponse> {
    const token = await this.getToken()
    return _sendSingleInvoice(this.baseUrl, token, request)
  }

  async sendBulkInvoices(
    request: BillManagerBulkInvoiceRequest,
  ): Promise<BillManagerBulkInvoiceResponse> {
    const token = await this.getToken()
    return _sendBulkInvoices(this.baseUrl, token, request)
  }

  async cancelInvoice(
    request: BillManagerCancelInvoiceRequest,
  ): Promise<BillManagerCancelInvoiceResponse> {
    const token = await this.getToken()
    return _cancelInvoice(this.baseUrl, token, request)
  }

  async cancelBulkInvoices(
    request: BillManagerCancelBulkInvoiceRequest,
  ): Promise<BillManagerCancelBulkInvoiceResponse> {
    const token = await this.getToken()
    return _cancelBulkInvoices(this.baseUrl, token, request)
  }

  async reconcilePayment(
    request: BillManagerReconciliationRequest,
  ): Promise<BillManagerReconciliationResponse> {
    const token = await this.getToken()
    return _reconcilePayment(this.baseUrl, token, request)
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  clearTokenCache(): void {
    this.tokenManager.clearCache()
  }

  get environment() {
    return this.config.environment
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SUBMODULE RE-EXPORTS
// All public APIs from every M-PESA submodule are re-exported here so that
// consumers can import directly from 'pesafy/mpesa' (if that path is added to
// package.json exports) or so that src/index.ts can barrel from one place.
// ══════════════════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────────────────
export type { Environment, MpesaConfig } from './types'
export { DARAJA_BASE_URLS } from './types'

// ── Account Balance ───────────────────────────────────────────────────────────
export { queryAccountBalance } from './account-balance'
export {
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
} from './account-balance'
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
} from './account-balance'

// ── B2B Buy Goods ─────────────────────────────────────────────────────────────
export { initiateB2BBuyGoods } from './b2b-buy-goods'
export {
  B2B_BUY_GOODS_ERROR_CODES,
  B2B_BUY_GOODS_RESULT_CODES,
  isB2BBuyGoodsResult,
  isB2BBuyGoodsSuccess,
  isB2BBuyGoodsFailure,
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
} from './b2b-buy-goods'
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
} from './b2b-buy-goods'

// ── B2B Express Checkout ──────────────────────────────────────────────────────
export { initiateB2BExpressCheckout } from './b2b-express-checkout'
export {
  B2B_RESULT_CODES,
  getB2BAmount,
  getB2BConversationId,
  getB2BPaymentReference,
  getB2BRequestId,
  getB2BResultCode,
  getB2BResultDesc,
  getB2BTransactionId,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutFailed,
  isB2BCheckoutSuccess,
  isB2BStatusSuccess,
  isKnownB2BResultCode,
} from './b2b-express-checkout'
export type {
  B2BExpressCheckoutCallback,
  B2BExpressCheckoutCallbackCancelled,
  B2BExpressCheckoutCallbackFailed,
  B2BExpressCheckoutCallbackSuccess,
  B2BExpressCheckoutErrorCode,
  B2BExpressCheckoutErrorResponse,
  B2BExpressCheckoutRequest,
  B2BExpressCheckoutResponse,
  B2BResultCode,
} from './b2b-express-checkout'

// ── B2B Pay Bill ──────────────────────────────────────────────────────────────
export { initiateB2BPayBill } from './b2b-pay-bill'
export {
  B2B_PAY_BILL_ERROR_CODES,
  B2B_PAY_BILL_RESULT_CODES,
  isB2BPayBillResult,
  isB2BPayBillSuccess,
  isB2BPayBillFailure,
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
} from './b2b-pay-bill'
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
} from './b2b-pay-bill'

// ── B2C Account Top Up ────────────────────────────────────────────────────────
export { initiateB2CPayment } from './b2c'
export {
  B2C_ERROR_CODES,
  B2C_RESULT_CODES,
  getB2CAmount,
  getB2CCurrency,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
  getB2CConversationId,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CResultDesc,
  getB2CResultParam,
  getB2CTransactionCompletedTime,
  getB2CTransactionId,
  isB2CFailure,
  isB2CResult,
  isB2CSuccess,
  isKnownB2CResultCode,
} from './b2c'
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
} from './b2c'

// ── B2C Disbursement ──────────────────────────────────────────────────────────
export { initiateB2CDisbursement } from './b2c-disbursement'
export {
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
} from './b2c-disbursement'
export type {
  B2CDisbursementCommandID,
  B2CDisbursementErrorResponse,
  B2CDisbursementRequest,
  B2CDisbursementResponse,
  B2CDisbursementResult,
  B2CDisbursementResultCode,
  B2CDisbursementResultParameter,
  B2CDisbursementResultParameterKey,
} from './b2c-disbursement'

// ── Bill Manager ──────────────────────────────────────────────────────────────
export {
  billManagerOptIn,
  updateOptIn,
  sendSingleInvoice,
  sendBulkInvoices,
  cancelInvoice,
  cancelBulkInvoices,
  reconcilePayment,
} from './bill-manager'
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
} from './bill-manager'

// ── C2B ───────────────────────────────────────────────────────────────────────
export { registerC2BUrls, simulateC2B } from './c2b'
export {
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
} from './c2b'
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
} from './c2b'

// ── Dynamic QR ────────────────────────────────────────────────────────────────
export { generateDynamicQR } from './dynamic-qr'
export {
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
} from './dynamic-qr'
export type {
  DynamicQRDarajaPayload,
  DynamicQRErrorResponse,
  DynamicQRRequest,
  DynamicQRResponse,
  QRTransactionCode,
  ValidationFail,
  ValidationOk,
  ValidationResult,
} from './dynamic-qr'

// ── Reversal ──────────────────────────────────────────────────────────────────
export { requestReversal } from './reversal'
export {
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
} from './reversal'
export type {
  ReversalErrorCode,
  ReversalRequest,
  ReversalResponse,
  ReversalResult,
  ReversalResultCode,
  ReversalResultParameter,
  ReversalResultParameterKey,
} from './reversal'

// ── STK Push ──────────────────────────────────────────────────────────────────
export { processStkPush } from './stk-push'
export { queryStkPush } from './stk-push'
export {
  STK_PUSH_LIMITS,
  STK_RESULT_CODES,
  isKnownStkResultCode,
  isStkCallbackSuccess,
  getCallbackValue,
} from './stk-push'
export { formatPhoneNumber, getTimestamp } from './stk-push'
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
} from './stk-push'

// ── Tax Remittance ────────────────────────────────────────────────────────────
export { KRA_SHORTCODE, remitTax, TAX_COMMAND_ID } from './tax-remittance'
export {
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
} from './tax-remittance'
export type {
  TaxRemittanceErrorResponse,
  TaxRemittanceRequest,
  TaxRemittanceResponse,
  TaxRemittanceResult,
  TaxRemittanceResultParameter,
  TaxRemittanceResultParameterKey,
} from './tax-remittance'

// ── Transaction Status ────────────────────────────────────────────────────────
export { queryTransactionStatus } from './transaction-status'
export {
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
} from './transaction-status'
export type {
  TransactionStatusErrorCode,
  TransactionStatusRequest,
  TransactionStatusResponse,
  TransactionStatusResult,
  TransactionStatusResultCode,
  TransactionStatusResultParameter,
  TransactionStatusResultParameterKey,
} from './transaction-status'

// ── Webhooks ──────────────────────────────────────────────────────────────────
export {
  retryWithBackoff,
  parseStkPushWebhook,
  SAFARICOM_IPS,
  verifyWebhookIP,
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,
} from './webhooks'
export type {
  RetryOptions,
  RetryResult,
  StkPushWebhook,
  WebhookEvent,
  WebhookEventType,
  WebhookHandlerOptions,
  WebhookHandlerResult,
} from './webhooks'
