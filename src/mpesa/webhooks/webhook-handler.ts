/**
 * Webhook event handler utilities (STK Push focused)
 */

import { parseStkPushWebhook, verifyWebhookIP } from "./signature-verifier";
import type { StkPushWebhook, WebhookEventType } from "./types";

export interface WebhookHandlerOptions {
  /** IP address of incoming request */
  requestIP?: string;
  /** Custom IP whitelist */
  allowedIPs?: string[];
  /** Skip IP verification (for testing) */
  skipIPCheck?: boolean;
}

export interface WebhookHandlerResult<T = unknown> {
  success: boolean;
  eventType: WebhookEventType | null;
  data: T | null;
  error?: string;
}

export function handleWebhook(
  body: unknown,
  options: WebhookHandlerOptions = {}
): WebhookHandlerResult {
  // Verify IP if provided
  if (!options.skipIPCheck && options.requestIP) {
    if (!verifyWebhookIP(options.requestIP, options.allowedIPs)) {
      return {
        success: false,
        eventType: null,
        data: null,
        error: "IP address not whitelisted",
      };
    }
  }

  // Try to parse as STK Push
  const stkPush = parseStkPushWebhook(body);
  if (stkPush) {
    return {
      success: true,
      eventType: "stk_push",
      data: stkPush,
    };
  }

  return {
    success: false,
    eventType: null,
    data: null,
    error: "Unknown webhook format",
  };
}

export function extractTransactionId(webhook: StkPushWebhook): string | null {
  if ("Body" in webhook && webhook.Body?.stkCallback) {
    const items = webhook.Body.stkCallback.CallbackMetadata?.Item;
    const mpesaReceipt = items?.find(
      (item) => item.Name === "MpesaReceiptNumber"
    );
    return mpesaReceipt ? String(mpesaReceipt.Value) : null;
  }
  return null;
}

export function extractAmount(webhook: StkPushWebhook): number | null {
  if ("Body" in webhook && webhook.Body?.stkCallback) {
    const items = webhook.Body.stkCallback.CallbackMetadata?.Item;
    const amount = items?.find((item) => item.Name === "Amount");
    return amount ? Number(amount.Value) : null;
  }
  return null;
}
