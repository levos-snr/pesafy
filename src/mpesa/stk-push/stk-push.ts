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
 *   "AccountReference":  "accountref",      ← max 12 chars
 *   "TransactionDesc":   "txndesc"           ← max 13 chars
 * }
 *
 * Notes from docs:
 * - All fields except TransactionDesc are mandatory.
 * - Amount must be a whole number ≥ 1 (KES).
 * - PartyA = phone sending money (2547XXXXXXXX).
 * - PartyB = shortCode for Paybill, Till Number for Buy Goods.
 * - AccountReference max 12 chars (longer values cause USSD prompt too long).
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
  // Daraja minimum is KES 1. Math.round(0.4) = 0 → reject with clear message.
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

  // ── PartyB ──────────────────────────────────────────────────────────────────
  // Paybill → PartyB = shortCode
  // Buy Goods (Till) → PartyB = till number
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
    AccountReference: request.accountReference.slice(0, 12),
    TransactionDesc: request.transactionDesc.slice(0, 13),
  };

  const { data } = await httpRequest<StkPushResponse>(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
