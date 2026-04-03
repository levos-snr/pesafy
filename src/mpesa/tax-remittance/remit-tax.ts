// src/mpesa/tax-remittance/remit-tax.ts

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { TaxRemittanceRequest, TaxRemittanceResponse } from './types'

/** KRA's M-PESA shortcode — the only allowed PartyB for tax remittance */
export const KRA_SHORTCODE = '572572'

/** The only CommandID accepted by the Tax Remittance API */
export const TAX_COMMAND_ID = 'PayTaxToKRA'

/**
 * Remits tax to Kenya Revenue Authority (KRA) via M-PESA.
 *
 * Endpoint: POST /mpesa/b2b/v1/remittax
 *
 * @param baseUrl            - Daraja base URL (sandbox or production)
 * @param accessToken        - Valid OAuth bearer token
 * @param securityCredential - RSA-encrypted initiator password (base64)
 * @param initiatorName      - M-PESA org portal API operator username
 * @param request            - Tax remittance parameters
 * @returns                  - Daraja synchronous acknowledgement response
 *
 * @example
 * const response = await remitTax(
 *   'https://sandbox.safaricom.co.ke',
 *   accessToken,
 *   securityCredential,
 *   'TaxPayer',
 *   {
 *     amount:           239,
 *     partyA:           '888880',
 *     accountReference: '353353',
 *     resultUrl:        'https://mydomain.com/b2b/remittax/result/',
 *     queueTimeOutUrl:  'https://mydomain.com/b2b/remittax/queue/',
 *   },
 * )
 */
export async function remitTax(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: TaxRemittanceRequest,
): Promise<TaxRemittanceResponse> {
  // ── Validation ──────────────────────────────────────────────────────────────

  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `amount must be a whole number ≥ 1 (got ${request.amount} which rounds to ${amount}).`,
    })
  }

  if (!request.partyA?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyA is required — your M-PESA business shortcode from which tax is deducted.',
    })
  }

  if (!request.accountReference?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'accountReference is required — the Payment Registration Number (PRN) issued by KRA.',
    })
  }

  if (!request.resultUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'resultUrl is required — Safaricom POSTs the tax remittance result here.',
    })
  }

  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'queueTimeOutUrl is required — Safaricom calls this on request timeout.',
    })
  }

  // ── Build payload matching Daraja spec exactly ──────────────────────────────
  //
  // Fixed values per Daraja Tax Remittance docs:
  //   CommandID:              "PayTaxToKRA" — only valid value
  //   SenderIdentifierType:   "4"           — Organisation ShortCode (only allowed)
  //   RecieverIdentifierType: "4"           — Organisation ShortCode (only allowed)
  //   PartyB:                 "572572"      — KRA shortcode (only allowed)

  const payload = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: TAX_COMMAND_ID,
    SenderIdentifierType: '4',
    RecieverIdentifierType: '4',
    Amount: String(amount),
    PartyA: String(request.partyA),
    PartyB: request.partyB ?? KRA_SHORTCODE,
    AccountReference: request.accountReference,
    Remarks: request.remarks ?? 'Tax Remittance',
    QueueTimeOutURL: request.queueTimeOutUrl,
    ResultURL: request.resultUrl,
  }

  const { data } = await httpRequest<TaxRemittanceResponse>(`${baseUrl}/mpesa/b2b/v1/remittax`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: payload,
  })

  return data
}
