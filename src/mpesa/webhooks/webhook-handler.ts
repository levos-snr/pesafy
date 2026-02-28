/**
 * High-level webhook event handler
 */

import { parseStkPushWebhook, verifyWebhookIP } from "./signature-verifier";
import type { StkPushWebhook, WebhookEventType } from "./types";

export interface WebhookHandlerOptions {
  /** IP address of the incoming request (from req.ip or x-forwarded-for) */
  requestIP?: string;
  /** Override the default Safaricom IP whitelist */
  allowedIPs?: string[];
  /** Skip IP verification — ONLY for local development/testing */
  skipIPCheck?: boolean;
}

export interface WebhookHandlerResult<T = unknown> {
  success: boolean;
  eventType: WebhookEventType | null;
  data: T | null;
  error?: string;
}

/**
 * Parses and validates an inbound Daraja webhook payload.
 *
 * @example
 * // Express route
 * app.post("/mpesa/callback", (req, res) => {
 *   const result = handleWebhook(req.body, { requestIP: req.ip });
 *   if (!result.success) return res.status(400).json({ error: result.error });
 *   // process result.data (StkPushWebhook)
 *   res.json({ ResultCode: 0, ResultDesc: "Accepted" });
 * });
 */
export function handleWebhook(
  body: unknown,
  options: WebhookHandlerOptions = {}
): WebhookHandlerResult {
  // ── IP verification ─────────────────────────────────────────────────────────
  if (!options.skipIPCheck && options.requestIP) {
    if (!verifyWebhookIP(options.requestIP, options.allowedIPs)) {
      return {
        success: false,
        eventType: null,
        data: null,
        error: `IP address ${options.requestIP} is not in the Safaricom whitelist`,
      };
    }
  }

  // ── Parse STK Push callback ─────────────────────────────────────────────────
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
    error: "Unknown or malformed webhook payload",
  };
}

// ── Convenience extractors ────────────────────────────────────────────────────

/** Extracts the M-Pesa receipt number from a successful STK Push callback */
export function extractTransactionId(webhook: StkPushWebhook): string | null {
  const items = webhook.Body?.stkCallback?.CallbackMetadata?.Item;
  const item = items?.find((i) => i.Name === "MpesaReceiptNumber");
  return item ? String(item.Value) : null;
}

/** Extracts the transaction amount from a successful STK Push callback */
export function extractAmount(webhook: StkPushWebhook): number | null {
  const items = webhook.Body?.stkCallback?.CallbackMetadata?.Item;
  const item = items?.find((i) => i.Name === "Amount");
  return item ? Number(item.Value) : null;
}

/** Extracts the phone number from a successful STK Push callback */
export function extractPhoneNumber(webhook: StkPushWebhook): string | null {
  const items = webhook.Body?.stkCallback?.CallbackMetadata?.Item;
  const item = items?.find((i) => i.Name === "PhoneNumber");
  return item ? String(item.Value) : null;
}

/** Returns true if the STK Push callback represents a successful transaction */
export function isSuccessfulCallback(webhook: StkPushWebhook): boolean {
  return webhook.Body?.stkCallback?.ResultCode === 0;
}
