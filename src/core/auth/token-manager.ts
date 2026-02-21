/**
 * OAuth token manager for Daraja API
 * Token validity: 3600 seconds (1 hour)
 */

import { PesafyError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type { TokenResponse } from "./types";

const TOKEN_BUFFER_SECONDS = 60; // Refresh token 60s before expiry

export class TokenManager {
  private consumerKey: string;
  private consumerSecret: string;
  private baseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(consumerKey: string, consumerSecret: string, baseUrl: string) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.baseUrl = baseUrl;
  }

  private getAuthHeader(): string {
    const credentials = `${this.consumerKey}:${this.consumerSecret}`;
    const encoded = Buffer.from(credentials, "utf-8").toString("base64");
    return `Basic ${encoded}`;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now() / 1000;
    if (this.cachedToken && this.tokenExpiresAt > now + TOKEN_BUFFER_SECONDS) {
      return this.cachedToken;
    }

    const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    const response = await httpRequest<TokenResponse>(url, {
      method: "GET",
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    const data = response.data;
    if (!data.access_token) {
      throw new PesafyError({
        code: "AUTH_FAILED",
        message: "Failed to obtain access token",
        response: data,
      });
    }

    this.cachedToken = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in ?? 3600);
    return this.cachedToken;
  }

  clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }
}
