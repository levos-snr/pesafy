/**
 * Auth module types
 */

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}
