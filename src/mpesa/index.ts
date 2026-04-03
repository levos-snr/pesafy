// 📁 PATH: src/mpesa/index.ts

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
  initiateB2BPayBill as _initiateB2BPayBill,
  type B2BPayBillRequest,
  type B2BPayBillResponse,
} from './b2b-pay-bill'
import { initiateB2CPayment as _initiateB2CPayment, type B2CRequest, type B2CResponse } from './b2c'
import {
  billManagerOptIn as _billManagerOptIn,
  cancelInvoice as _cancelInvoice,
  sendBulkInvoices as _sendBulkInvoices,
  sendSingleInvoice as _sendSingleInvoice,
  type BillManagerBulkInvoiceRequest,
  type BillManagerBulkInvoiceResponse,
  type BillManagerCancelInvoiceRequest,
  type BillManagerCancelInvoiceResponse,
  type BillManagerOptInRequest,
  type BillManagerOptInResponse,
  type BillManagerSingleInvoiceRequest,
  type BillManagerSingleInvoiceResponse,
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
import {
  initiateB2CDisbursement as _initiateB2CDisbursement,
  type B2CDisbursementRequest,
  type B2CDisbursementResponse,
} from './b2c-disbursement'

import { DARAJA_BASE_URLS, type MpesaConfig } from './types'

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

  // ── Safe wrappers — return Result<T> instead of throwing ──────────────────

  /**
   * Like stkPush() but returns Result<T> instead of throwing.
   * Ideal for application-level code that prefers not to use try/catch.
   */
  async stkPushSafe(
    request: Omit<StkPushRequest, 'shortCode' | 'passKey'>,
  ): Promise<Result<Awaited<ReturnType<typeof this.stkPush>>>> {
    try {
      return ok(await this.stkPush(request))
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
    return processStkPush(this.baseUrl, token, {
      ...request,
      shortCode,
      passKey,
    })
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

  /**
   * Queries the balance of your M-PESA shortcode.
   *
   * ASYNCHRONOUS — the sync response is only acknowledgement.
   * Balance data is POSTed to your resultUrl.
   *
   * @example
   * await mpesa.accountBalance({
   *   partyA:          "174379",
   *   identifierType:  "4",
   *   resultUrl:       "https://yourdomain.com/mpesa/balance/result",
   *   queueTimeOutUrl: "https://yourdomain.com/mpesa/balance/timeout",
   * });
   */
  async accountBalance(request: AccountBalanceRequest): Promise<AccountBalanceResponse> {
    const initiator = this.requireInitiator('Account Balance')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return queryAccountBalance(this.baseUrl, token, cred, initiator, request)
  }

  // ── Reversal ───────────────────────────────────────────────────────────────

  /**
   * Reverses a completed M-PESA transaction.
   *
   * ASYNCHRONOUS — reversal result arrives via POST to your resultUrl.
   *
   * @example
   * await mpesa.reverseTransaction({
   *   transactionId:          "OEI2AK4XXXX",
   *   receiverParty:          "174379",
   *   receiverIdentifierType: "4",
   *   amount:                 100,
   *   resultUrl:              "https://yourdomain.com/mpesa/reversal/result",
   *   queueTimeOutUrl:        "https://yourdomain.com/mpesa/reversal/timeout",
   * });
   */
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

  // ── B2B Pay Bill ───────────────────────────────────────────────────────────

  /**
   * Pays a bill from your business account to a Paybill number.
   *
   * Moves money from your MMF/Working account to the recipient's utility account.
   * ASYNCHRONOUS — the sync response is only acknowledgement.
   * The final result arrives via POST to your resultUrl.
   *
   * Requires the "Org Business Pay Bill API initiator" role on M-PESA.
   *
   * @example
   * await mpesa.b2bPayBill({
   *   commandId:        "BusinessPayBill",
   *   amount:           239,
   *   partyA:           "123456",
   *   partyB:           "000000",
   *   accountReference: "INV-353353",
   *   requester:        "254700000000",
   *   remarks:          "Supplier payment",
   *   resultUrl:        "https://yourdomain.com/mpesa/b2b/result",
   *   queueTimeOutUrl:  "https://yourdomain.com/mpesa/b2b/timeout",
   * });
   */
  async b2bPayBill(request: B2BPayBillRequest): Promise<B2BPayBillResponse> {
    const initiator = this.requireInitiator('B2B Pay Bill')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _initiateB2BPayBill(this.baseUrl, token, cred, initiator, request)
  }

  // ── B2C Payment ────────────────────────────────────────────────────────────

  async b2cPayment(request: B2CRequest): Promise<B2CResponse> {
    const initiator = this.requireInitiator('B2C Payment')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _initiateB2CPayment(this.baseUrl, token, cred, initiator, request)
  }

  // ── B2C Payment Disbursement ───────────────────────────────────────────────

  async b2cDisbursement(request: B2CDisbursementRequest): Promise<B2CDisbursementResponse> {
    const initiator = this.requireInitiator('B2C Disbursement')
    const [token, cred] = await Promise.all([this.getToken(), this.buildSecurityCredential()])
    return _initiateB2CDisbursement(this.baseUrl, token, cred, initiator, request)
  }

  // ── Bill Manager ───────────────────────────────────────────────────────────

  /**
   * Opts in a shortcode for Bill Manager.
   *
   * @example
   * await mpesa.billManagerOptIn({
   *   shortcode:        "600984",
   *   email:            "billing@company.com",
   *   officialContact:  "0700000000",
   *   sendReminders:    "1",
   *   callbackUrl:      "https://yourdomain.com/mpesa/bills/callback",
   * });
   */
  async billManagerOptIn(request: BillManagerOptInRequest): Promise<BillManagerOptInResponse> {
    const token = await this.getToken()
    return _billManagerOptIn(this.baseUrl, token, request)
  }

  /**
   * Sends a single invoice via Bill Manager.
   *
   * @example
   * await mpesa.sendInvoice({
   *   externalReference: "INV-001",
   *   billingPeriod:     "2024-01",
   *   invoiceName:       "January Subscription",
   *   dueDate:           "2024-01-31 23:59:00",
   *   accountReference:  "ACC-12345",
   *   amount:            2500,
   *   partyA:            "254712345678",
   * });
   */
  async sendInvoice(
    request: BillManagerSingleInvoiceRequest,
  ): Promise<BillManagerSingleInvoiceResponse> {
    const token = await this.getToken()
    return _sendSingleInvoice(this.baseUrl, token, request)
  }

  /**
   * Sends up to 1 000 invoices in a single bulk request.
   */
  async sendBulkInvoices(
    request: BillManagerBulkInvoiceRequest,
  ): Promise<BillManagerBulkInvoiceResponse> {
    const token = await this.getToken()
    return _sendBulkInvoices(this.baseUrl, token, request)
  }

  /**
   * Cancels a previously issued Bill Manager invoice.
   */
  async cancelInvoice(
    request: BillManagerCancelInvoiceRequest,
  ): Promise<BillManagerCancelInvoiceResponse> {
    const token = await this.getToken()
    return _cancelInvoice(this.baseUrl, token, request)
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /** Force the cached OAuth token to refresh on the next API call. */
  clearTokenCache(): void {
    this.tokenManager.clearCache()
  }

  /** Returns the current environment ("sandbox" | "production") */
  get environment() {
    return this.config.environment
  }
}
