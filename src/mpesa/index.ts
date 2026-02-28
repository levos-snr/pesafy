/**
 * M-Pesa Daraja API client (STK Push & Transaction Status)
 */

import { TokenManager } from "../core/auth";
import { encryptSecurityCredential } from "../core/encryption";
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
        "certificatePath or certificatePem required for Transaction Status"
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

  /** Transaction Status - Query the status of a transaction */
  async transactionStatus(request: TransactionStatusRequest) {
    const initiator = this.config.initiatorName ?? "";
    const securityCred = await this.getSecurityCredential();
    if (!initiator) {
      throw new Error("initiatorName required for Transaction Status");
    }
    const token = await this.getToken();
    return queryTransactionStatus(
      this.baseUrl,
      token,
      securityCred,
      initiator,
      request
    );
  }
}
