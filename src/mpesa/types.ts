/**
 * Core M-Pesa / Daraja API types
 */

export type Environment = "sandbox" | "production";

/** Base URLs per Daraja environment */
export const DARAJA_BASE_URLS: Record<Environment, string> = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

export interface MpesaConfig {
  // ── Required for all APIs ─────────────────────────────────────────────────
  consumerKey: string;
  consumerSecret: string;
  environment: Environment;

  // ── Required for STK Push (M-Pesa Express) ────────────────────────────────
  /** Paybill / HO shortcode (5–7 digits). Required for STK Push & STK Query. */
  lipaNaMpesaShortCode?: string;
  /**
   * Passkey from Daraja portal.
   * Sandbox: visible in the simulator test data section.
   * Production: emailed after Go Live.
   */
  lipaNaMpesaPassKey?: string;

  // ── Required for Transaction Status / B2C / Reversals ────────────────────
  /** M-PESA org portal API operator username */
  initiatorName?: string;
  /** Plain-text password for the API operator (will be RSA-encrypted) */
  initiatorPassword?: string;

  // ── Certificate options (choose one) ─────────────────────────────────────
  /**
   * Path to the .cer file on disk.
   * Bun: read via `Bun.file(path).text()`
   * Node: read via `fs.promises.readFile(path, "utf-8")`
   */
  certificatePath?: string;
  /** PEM string contents of the certificate (alternative to certificatePath) */
  certificatePem?: string;
  /**
   * Pre-computed base64 security credential.
   * Use this if you encrypt outside the library (e.g. at startup).
   * Skips the RSA encryption step entirely.
   */
  securityCredential?: string;
}
