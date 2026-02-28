/**
 * M-Pesa Daraja API client (STK Push focused)
 */

import { TokenManager } from "../core/auth";
import {
  processStkPush,
  queryStkPush,
  type StkPushRequest,
  type StkQueryRequest,
} from "./stk-push";
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
}
