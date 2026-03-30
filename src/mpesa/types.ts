// 📁 PATH: src/mpesa/types.ts

/**
 * Core M-Pesa / Daraja configuration types
 */

export type Environment = 'sandbox' | 'production'

export const DARAJA_BASE_URLS: Record<Environment, string> = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
} as const

export interface MpesaConfig {
  // ── Required for all APIs ─────────────────────────────────────────────────
  consumerKey: string
  consumerSecret: string
  environment: Environment

  // ── STK Push (M-Pesa Express) ─────────────────────────────────────────────
  lipaNaMpesaShortCode?: string
  lipaNaMpesaPassKey?: string

  // ── Initiator (B2C / B2B / Reversal / Account Balance / Tax / TxStatus) ──
  initiatorName?: string
  initiatorPassword?: string

  // ── Certificate (one of) ──────────────────────────────────────────────────
  certificatePath?: string
  certificatePem?: string
  /**
   * Pre-computed base64 SecurityCredential — skips RSA encryption.
   * Use when you encrypt at startup outside the library.
   */
  securityCredential?: string

  // ── HTTP tuning ───────────────────────────────────────────────────────────
  /** Override default retry count (4) for all API calls */
  retries?: number
  /** Override default base retry delay in ms (2000) */
  retryDelay?: number
  /** Override default per-request timeout in ms (30000) */
  timeout?: number
}
