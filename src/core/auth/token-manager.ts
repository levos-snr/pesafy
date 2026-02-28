/**
 * OAuth token manager for Daraja API.
 *
 * Daraja Authorization endpoint (GET, Basic Auth):
 *   https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
 *   https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
 *
 * Token validity: 3600 seconds (1 hour).
 * We refresh 60 s early to avoid edge-case expiry mid-request.
 *
 * Ref: Authorization By Safaricom docs
 */

import { PesafyError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type { TokenResponse } from "./types";

/** Refresh the token this many seconds before it actually expires */
const TOKEN_BUFFER_SECONDS = 60;

export class TokenManager {
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly baseUrl: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt = 0; // Unix seconds

  constructor(consumerKey: string, consumerSecret: string, baseUrl: string) {
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.baseUrl = baseUrl;
  }

  private getBasicAuthHeader(): string {
    // Daraja spec: Base64(consumerKey:consumerSecret)
    const credentials = `${this.consumerKey}:${this.consumerSecret}`;
    const encoded = Buffer.from(credentials, "utf-8").toString("base64");
    return `Basic ${encoded}`;
  }

  /**
   * Returns a valid access token, fetching a new one when the cached token
   * is absent or within TOKEN_BUFFER_SECONDS of expiry.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now() / 1000;

    if (this.cachedToken && this.tokenExpiresAt > now + TOKEN_BUFFER_SECONDS) {
      return this.cachedToken;
    }

    // Daraja Authorization API: GET with Basic Auth + grant_type query param
    const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;

    const response = await httpRequest<TokenResponse>(url, {
      method: "GET",
      headers: {
        Authorization: this.getBasicAuthHeader(),
      },
    });

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      throw new PesafyError({
        code: "AUTH_FAILED",
        message:
          "Daraja did not return an access token. Check your consumer key and secret.",
        response: response.data,
      });
    }

    this.cachedToken = access_token;
    // expires_in is 3599 per Daraja docs; default to 3600 if missing
    this.tokenExpiresAt = now + (expires_in ?? 3600);

    return this.cachedToken;
  }

  /** Force token refresh on the next call (e.g. after a 401 response) */
  clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiresAt = 0;
  }
}
