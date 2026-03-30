// 📁 PATH: src/mpesa/reversal/request.ts

/**
 * Transaction Reversal — reverses a completed M-PESA transaction.
 *
 * API: POST /mpesa/reversal/v1/request
 *
 * ASYNCHRONOUS. Synchronous response is acknowledgement only.
 * Final result is POSTed to your ResultURL.
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type { ReversalRequest, ReversalResponse } from './types'

export async function requestReversal(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: ReversalRequest,
): Promise<ReversalResponse> {
  if (!request.transactionId?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'transactionId is required.',
    })
  }
  if (!request.receiverParty?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'receiverParty is required.',
    })
  }
  if (!['1', '2', '4'].includes(request.receiverIdentifierType)) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'receiverIdentifierType must be "1", "2", or "4".',
    })
  }

  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `amount must be a whole number ≥ 1 (got ${request.amount}).`,
    })
  }

  if (!request.resultUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'resultUrl is required.',
    })
  }
  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'queueTimeOutUrl is required.',
    })
  }

  const payload = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: 'TransactionReversal',
    TransactionID: request.transactionId,
    Amount: String(amount),
    ReceiverParty: String(request.receiverParty),
    RecieverIdentifierType: request.receiverIdentifierType,
    ResultURL: request.resultUrl,
    QueueTimeOutURL: request.queueTimeOutUrl,
    Remarks: request.remarks ?? 'Transaction Reversal',
    Occasion: request.occasion ?? '',
  }

  const { data } = await httpRequest<ReversalResponse>(
    `${baseUrl}/mpesa/reversal/v1/request`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )

  return data
}
