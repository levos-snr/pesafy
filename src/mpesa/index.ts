/**
 * M-Pesa Daraja API client
 */

import { TokenManager } from "../core/auth";
import { encryptSecurityCredential } from "../core/encryption";
import { type B2BRequest, processB2B } from "./b2b";
import { type B2CRequest, processB2C } from "./b2c";
import {
  type C2BRegisterUrlRequest,
  type C2BSimulateRequest,
  registerC2BUrls,
  simulateC2B,
} from "./c2b";
import { type DynamicQRRequest, generateDynamicQR } from "./qr-code";
import { processReversal, type ReversalRequest } from "./reversal";
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
  private config: MpesaConfig;
  private tokenManager: TokenManager;
  private baseUrl: string;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl = DARAJA_BASE_URLS[config.environment];
    this.tokenManager = new TokenManager(
      config.consumerKey,
      config.consumerSecret,
      this.baseUrl
    );
  }

  private async getToken(): Promise<string> {
    return this.tokenManager.getAccessToken();
  }

  private async getSecurityCredential(): Promise<string> {
    if (this.config.securityCredential) return this.config.securityCredential;
    if (!this.config.initiatorPassword) {
      throw new Error(
        "Security credential required: provide securityCredential or (initiatorPassword + certificatePath/certificatePem)"
      );
    }
    let cert: string;
    if (this.config.certificatePem) {
      cert = this.config.certificatePem;
    } else if (this.config.certificatePath) {
      cert = await Bun.file(this.config.certificatePath).text();
    } else {
      throw new Error(
        "certificatePath or certificatePem required for B2C/B2B/Reversal"
      );
    }
    return encryptSecurityCredential(this.config.initiatorPassword, cert);
  }

  /** STK Push (M-Pesa Express) - Initiate payment on customer phone */
  async stkPush(request: Omit<StkPushRequest, "shortCode" | "passKey">) {
    const shortCode = this.config.lipaNaMpesaShortCode ?? "";
    const passKey = this.config.lipaNaMpesaPassKey ?? "";
    if (!shortCode || !passKey) {
      throw new Error(
        "lipaNaMpesaShortCode and lipaNaMpesaPassKey required for STK Push"
      );
    }
    const token = await this.getToken();
    return processStkPush(this.baseUrl, token, {
      ...request,
      shortCode,
      passKey,
    });
  }

  /** STK Query - Check STK Push transaction status */
  async stkQuery(request: Omit<StkQueryRequest, "shortCode" | "passKey">) {
    const shortCode = this.config.lipaNaMpesaShortCode ?? "";
    const passKey = this.config.lipaNaMpesaPassKey ?? "";
    if (!shortCode || !passKey) {
      throw new Error(
        "lipaNaMpesaShortCode and lipaNaMpesaPassKey required for STK Query"
      );
    }
    const token = await this.getToken();
    return queryStkPush(this.baseUrl, token, {
      ...request,
      shortCode,
      passKey,
    });
  }

  /** B2C - Send money to customer */
  async b2c(request: B2CRequest) {
    const initiator = this.config.initiatorName ?? "";
    const securityCred = await this.getSecurityCredential();
    if (!initiator) throw new Error("initiatorName required for B2C");
    const token = await this.getToken();
    return processB2C(this.baseUrl, token, securityCred, initiator, request);
  }

  /** B2B - Send money to business */
  async b2b(request: B2BRequest) {
    const initiator = this.config.initiatorName ?? "";
    const securityCred = await this.getSecurityCredential();
    if (!initiator) throw new Error("initiatorName required for B2B");
    const token = await this.getToken();
    return processB2B(this.baseUrl, token, securityCred, initiator, request);
  }

  /** C2B - Register validation/confirmation URLs */
  async c2bRegisterUrls(request: C2BRegisterUrlRequest) {
    const token = await this.getToken();
    return registerC2BUrls(this.baseUrl, token, request);
  }

  /** C2B - Simulate payment (sandbox only) */
  async c2bSimulate(request: C2BSimulateRequest) {
    const token = await this.getToken();
    return simulateC2B(this.baseUrl, token, request);
  }

  /** Dynamic QR - Generate LIPA NA M-PESA QR code */
  async qrCode(request: DynamicQRRequest) {
    const token = await this.getToken();
    return generateDynamicQR(this.baseUrl, token, request);
  }

  /** Transaction Status - Query transaction status */
  async transactionStatus(request: TransactionStatusRequest) {
    const initiator = this.config.initiatorName ?? "";
    const securityCred = await this.getSecurityCredential();
    if (!initiator)
      throw new Error("initiatorName required for Transaction Status");
    const token = await this.getToken();
    return queryTransactionStatus(
      this.baseUrl,
      token,
      securityCred,
      initiator,
      request
    );
  }

  /** Reversal - Reverse a transaction */
  async reversal(request: ReversalRequest) {
    const initiator = this.config.initiatorName ?? "";
    const securityCred = await this.getSecurityCredential();
    if (!initiator) throw new Error("initiatorName required for Reversal");
    const token = await this.getToken();
    return processReversal(
      this.baseUrl,
      token,
      securityCred,
      initiator,
      request
    );
  }
}
