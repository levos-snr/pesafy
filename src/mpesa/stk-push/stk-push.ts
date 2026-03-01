// src/mpesa/stk-push/stk-push.ts

/**
 * M-Pesa Express (STK Push) — initiates a payment prompt on the customer's phone.
 *
 * API: POST /mpesa/stkpush/v1/processrequest
 *
 * Daraja request body (from docs):
 * {
 *   "BusinessShortCode": 174379,
 *   "Password":          "base64(Shortcode+Passkey+Timestamp)",
 *   "Timestamp":         "20210628092408",
 *   "TransactionType":   "CustomerPayBillOnline",
 *   "Amount":            "1",
 *   "PartyA":            "254722000000",
 *   "PartyB":            "174379",
 *   "PhoneNumber":       "254722111111",
 *   "CallBackURL":       "https://mydomain.com/path",
 *   "AccountReference":  "accountref",   ← max 12 chars
 *   "TransactionDesc":   "txndesc"        ← max 13 chars
 * }
 *
 * Notes from docs:
 * - All fields except TransactionDesc are mandatory.
 * - Amount must be a whole number ≥ 1 (KES).
 * - PartyA/PhoneNumber must be 254XXXXXXXXX format.
 * - AccountReference max 12 chars.
 * - TransactionDesc max 13 chars.
 */

import { PesafyError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type { StkPushRequest, StkPushResponse } from "./types";
import { formatPhoneNumber, getStkPushPassword, getTimestamp } from "./utils";

export async function processStkPush(
  baseUrl: string,
  accessToken: string,
  request: StkPushRequest
): Promise<StkPushResponse> {
  // ── Amount validation ───────────────────────────────────────────────────────
  const amount = Math.round(request.amount);
  if (amount < 1) {
    throw new PesafyError({
      code: "VALIDATION_ERROR",
      message: `Amount must be at least KES 1 (got ${request.amount} which rounds to ${amount}).`,
    });
  }

  // ── Generate timestamp ONCE ─────────────────────────────────────────────────
  // Must be identical in Password (encoded) and Timestamp (body) fields.
  const timestamp = getTimestamp();

  // ── PartyB logic ────────────────────────────────────────────────────────────
  // Paybill → PartyB = shortCode
  // Buy Goods (Till) → PartyB = till number (passed as request.partyB)
  const partyB = request.partyB ?? request.shortCode;

  const body = {
    BusinessShortCode: request.shortCode,
    Password: getStkPushPassword(request.shortCode, request.passKey, timestamp),
    Timestamp: timestamp,
    TransactionType: request.transactionType ?? "CustomerPayBillOnline",
    Amount: amount,
    PartyA: formatPhoneNumber(request.phoneNumber),
    PartyB: partyB,
    PhoneNumber: formatPhoneNumber(request.phoneNumber),
    CallBackURL: request.callbackUrl,
    // Daraja docs: AccountReference max 12 chars, TransactionDesc max 13 chars
    AccountReference: request.accountReference.slice(0, 12),
    TransactionDesc: request.transactionDesc.slice(0, 13),
  };

  // httpRequest already retries 503/429/5xx with exponential backoff + jitter.
  // If all retries are exhausted it throws PesafyError with code "REQUEST_FAILED"
  // and statusCode 503 — callers should treat this as TRANSIENT, not a final
  // failure. Never mark a transaction "failed" on a 503.
  const { data } = await httpRequest<StkPushResponse>(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
      // Daraja sandbox needs more retries and longer gaps due to instability
      retries: 5,
      retryDelay: 3000,
    }
  );

  return data;
}
