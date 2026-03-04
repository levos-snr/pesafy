/**
 * M-Pesa Daraja API client
 *
 * Supports:
 *   - STK Push (M-Pesa Express)   — stkPush()
 *   - STK Query                   — stkQuery()
 *   - Transaction Status Query    — transactionStatus()
 *   - Dynamic QR Code             — generateDynamicQR()
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

  // ── STK Push ──────────────────────────────────────────────────────────────

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

  // ── Dynamic QR Code ───────────────────────────────────────────────────────

  /**
   * Dynamic QR — generates an M-PESA QR code for LNM merchant payments.
   *
   * Customers scan the code with My Safaricom App or M-PESA app to
   * capture the till/paybill number and amount, then authorize payment.
   *
   * @example
   * const res = await mpesa.generateDynamicQR({
   *   merchantName: "My Shop",
   *   refNo:        "INV-001",
   *   amount:       500,
   *   trxCode:      "BG",   // Buy Goods (till number)
   *   cpi:          "373132",
   *   size:         300,
   * });
   *
   * // res.QRCode is a base64-encoded PNG — render in an <img> tag:
   * // <img src={`data:image/png;base64,${res.QRCode}`} />
   */
  async generateDynamicQR(
    request: DynamicQRRequest
  ): Promise<DynamicQRResponse> {
    const token = await this.getToken();
    return _generateDynamicQR(this.baseUrl, token, request);
  }

  /** Force the cached OAuth token to be refreshed on the next API call */
  clearTokenCache(): void {
    this.tokenManager.clearCache();
  }
}
