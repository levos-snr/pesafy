// 📁 PATH: src/adapters/fastify.ts

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { Mpesa } from '../mpesa'
import { verifyWebhookIP } from '../mpesa/webhooks'
import type { MpesaConfig } from '../mpesa/types'
import { PesafyError } from '../utils/errors'

export interface MpesaFastifyConfig extends MpesaConfig {
  callbackUrl: string
  resultUrl?: string
  queueTimeOutUrl?: string
  skipIPCheck?: boolean
  onStkSuccess?: (data: {
    receiptNumber: string | null
    amount: number | null
    phone: string | null
  }) => Promise<void> | void
}

function getIP(req: FastifyRequest): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0]?.trim() ?? ''
  return req.ip ?? ''
}

function sendError(reply: FastifyReply, error: unknown): void {
  if (error instanceof PesafyError) {
    void reply
      .status(error.statusCode ?? 400)
      .send({ error: error.code, message: error.message })
  } else {
    void reply.status(500).send({ error: 'INTERNAL_ERROR' })
  }
}

/**
 * Registers all M-PESA Fastify routes.
 */
export async function registerMpesaRoutes(
  app: FastifyInstance,
  config: MpesaFastifyConfig,
): Promise<void> {
  const mpesa = new Mpesa(config)

  // ── STK Push ──────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      amount: number
      phoneNumber: string
      accountReference?: string
      transactionDesc?: string
      partyB?: string
    }
  }>('/mpesa/stk-push', async (req, reply) => {
    try {
      const body = req.body
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'amount must be > 0',
        })
      if (!body.phoneNumber)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'phoneNumber is required',
        })

      return await mpesa.stkPush({
        amount: body.amount,
        phoneNumber: body.phoneNumber,
        callbackUrl: config.callbackUrl,
        accountReference:
          body.accountReference ??
          `REF-${Date.now().toString(36).toUpperCase()}`,
        transactionDesc: body.transactionDesc ?? 'Payment',
        partyB: body.partyB,
      })
    } catch (e) {
      sendError(reply, e)
    }
  })

  // ── STK Query ─────────────────────────────────────────────────────────────
  app.post<{ Body: { checkoutRequestId: string } }>(
    '/mpesa/stk-query',
    async (req, reply) => {
      try {
        const { checkoutRequestId } = req.body
        if (!checkoutRequestId)
          throw new PesafyError({
            code: 'VALIDATION_ERROR',
            message: 'checkoutRequestId is required',
          })
        return await mpesa.stkQuery({ checkoutRequestId })
      } catch (e) {
        sendError(reply, e)
      }
    },
  )

  // ── STK Callback ──────────────────────────────────────────────────────────
  app.post('/mpesa/callback', async (req, _reply) => {
    if (!config.skipIPCheck) {
      const ip = getIP(req)
      if (ip && !verifyWebhookIP(ip)) {
        req.log.warn({ ip }, '[pesafy/fastify] Callback from unknown IP')
      }
    }

    const body = req.body as Record<string, unknown>
    const cb = (body?.Body as Record<string, unknown>)?.stkCallback as Record<
      string,
      unknown
    >
    if (cb && (cb.ResultCode as number) === 0) {
      const items =
        ((cb.CallbackMetadata as Record<string, unknown>)?.Item as Array<
          Record<string, unknown>
        >) ?? []
      const find = (name: string) =>
        items.find((i) => i.Name === name)?.Value ?? null

      if (config.onStkSuccess) {
        Promise.resolve(
          config.onStkSuccess({
            receiptNumber: find('MpesaReceiptNumber') as string | null,
            amount: find('Amount') as number | null,
            phone: find('PhoneNumber') as string | null,
          }),
        ).catch(req.log.error)
      }
    }

    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── Account Balance ───────────────────────────────────────────────────────
  app.post<{
    Body: { partyA: string; identifierType: '1' | '2' | '4'; remarks?: string }
  }>('/mpesa/balance', async (req, reply) => {
    try {
      if (!config.resultUrl || !config.queueTimeOutUrl)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'resultUrl and queueTimeOutUrl must be set in config',
        })
      return await mpesa.accountBalance({
        ...req.body,
        resultUrl: config.resultUrl,
        queueTimeOutUrl: config.queueTimeOutUrl,
      })
    } catch (e) {
      sendError(reply, e)
    }
  })

  app.post('/mpesa/balance/result', (req) => {
    req.log.info(req.body, '[pesafy/fastify] Balance result')
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── Reversal ──────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      transactionId: string
      receiverParty: string
      receiverIdentifierType: '1' | '2' | '4'
      amount: number
      remarks?: string
    }
  }>('/mpesa/reversal', async (req, reply) => {
    try {
      if (!config.resultUrl || !config.queueTimeOutUrl)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'resultUrl and queueTimeOutUrl must be set in config',
        })
      return await mpesa.reverseTransaction({
        ...req.body,
        resultUrl: config.resultUrl,
        queueTimeOutUrl: config.queueTimeOutUrl,
      })
    } catch (e) {
      sendError(reply, e)
    }
  })

  app.post('/mpesa/reversal/result', (req) => {
    req.log.info(req.body, '[pesafy/fastify] Reversal result')
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })
}
