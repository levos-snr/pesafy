/**
 * Webhook signature verification (STK Push focused)
 * Note: Daraja API doesn't provide webhook signatures in the same way as Stripe
 * Instead, verify by whitelisting IPs: 196.201.214.200, 196.201.214.206, etc.
 * This utility helps parse and validate webhook payloads
 */

import type { StkPushWebhook } from "./types";

export interface WebhookVerificationOptions {
  /** IP whitelist - verify request comes from Safaricom */
  allowedIPs?: string[];
  /** Optional: verify request headers match expected pattern */
  verifyHeaders?: boolean;
}

const SAFARICOM_IPS = [
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
];

export function verifyWebhookIP(
  requestIP: string,
  allowedIPs: string[] = SAFARICOM_IPS
): boolean {
  return allowedIPs.includes(requestIP);
}

export function parseStkPushWebhook(body: unknown): StkPushWebhook | null {
  try {
    const parsed = body as StkPushWebhook;
    if (parsed.Body?.stkCallback) return parsed;
    return null;
  } catch {
    return null;
  }
}
