// src/mpesa/c2b/simulate.ts

/**
 * C2B Simulate Transaction — SANDBOX ONLY
 *
 * Simulates a customer payment to your Paybill or Till number.
 *
 * API:
 *   v1: POST /mpesa/c2b/v1/simulate
 *   v2: POST /mpesa/c2b/v2/simulate   ← default
 *
 * ─── CRITICAL: BillRefNumber rules (confirmed by Daraja docs + live testing) ─
 *
 *   CustomerPayBillOnline  (Paybill):
 *     → INCLUDE BillRefNumber as the account/invoice reference.
 *       Even an empty string "" is acceptable for Paybill.
 *
 *   CustomerBuyGoodsOnline (Till):
 *     → COMPLETELY OMIT BillRefNumber from the JSON body.
 *     → DO NOT send it as null, undefined, or "" (empty string).
 *     → Daraja docs say "null for till number" but in practice ANY presence
 *       of the field — including null or "" — triggers:
 *         HTTP 400: "The element AccountReference is invalid"
 *       which Daraja sandbox may also surface as HTTP 503.
 *     → The fix is to never include the key in the payload object at all.
 *
 * ─── CRITICAL: URL registration per shortcode ─────────────────────────────────
 *
 *   Daraja docs: "Register URLs before each simulation."
 *   Registration is PER SHORTCODE — each shortcode is registered INDEPENDENTLY:
 *     - Paybill shortcode (e.g. 600977): registerC2BUrls({ shortCode: "600977" })
 *     - Till shortcode   (e.g. 600000): registerC2BUrls({ shortCode: "600000" })
 *   Simulating with a shortcode whose URLs are not registered will cause errors.
 *
 * ─── Sandbox shortcodes ───────────────────────────────────────────────────────
 *
 *   CustomerPayBillOnline  → your registered Paybill shortcode (e.g. 600977)
 *   CustomerBuyGoodsOnline → Daraja test Till shortcode: 600000
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type {
  C2BApiVersion,
  C2BSimulateRequest,
  C2BSimulateResponse,
} from './types'

/**
 * Simulates a C2B customer payment. SANDBOX ONLY.
 *
 * @param baseUrl     - Must be the sandbox base URL (contains "sandbox").
 * @param accessToken - Valid OAuth bearer token from the Authorization API.
 * @param request     - Simulation parameters. Do NOT pass billRefNumber for Buy Goods.
 * @returns           - Daraja simulate response (ResponseCode "0" = accepted).
 */
export async function simulateC2B(
  baseUrl: string,
  accessToken: string,
  request: C2BSimulateRequest,
): Promise<C2BSimulateResponse> {
  // ── Sandbox guard ───────────────────────────────────────────────────────────
  if (!baseUrl.includes('sandbox')) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'C2B simulate is only available in the Sandbox environment. ' +
        'In production, customers initiate payments via M-PESA App, USSD, or SIM Toolkit.',
    })
  }

  // ── Input validation ────────────────────────────────────────────────────────

  if (!request.shortCode) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'shortCode is required.',
    })
  }

  if (
    request.commandId !== 'CustomerPayBillOnline' &&
    request.commandId !== 'CustomerBuyGoodsOnline'
  ) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        `commandId must be "CustomerPayBillOnline" or "CustomerBuyGoodsOnline". ` +
        `Got: "${String(request.commandId)}"`,
    })
  }

  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `amount must be a whole number ≥ 1 (got ${request.amount}).`,
    })
  }

  if (!request.msisdn) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'msisdn is required. Sandbox test MSISDN: 254708374149.',
    })
  }

  // ── Determine transaction type ──────────────────────────────────────────────
  const isBuyGoods = request.commandId === 'CustomerBuyGoodsOnline'
  const version: C2BApiVersion = request.apiVersion ?? 'v2'

  // ── Build payload ───────────────────────────────────────────────────────────
  //
  // CRITICAL — BillRefNumber MUST be omitted for CustomerBuyGoodsOnline.
  //
  // We build the base object WITHOUT BillRefNumber and only conditionally
  // add it for Paybill. This is the only safe pattern because:
  //
  //   • JSON.stringify({ BillRefNumber: null })  → includes "BillRefNumber":null  ✗
  //   • JSON.stringify({ BillRefNumber: "" })    → includes "BillRefNumber":""    ✗
  //   • building without the key at all          → field absent from JSON body    ✓
  //
  // Daraja validates field presence, not just value — even null/empty triggers:
  // "The element AccountReference is invalid"
  //
  // Note: the caller (simulateC2BPayment in c2bActions.ts) must NOT pass
  // billRefNumber at all for Buy Goods — pass undefined or omit the key.
  // This function is defensive and will still correctly omit it regardless.

  const payload: Record<string, unknown> = {
    ShortCode: Number(request.shortCode),
    CommandID: request.commandId,
    Amount: amount,
    Msisdn: Number(request.msisdn),
    // BillRefNumber is NOT here — added conditionally below for Paybill only
  }

  if (!isBuyGoods) {
    // Paybill: include BillRefNumber (the account/invoice ref for this payment).
    // Empty string is acceptable when no specific account ref is needed.
    payload['BillRefNumber'] = request.billRefNumber ?? ''
  }

  // ── Defensive check — should never trigger given the logic above ─────────────
  // Acts as a compile-time-visible safety net for future refactors.
  if (
    isBuyGoods &&
    Object.prototype.hasOwnProperty.call(payload, 'BillRefNumber')
  ) {
    // This branch must never execute. If it does, remove the key to prevent
    // the "AccountReference is invalid" error from Daraja.
    delete payload['BillRefNumber']
    console.warn(
      '[pesafy/simulateC2B] BillRefNumber leaked into Buy Goods payload — removed. ' +
        'This is a library bug; please report it.',
    )
  }

  // ── Call Daraja ─────────────────────────────────────────────────────────────
  const { data } = await httpRequest<C2BSimulateResponse>(
    `${baseUrl}/mpesa/c2b/${version}/simulate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )

  return data
}
