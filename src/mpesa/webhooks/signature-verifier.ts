/**
 * Webhook verification utilities
 *
 * Daraja does NOT use HMAC webhook signatures like Stripe.
 * Instead, verify that callbacks come from whitelisted Safaricom IPs.
 *
 * Official Safaricom IP whitelist (from Getting Started docs):
 *   196.201.214.200
 *   196.201.214.206
 *   196.201.213.114
 *   196.201.214.207
 *   196.201.214.208
 *   196.201.213.44
 *   196.201.212.127
 *   196.201.212.138
 *   196.201.212.129
 *   196.201.212.136
 *   196.201.212.74
 *   196.201.212.69
 */

import type { StkPushWebhook } from "./types";

/** Official Safaricom API Gateway IP addresses */
export const SAFARICOM_IPS: readonly string[] = [
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208",
  "196.201.213.44",
  "196.201.212.127",
  "196.201.212.138",
  "196.201.212.129",
  "196.201.212.136",
  "196.201.212.74",
  "196.201.212.69",
] as const;

/**
 * Returns true if requestIP is in the allowed list.
 * Defaults to the official Safaricom IP whitelist.
 */
export function verifyWebhookIP(
  requestIP: string,
  allowedIPs: readonly string[] = SAFARICOM_IPS
): boolean {
  return allowedIPs.includes(requestIP);
}

/**
 * Parses and validates an STK Push webhook body.
 * Returns the typed payload or null if it doesn't match the expected shape.
 */
export function parseStkPushWebhook(body: unknown): StkPushWebhook | null {
  try {
    const parsed = body as StkPushWebhook;
    if (parsed?.Body?.stkCallback) return parsed;
    return null;
  } catch {
    return null;
  }
}
