// src/mpesa/transaction-status/query.ts

/**
 * Transaction Status Query implementation
 *
 * API: POST /mpesa/transactionstatus/v1/query
 *
 * This is ASYNCHRONOUS. The synchronous response only acknowledges receipt.
 * Final results arrive via POST to your ResultURL.
 *
 * Required M-PESA org portal role: "Transaction Status query ORG API"
 *
 * Reconciliation options (at least one required):
 *   - transactionId          — M-Pesa Receipt Number (e.g. "NEF61H8J60")
 *   - originalConversationId — OriginatorConversationID from the original call
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { TransactionStatusRequest, TransactionStatusResponse } from './types'

export async function queryTransactionStatus(
  baseUrl: string,
  token: string,
  securityCredential: string,
  initiator: string,
  request: TransactionStatusRequest,
): Promise<TransactionStatusResponse> {
  // ── Validation ──────────────────────────────────────────────────────────────

  const hasTransactionId = !!request.transactionId?.trim()
  const hasOriginalConversationId = !!request.originalConversationId?.trim()

  if (!hasTransactionId && !hasOriginalConversationId) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message:
        'Either transactionId (M-Pesa Receipt Number) or originalConversationId ' +
        '(OriginatorConversationID) is required to query transaction status.',
    })
  }

  if (!request.partyA?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'partyA is required (your business shortcode, till number, or MSISDN)',
    })
  }

  if (!request.identifierType) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'identifierType is required: "1" (MSISDN) | "2" (Till) | "4" (ShortCode)',
    })
  }

  if (!request.resultUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'resultUrl is required — Safaricom POSTs the transaction result here',
    })
  }

  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'queueTimeOutUrl is required — Safaricom calls this on timeout',
    })
  }

  // ── Build payload matching Daraja spec exactly ──────────────────────────────

  const payload: Record<string, string> = {
    Initiator: initiator,
    SecurityCredential: securityCredential,
    CommandID: request.commandId ?? 'TransactionStatusQuery',
    TransactionID: request.transactionId ?? '',
    OriginalConversationID: request.originalConversationId ?? '',
    PartyA: request.partyA,
    IdentifierType: request.identifierType,
    ResultURL: request.resultUrl,
    QueueTimeOutURL: request.queueTimeOutUrl,
    Remarks: request.remarks ?? 'Transaction Status Query',
    Occasion: request.occasion ?? '',
  }

  const { data } = await httpRequest<TransactionStatusResponse>(
    `${baseUrl}/mpesa/transactionstatus/v1/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    },
  )

  return data
}
