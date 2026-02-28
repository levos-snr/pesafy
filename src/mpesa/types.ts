export type Environment = "sandbox" | "production";

export const DARAJA_BASE_URLS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  environment: Environment;
  /** Required for STK Push - Lipa Na M-Pesa passkey from Daraja portal */
  lipaNaMpesaShortCode?: string;
  lipaNaMpesaPassKey?: string;
  /** Required for Transaction Status - initiator name and password */
  initiatorName?: string;
  initiatorPassword?: string;
  /** PEM certificate for encrypting initiator password. Download from Daraja portal */
  certificatePath?: string;
  /** PEM certificate string (alternative to certificatePath) */
  certificatePem?: string;
  /** Pre-encrypted security credential (alternative to initiatorPassword + certificate) */
  securityCredential?: string;
}
