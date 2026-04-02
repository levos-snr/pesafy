/**
 * src/mpesa/c2b/simulate.ts
 *
 * C2B Simulate implementation (Sandbox ONLY).
 * Strictly aligned with Safaricom Daraja C2B API documentation.
 *
 * Endpoint (v2, sandbox only):
 *   POST https://sandbox.safaricom.co.ke/mpesa/c2b/v2/simulate
 *
 * Per docs: "NB: Simulation is not supported on production."
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { C2BApiVersion, C2BSimulateRequest, C2BSimulateResponse } from './types'

/**
 * Simulates a C2B customer payment. SANDBOX ONLY.
 *
 * Daraja payload shape:
 * {
 *   "ShortCode":      600984,                    ← numeric
 *   "CommandID":      "CustomerPayBillOnline",
 *   "Amount":         1,                         ← numeric, whole number ≥ 1
 *   "Msisdn":         254708374149,              ← numeric
 *   "BillRefNumber":  "AccountRef"               ← Paybill only; OMIT for BuyGoods
 * }
 *
 * CRITICAL — BillRefNumber handling (per docs):
 *   "Account reference for Customer paybills and null for customer buy goods"
 *   We omit the key entirely for BuyGoods (not null, not "") because Daraja
 *   validates field presence and rejects even null/empty values for Buy Goods.
 *
 * @param baseUrl     - Must be the sandbox base URL
 * @param accessToken - Valid OAuth bearer token from Authorization API
 * @param request     - Simulation parameters
 * @returns           - Daraja simulate response (ResponseCode "0" = accepted)
 */
export async function simulateC2B(
  baseUrl: string,
  accessToken: string,
  request: C2BSimulateRequest,
): Promise<C2BSimulateResponse> {
  // ── Sandbox guard (per docs: simulate not available in production) ──────────
  if (!baseUrl.includes('sandbox')) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'C2B simulate is only available in the Sandbox environment. ' +
        'In production, customers initiate payments via M-PESA App, USSD, or SIM Toolkit.',
    })
  }

  // ── Validate shortCode ──────────────────────────────────────────────────────
  if (!request.shortCode || !String(request.shortCode).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'shortCode is required',
    })
  }

  // ── Validate commandId ──────────────────────────────────────────────────────
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

  // ── Validate amount (whole number ≥ 1 per docs) ─────────────────────────────
  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `amount must be a whole number ≥ 1 (got ${request.amount})`,
    })
  }

  // ── Validate msisdn ─────────────────────────────────────────────────────────
  if (!request.msisdn || !String(request.msisdn).trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'msisdn is required. Sandbox test MSISDN: 254708374149',
    })
  }

  // ── Determine transaction type ──────────────────────────────────────────────
  const isBuyGoods = request.commandId === 'CustomerBuyGoodsOnline'
  const version: C2BApiVersion = request.apiVersion ?? 'v2'

  // ── Build payload ───────────────────────────────────────────────────────────
  //
  // ShortCode and Msisdn are sent as numbers per Daraja docs.
  // BillRefNumber is ONLY included for CustomerPayBillOnline.
  // For CustomerBuyGoodsOnline the key must be absent from the payload.
  //
  const payload: Record<string, unknown> = {
    ShortCode: Number(request.shortCode),
    CommandID: request.commandId,
    Amount: amount,
    Msisdn: Number(request.msisdn),
  }

  if (!isBuyGoods) {
    // Paybill: include BillRefNumber (empty string is acceptable when no ref needed)
    payload['BillRefNumber'] = request.billRefNumber ?? ''
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
