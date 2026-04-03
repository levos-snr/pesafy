// src/core/auth/types.ts

export interface TokenResponse {
  /** The OAuth bearer token */
  access_token: string
  /** Seconds until expiry — Daraja returns 3599 */
  expires_in: number
}

export interface TokenCacheEntry {
  token: string
  /** Unix timestamp (seconds) after which token is considered expired */
  expiresAt: number
}

/**
 * Daraja Authorization API error codes
 * Documented at: https://developer.safaricom.co.ke/APIs/Authorization
 *
 * These are returned in the `errorCode` field of a 400 error response body
 * when the OAuth token request is malformed.
 */
export const AUTH_ERROR_CODES = {
  /**
   * Invalid authentication type passed.
   * Mitigation: Use Basic authentication (Authorization: Basic <base64>).
   */
  INVALID_AUTH_TYPE: '400.008.01',
  /**
   * Invalid grant type passed.
   * Mitigation: Set grant_type=client_credentials in the request params.
   */
  INVALID_GRANT_TYPE: '400.008.02',
} as const

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]

/** Error response body returned by the Daraja Authorization API on failure */
export interface AuthErrorResponse {
  /** Daraja-specific error code, e.g. "400.008.01" */
  errorCode: string
  /** Human-readable error description */
  errorMessage: string
}
