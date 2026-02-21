/**
 * Webhook event handler utilities
 */

import {
  parseB2CWebhook,
  parseC2BWebhook,
  parseStkPushWebhook,
  verifyWebhookIP,
} from "./signature-verifier";
import type {
  B2CWebhook,
  C2BWebhook,
  StkPushWebhook,
  WebhookEventType,
} from "./types";

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

  // Try to parse as B2C
  const b2c = parseB2CWebhook(body);
  if (b2c) {
    return {
      success: true,
      eventType: "b2c",
      data: b2c,
    };
  }

  // Try to parse as C2B
  const c2b = parseC2BWebhook(body);
  if (c2b) {
    return {
      success: true,
      eventType: "c2b",
      data: c2b,
    };
  }

  return {
    success: false,
    eventType: null,
    data: null,
    error: "Unknown webhook format",
  };
}

export function extractTransactionId(
  webhook: StkPushWebhook | B2CWebhook | C2BWebhook
): string | null {
  if ("Body" in webhook && webhook.Body?.stkCallback) {
    const items = webhook.Body.stkCallback.CallbackMetadata?.Item;
    const mpesaReceipt = items?.find(
      (item) => item.Name === "MpesaReceiptNumber"
    );
    return mpesaReceipt ? String(mpesaReceipt.Value) : null;
  }
  if ("Result" in webhook && webhook.Result?.TransactionID) {
    return webhook.Result.TransactionID;
  }
  if ("TransID" in webhook) {
    return webhook.TransID;
  }
  return null;
}

export function extractAmount(
  webhook: StkPushWebhook | B2CWebhook | C2BWebhook
): number | null {
  if ("Body" in webhook && webhook.Body?.stkCallback) {
    const items = webhook.Body.stkCallback.CallbackMetadata?.Item;
    const amount = items?.find((item) => item.Name === "Amount");
    return amount ? Number(amount.Value) : null;
  }
  if ("Result" in webhook && webhook.Result?.ResultParameters) {
    const params = webhook.Result.ResultParameters.ResultParameter;
    const amount = params?.find((p) => p.Key === "Amount");
    return amount ? Number(amount.Value) : null;
  }
  if ("TransAmount" in webhook) {
    return Number.parseFloat(webhook.TransAmount);
  }
  return null;
}
