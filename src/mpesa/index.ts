/**
 * M-Pesa Daraja API client
 *
 * Supports:
 *   - STK Push (M-Pesa Express)             — stkPush()
 *   - STK Query                             — stkQuery()
 *   - Transaction Status Query              — transactionStatus()
 *   - Dynamic QR Code                       — generateDynamicQR()
 *   - C2B Register URL                      — registerC2BUrls()
 *   - C2B Simulate (sandbox only)           — simulateC2B()
 *   - Tax Remittance (KRA)                  — remitTax()
 *   - B2B Express Checkout (USSD Push)      — b2bExpressCheckout()
 *   - B2C Payment / Account Top Up         — b2cPayment()
 *
 * @example
 * const mpesa = new Mpesa({
 *   consumerKey:           process.env.MPESA_CONSUMER_KEY!,
 *   consumerSecret:        process.env.MPESA_CONSUMER_SECRET!,
 *   environment:           "sandbox",
 *   lipaNaMpesaShortCode:  "174379",
 *   lipaNaMpesaPassKey:    "bfb279...",
 *   initiatorName:         "testapi",
 *   initiatorPassword:     "Safaricom123!",
 *   certificatePath:       "./SandboxCertificate.cer",
 * });
 */

import { TokenManager } from "../core/auth";
import { encryptSecurityCredential } from "../core/encryption";
import { PesafyError } from "../utils/errors";
import {
  initiateB2BExpressCheckout as _initiateB2BExpressCheckout,
  type B2BExpressCheckoutRequest,
  type B2BExpressCheckoutResponse,
} from "./b2b-express-checkout";
import {
  initiateB2CPayment as _initiateB2CPayment,
  type B2CRequest,
  type B2CResponse,
} from "./b2c";
import {
  registerC2BUrls as _registerC2BUrls,
  simulateC2B as _simulateC2B,
  type C2BRegisterUrlRequest,
  type C2BRegisterUrlResponse,
  type C2BSimulateRequest,
  type C2BSimulateResponse,
} from "./c2b";
import {
  generateDynamicQR as _generateDynamicQR,
  type DynamicQRRequest,
  type DynamicQRResponse,
} from "./dynamic-qr";
import {
  processStkPush,
  queryStkPush,
  type StkPushRequest,
  type StkQueryRequest,
} from "./stk-push";
import {
  remitTax as _remitTax,
  type TaxRemittanceRequest,
  type TaxRemittanceResponse,
} from "./tax-remittance";
import {
  queryTransactionStatus,
  type TransactionStatusRequest,
} from "./transaction-status";
import { DARAJA_BASE_URLS, type MpesaConfig } from "./types";

export class Mpesa {
  private readonly config: MpesaConfig;
  private readonly tokenManager: TokenManager;
  private readonly baseUrl: string;

  constructor(config: MpesaConfig) {
    if (!config.consumerKey || !config.consumerSecret) {
      throw new PesafyError({
        code: "INVALID_CREDENTIALS",
        message: "consumerKey and consumerSecret are required",
      });
    }

    this.config = config;
    this.baseUrl = DARAJA_BASE_URLS[config.environment];
    this.tokenManager = new TokenManager(
      config.consumerKey,
      config.consumerSecret,
      this.baseUrl
    );
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private getToken(): Promise<string> {
    return this.tokenManager.getAccessToken();
  }

  private async buildSecurityCredential(): Promise<string> {
    if (this.config.securityCredential) return this.config.securityCredential;

    if (!this.config.initiatorPassword) {
      throw new PesafyError({
        code: "INVALID_CREDENTIALS",
        message:
          "Provide securityCredential (pre-encrypted) " +
          "OR (initiatorPassword + certificatePath/certificatePem)",
      });
    }

    let cert: string;
    if (this.config.certificatePem) {
      cert = this.config.certificatePem;
    } else if (this.config.certificatePath) {
      if (typeof Bun !== "undefined") {
        cert = await Bun.file(this.config.certificatePath).text();
      } else {
        const { readFile } = await import("node:fs/promises");
        cert = await readFile(this.config.certificatePath, "utf-8");
      }
    } else {
      throw new PesafyError({
        code: "INVALID_CREDENTIALS",
        message:
          "certificatePath or certificatePem required to encrypt the initiator password",
      });
    }

    return encryptSecurityCredential(this.config.initiatorPassword, cert);
  }

  // ── STK Push ───────────────────────────────────────────────────────────────

  /**
   * M-Pesa Express — sends a payment prompt to the customer's phone.
   *
   * Requires: lipaNaMpesaShortCode + lipaNaMpesaPassKey in config.
   *
   * @example
   * const res = await mpesa.stkPush({
   *   amount:           100,
   *   phoneNumber:      "0712345678",
   *   callbackUrl:      "https://yourdomain.com/mpesa/callback",
   *   accountReference: "INV-001",
   *   transactionDesc:  "Payment",
   * });
   * console.log(res.CheckoutRequestID);
   */
  async stkPush(request: Omit<StkPushRequest, "shortCode" | "passKey">) {
    const shortCode = this.config.lipaNaMpesaShortCode ?? "";
    const passKey = this.config.lipaNaMpesaPassKey ?? "";

    if (!shortCode || !passKey) {
      throw new PesafyError({
        code: "VALIDATION_ERROR",
        message:
          "lipaNaMpesaShortCode and lipaNaMpesaPassKey are required for STK Push",
      });
    }

    const token = await this.getToken();
    return processStkPush(this.baseUrl, token, {
      ...request,
      shortCode,
      passKey,
    });
  }

  /**
   * STK Query — checks the status of a previous STK Push.
   *
   * @example
   * const status = await mpesa.stkQuery({
   *   checkoutRequestId: "ws_CO_1007202409152617172396192",
   * });
   * if (status.ResultCode === 0) // payment confirmed
   */
  async stkQuery(request: Omit<StkQueryRequest, "shortCode" | "passKey">) {
    const shortCode = this.config.lipaNaMpesaShortCode ?? "";
    const passKey = this.config.lipaNaMpesaPassKey ?? "";

    if (!shortCode || !passKey) {
      throw new PesafyError({
        code: "VALIDATION_ERROR",
        message:
          "lipaNaMpesaShortCode and lipaNaMpesaPassKey are required for STK Query",
      });
    }

    const token = await this.getToken();
    return queryStkPush(this.baseUrl, token, {
      ...request,
      shortCode,
      passKey,
    });
  }

  // ── Transaction Status ─────────────────────────────────────────────────────

  /**
   * Transaction Status — queries the result of a completed M-Pesa transaction.
   *
   * Requires: initiatorName + (initiatorPassword + certificate) OR securityCredential.
   *
   * This is ASYNCHRONOUS. The synchronous response only confirms receipt.
   * Final details are POSTed to your resultUrl.
   *
   * @example
   * await mpesa.transactionStatus({
   *   transactionId:   "OEI2AK4XXXX",
   *   partyA:          "174379",
   *   identifierType:  "4",
   *   resultUrl:       "https://yourdomain.com/mpesa/result",
   *   queueTimeOutUrl: "https://yourdomain.com/mpesa/timeout",
   *   remarks:         "Check payment status",
   * });
   */
  async transactionStatus(request: TransactionStatusRequest) {
    const initiator = this.config.initiatorName ?? "";
    if (!initiator) {
      throw new PesafyError({
        code: "VALIDATION_ERROR",
        message: "initiatorName is required for Transaction Status",
      });
    }

    const [token, securityCred] = await Promise.all([
      this.getToken(),
      this.buildSecurityCredential(),
    ]);

    return queryTransactionStatus(
      this.baseUrl,
      token,
      securityCred,
      initiator,
      request
    );
  }

  // ── Dynamic QR Code ────────────────────────────────────────────────────────

  /**
   * Dynamic QR — generates an M-PESA QR code for LNM merchant payments.
   *
   * @example
   * const res = await mpesa.generateDynamicQR({
   *   merchantName: "My Shop",
   *   refNo:        "INV-001",
   *   amount:       500,
   *   trxCode:      "BG",
   *   cpi:          "373132",
   *   size:         300,
   * });
   * // <img src={`data:image/png;base64,${res.QRCode}`} />
   */
  async generateDynamicQR(
    request: DynamicQRRequest
  ): Promise<DynamicQRResponse> {
    const token = await this.getToken();
    return _generateDynamicQR(this.baseUrl, token, request);
  }

  // ── C2B Register URL ───────────────────────────────────────────────────────

  /**
   * Registers your Confirmation and Validation URLs with M-PESA.
   *
   * @example
   * await mpesa.registerC2BUrls({
   *   shortCode:       "600984",
   *   responseType:    "Completed",
   *   confirmationUrl: "https://yourdomain.com/mpesa/c2b/confirmation",
   *   validationUrl:   "https://yourdomain.com/mpesa/c2b/validation",
   *   apiVersion:      "v2",
   * });
   */
  async registerC2BUrls(
    request: C2BRegisterUrlRequest
  ): Promise<C2BRegisterUrlResponse> {
    const token = await this.getToken();
    return _registerC2BUrls(this.baseUrl, token, request);
  }

  // ── C2B Simulate (Sandbox ONLY) ────────────────────────────────────────────

  /**
   * Simulates a C2B customer payment. SANDBOX ONLY.
   *
   * @example
   * await mpesa.simulateC2B({
   *   shortCode:     600984,
   *   commandId:     "CustomerPayBillOnline",
   *   amount:        10,
   *   msisdn:        254708374149,
   *   billRefNumber: "INV-001",
   *   apiVersion:    "v2",
   * });
   */
  async simulateC2B(request: C2BSimulateRequest): Promise<C2BSimulateResponse> {
    const token = await this.getToken();
    return _simulateC2B(this.baseUrl, token, request);
  }

  // ── Tax Remittance ─────────────────────────────────────────────────────────

  /**
   * Tax Remittance — remits tax to Kenya Revenue Authority (KRA) via M-PESA.
   *
   * Requires: initiatorName + certificate (or pre-computed securityCredential).
   *
   * @example
   * await mpesa.remitTax({
   *   amount:           5000,
   *   partyA:           "888880",
   *   accountReference: "PRN1234XN",
   *   resultUrl:        "https://yourdomain.com/mpesa/tax/result",
   *   queueTimeOutUrl:  "https://yourdomain.com/mpesa/tax/timeout",
   *   remarks:          "Monthly PAYE remittance",
   * });
   */
  async remitTax(
    request: TaxRemittanceRequest
  ): Promise<TaxRemittanceResponse> {
    const initiator = this.config.initiatorName ?? "";
    if (!initiator) {
      throw new PesafyError({
        code: "VALIDATION_ERROR",
        message: "initiatorName is required for Tax Remittance",
      });
    }

    const [token, securityCred] = await Promise.all([
      this.getToken(),
      this.buildSecurityCredential(),
    ]);

    return _remitTax(this.baseUrl, token, securityCred, initiator, request);
  }

  // ── B2B Express Checkout ───────────────────────────────────────────────────

  /**
   * B2B Express Checkout — initiates a USSD Push to a merchant's till.
   *
   * @example
   * const res = await mpesa.b2bExpressCheckout({
   *   primaryShortCode:  "000001",
   *   receiverShortCode: "000002",
   *   amount:            5000,
   *   paymentRef:        "INV-001",
   *   callbackUrl:       "https://yourdomain.com/mpesa/b2b/callback",
   *   partnerName:       "My Vendor Co.",
   * });
   */
  async b2bExpressCheckout(
    request: B2BExpressCheckoutRequest
  ): Promise<B2BExpressCheckoutResponse> {
    const token = await this.getToken();
    return _initiateB2BExpressCheckout(this.baseUrl, token, request);
  }

  // ── B2C Payment ────────────────────────────────────────────────────────────

  /**
   * B2C Payment — sends money from a business to customers, or loads funds
   * to a B2C shortcode for bulk disbursement.
   *
   * Requires: initiatorName + (initiatorPassword + certificate) OR securityCredential.
   * The initiator must have the appropriate role for the chosen CommandID.
   *
   * This is ASYNCHRONOUS. The synchronous response only confirms receipt.
   * Final details are POSTed to your resultUrl.
   *
   * CommandID options:
   *   "BusinessPayToBulk"  — Load funds to a B2C shortcode (Account Top Up)
   *   "BusinessPayment"    — Direct unsecured payment to a customer
   *   "SalaryPayment"      — Salary disbursement to a customer
   *   "PromotionPayment"   — Promotion/bonus payment to a customer
   *
   * Required M-PESA org portal roles:
   *   BusinessPayToBulk  → "Org Business Pay to Bulk API initiator"
   *   BusinessPayment    → "Org Business Payment API initiator"
   *   SalaryPayment      → "Org Salary Payment API initiator"
   *   PromotionPayment   → "Org Promotion Payment API initiator"
   *
   * @example
   * // B2C Account Top Up (load funds to B2C shortcode)
   * await mpesa.b2cPayment({
   *   commandId:        "BusinessPayToBulk",
   *   amount:           10000,
   *   partyA:           "600979",
   *   partyB:           "600000",
   *   accountReference: "BATCH-001",
   *   resultUrl:        "https://yourdomain.com/mpesa/b2c/result",
   *   queueTimeOutUrl:  "https://yourdomain.com/mpesa/b2c/timeout",
   *   remarks:          "Monthly salary batch load",
   * });
   *
   * @example
   * // Direct customer payment
   * await mpesa.b2cPayment({
   *   commandId:        "SalaryPayment",
   *   amount:           5000,
   *   partyA:           "600979",
   *   partyB:           "254712345678",
   *   accountReference: "SAL-JAN-2024",
   *   requester:        "254712345678",
   *   resultUrl:        "https://yourdomain.com/mpesa/b2c/result",
   *   queueTimeOutUrl:  "https://yourdomain.com/mpesa/b2c/timeout",
   *   remarks:          "January salary",
   * });
   */
  async b2cPayment(request: B2CRequest): Promise<B2CResponse> {
    const initiator = this.config.initiatorName ?? "";
    if (!initiator) {
      throw new PesafyError({
        code: "VALIDATION_ERROR",
        message: "initiatorName is required for B2C Payment",
      });
    }

    const [token, securityCred] = await Promise.all([
      this.getToken(),
      this.buildSecurityCredential(),
    ]);

    return _initiateB2CPayment(
      this.baseUrl,
      token,
      securityCred,
      initiator,
      request
    );
  }

  /** Force the cached OAuth token to be refreshed on the next API call */
  clearTokenCache(): void {
    this.tokenManager.clearCache();
  }
}
