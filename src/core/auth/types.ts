/**
 * Auth module types
 */

export interface TokenResponse {
  /** The OAuth bearer token */
  access_token: string;
  /** Seconds until expiry — Daraja returns 3599 */
  expires_in: number;
}

export interface TokenCacheEntry {
  token: string;
  /** Unix timestamp (seconds) after which token is considered expired */
  expiresAt: number;
}
