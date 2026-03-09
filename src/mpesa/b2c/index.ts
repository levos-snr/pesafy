/**
 * Business to Customer (B2C) module exports
 *
 * Enables businesses to send money to customers or load funds to a
 * B2C shortcode for bulk disbursement.
 *
 * API: POST /mpesa/b2b/v1/paymentrequest
 * Sandbox: https://sandbox.safaricom.co.ke/mpesa/b2b/v1/paymentrequest
 * Production: https://api.safaricom.co.ke/mpesa/b2b/v1/paymentrequest
 *
 * Supported CommandIDs:
 *   BusinessPayToBulk   — Load funds to a B2C shortcode for bulk disbursement
 *   BusinessPayment     — Direct payment to a customer's M-PESA wallet
 *   SalaryPayment       — Salary disbursement to a customer
 *   PromotionPayment    — Promotions/bonus payment to a customer
 *
 * Authentication:
 *   Standard OAuth bearer token + RSA-encrypted SecurityCredential.
 *   Requires initiatorName with the appropriate org portal role.
 *
 * Prerequisites (from Daraja docs):
 *   - Initiator with the correct role on the M-PESA org portal:
 *     BusinessPayToBulk  → "Org Business Pay to Bulk API initiator"
 *     BusinessPayment    → "Org Business Payment API initiator"
 *     SalaryPayment      → "Org Salary Payment API initiator"
 *     PromotionPayment   → "Org Promotion Payment API initiator"
 *   - SecurityCredential encrypted with the correct environment certificate.
 *
 * Error codes (from Daraja docs):
 *   500.003.1001 — Internal Server Error  → check your setup and endpoints
 *   400.003.01   — Invalid Access Token   → regenerate token before expiry
 *   400.003.02   — Bad Request            → check API documentation setup
 *   500.003.03   — Quota Violation        → reduce request rate
 *   500.003.02   — Spike Arrest Violation → ensure server is running properly
 *   404.003.01   — Resource not found     → check the API endpoint URL
 *   404.001.04   — Invalid Auth Header    → all M-PESA APIs are POST except Authorization
 *   400.002.05   — Invalid Request Payload → check request body for typos
 */

export { initiateB2CPayment } from "./payment";
export type {
  B2CCommandID,
  B2CErrorResponse,
  B2CRequest,
  B2CResponse,
  B2CResult,
  B2CResultParameter,
} from "./types";
export {
  getB2CAmount,
  getB2CConversationId,
  getB2CCurrency,
  getB2CDebitAccountBalance,
  getB2CDebitPartyCharges,
  getB2CInitiatorAccountBalance,
  getB2COriginatorConversationId,
  getB2CReceiverPublicName,
  getB2CResultDesc,
  getB2CResultParam,
  getB2CTransactionCompletedTime,
  getB2CTransactionId,
  isB2CFailure,
  isB2CResult,
  isB2CSuccess,
} from "./webhooks";
