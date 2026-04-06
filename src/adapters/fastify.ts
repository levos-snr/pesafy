/**
 * @file src/adapters/fastify.ts
 * Fastify adapter for pesafy — full M-PESA Daraja surface.
 *
 * Usage:
 *   import Fastify from 'fastify'
 *   import { registerMpesaPlugin } from 'pesafy/adapters/fastify'
 *
 *   const app = Fastify()
 *   await app.register(registerMpesaPlugin, config)
 */

import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Mpesa } from '../mpesa'
import type { MpesaConfig } from '../mpesa/types'
import {
  type AccountBalanceResult,
  getAccountBalanceRawBalance,
  isAccountBalanceSuccess,
  parseAccountBalance,
} from '../mpesa/account-balance'
import {
  type B2BExpressCheckoutCallback,
  getB2BAmount,
  getB2BTransactionId,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
} from '../mpesa/b2b-express-checkout'
import {
  type B2CResult,
  getB2CAmount,
  getB2CTransactionId,
  isB2CResult,
  isB2CSuccess,
} from '../mpesa/b2c'
import {
  type B2CDisbursementResult,
  isB2CDisbursementResult,
  isB2CDisbursementSuccess,
} from '../mpesa/b2c-disbursement'
import {
  acceptC2BValidation,
  type C2BConfirmationPayload,
  type C2BValidationPayload,
} from '../mpesa/c2b'
import {
  type ReversalResult,
  getReversalTransactionId,
  isReversalResult,
  isReversalSuccess,
} from '../mpesa/reversal'
import {
  type TaxRemittanceResult,
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
} from '../mpesa/tax-remittance'
import { isTransactionStatusResult, isTransactionStatusSuccess } from '../mpesa/transaction-status'
import type { TransactionStatusResult } from '../mpesa/transaction-status'
import {
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  isSuccessfulCallback,
  verifyWebhookIP,
} from '../mpesa/webhooks'
import { PesafyError } from '../utils/errors'

// ── Config ─────────────────────────────────────────────────────────────────────

export interface MpesaFastifyConfig extends MpesaConfig {
  callbackUrl: string
  resultUrl?: string
  queueTimeoutUrl?: string
  skipIPCheck?: boolean
  routePrefix?: string

  balance?: { resultUrl?: string; queueTimeoutUrl?: string; partyA?: string }
  reversal?: { resultUrl?: string; queueTimeoutUrl?: string }
  txStatus?: { resultUrl?: string; queueTimeoutUrl?: string }
  tax?: { resultUrl?: string; queueTimeoutUrl?: string; partyA?: string }
  b2c?: { resultUrl?: string; queueTimeoutUrl?: string; partyA?: string }
  c2b?: {
    shortCode?: string
    confirmationUrl?: string
    validationUrl?: string
    responseType?: 'Completed' | 'Cancelled'
    apiVersion?: 'v1' | 'v2'
  }
  b2b?: { receiverShortCode?: string; callbackUrl?: string }

  onStkSuccess?: (data: StkSuccessPayload) => Awaitable<void>
  onStkFailure?: (data: StkFailurePayload) => Awaitable<void>
  onC2BValidation?: (
    payload: C2BValidationPayload,
  ) => Awaitable<import('../mpesa/c2b').C2BValidationResponse>
  onC2BConfirmation?: (payload: C2BConfirmationPayload) => Awaitable<void>
  onAccountBalanceResult?: (result: AccountBalanceResult) => Awaitable<void>
  onReversalResult?: (result: ReversalResult) => Awaitable<void>
  onTxStatusResult?: (result: TransactionStatusResult) => Awaitable<void>
  onTaxResult?: (result: TaxRemittanceResult) => Awaitable<void>
  onB2BCheckoutCallback?: (cb: B2BExpressCheckoutCallback) => Awaitable<void>
  onB2CResult?: (result: B2CResult) => Awaitable<void>
  onB2CDisbursementResult?: (result: B2CDisbursementResult) => Awaitable<void>
}

type Awaitable<T> = T | Promise<T>

export interface StkSuccessPayload {
  receiptNumber: string | null
  amount: number | null
  phone: string | null
  checkoutRequestId: string
  merchantRequestId: string
}

export interface StkFailurePayload {
  resultCode: number
  resultDesc: string
  checkoutRequestId: string
  merchantRequestId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getIP(req: FastifyRequest): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0]?.trim() ?? ''
  return req.ip ?? ''
}

// FIX: returns FastifyReply so callers can `return sendErr(reply, e)` and
// satisfy TypeScript's "not all code paths return a value" check (TS7030).
function sendErr(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof PesafyError) {
    return reply
      .status(err.statusCode ?? 400)
      .send({ ok: false, error: err.code, message: err.message })
  }
  return reply.status(500).send({ ok: false, error: 'INTERNAL_ERROR', message: 'Unexpected error' })
}

function resolveUrl(...candidates: (string | undefined)[]): string {
  return candidates.find((u) => u?.trim()) ?? ''
}

function fireHook(fn: (() => Promise<void>) | undefined, label: string): void {
  fn?.().catch((e) => console.error(`[pesafy/fastify] ${label} hook error:`, e))
}

// ── Plugin ─────────────────────────────────────────────────────────────────────

const mpesaPlugin: FastifyPluginAsync<MpesaFastifyConfig> = async (
  app: FastifyInstance,
  config: MpesaFastifyConfig,
) => {
  const mpesa = new Mpesa(config)
  const prefix = config.routePrefix ?? ''

  // Decorate the instance so the Mpesa client is accessible app-wide
  app.decorate('mpesa', mpesa)

  // ── STK Push ───────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      amount: number
      phoneNumber: string
      accountReference?: string
      transactionDesc?: string
      transactionType?: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
      partyB?: string
    }
  }>(`${prefix}/mpesa/stk/push`, async (req, reply) => {
    try {
      const { amount, phoneNumber, accountReference, transactionDesc, transactionType, partyB } =
        req.body
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!phoneNumber)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'phoneNumber is required' })

      const result = await mpesa.stkPush({
        amount,
        phoneNumber,
        callbackUrl: config.callbackUrl,
        accountReference: accountReference ?? `REF-${Date.now().toString(36).toUpperCase()}`,
        transactionDesc: transactionDesc ?? 'Payment',
        ...(transactionType !== undefined ? { transactionType } : {}),
        ...(partyB !== undefined ? { partyB } : {}),
      })
      return { ok: true, data: result }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  // ── STK Query ──────────────────────────────────────────────────────────────
  app.post<{ Body: { checkoutRequestId: string } }>(
    `${prefix}/mpesa/stk/query`,
    async (req, reply) => {
      try {
        const { checkoutRequestId } = req.body
        if (!checkoutRequestId)
          throw new PesafyError({
            code: 'VALIDATION_ERROR',
            message: 'checkoutRequestId is required',
          })
        return { ok: true, data: await mpesa.stkQuery({ checkoutRequestId }) }
      } catch (e) {
        return sendErr(reply, e)
      }
    },
  )

  // ── STK Callback ───────────────────────────────────────────────────────────
  app.post(`${prefix}/mpesa/stk/callback`, async (req) => {
    if (!config.skipIPCheck) {
      const ip = getIP(req)
      if (ip && !verifyWebhookIP(ip)) req.log.warn({ ip }, '[pesafy] STK callback from unknown IP')
    }

    const webhook = req.body as import('../mpesa/webhooks').StkPushWebhook
    const cb = webhook?.Body?.stkCallback
    if (!cb) return { ResultCode: 0, ResultDesc: 'Accepted' }

    if (isSuccessfulCallback(webhook)) {
      const payload: StkSuccessPayload = {
        receiptNumber: extractTransactionId(webhook),
        amount: extractAmount(webhook),
        phone: extractPhoneNumber(webhook),
        checkoutRequestId: cb.CheckoutRequestID,
        merchantRequestId: cb.MerchantRequestID,
      }
      req.log.info(payload, '[pesafy] STK success')
      fireHook(
        config.onStkSuccess ? () => Promise.resolve(config.onStkSuccess!(payload)) : undefined,
        'onStkSuccess',
      )
    } else {
      const payload: StkFailurePayload = {
        resultCode: cb.ResultCode,
        resultDesc: cb.ResultDesc,
        checkoutRequestId: cb.CheckoutRequestID,
        merchantRequestId: cb.MerchantRequestID,
      }
      req.log.warn(payload, '[pesafy] STK failure')
      fireHook(
        config.onStkFailure ? () => Promise.resolve(config.onStkFailure!(payload)) : undefined,
        'onStkFailure',
      )
    }
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── C2B Register URLs ──────────────────────────────────────────────────────
  app.post<{
    Body: {
      shortCode?: string
      confirmationUrl?: string
      validationUrl?: string
      responseType?: 'Completed' | 'Cancelled'
      apiVersion?: 'v1' | 'v2'
    }
  }>(`${prefix}/mpesa/c2b/register`, async (req, reply) => {
    try {
      const { shortCode, confirmationUrl, validationUrl, responseType, apiVersion } = req.body
      const sc = shortCode ?? config.c2b?.shortCode ?? ''
      const cu = confirmationUrl ?? config.c2b?.confirmationUrl ?? ''
      const vu = validationUrl ?? config.c2b?.validationUrl ?? ''
      if (!sc) throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'shortCode is required' })
      if (!cu)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'confirmationUrl is required' })
      if (!vu)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'validationUrl is required' })

      return {
        ok: true,
        data: await mpesa.registerC2BUrls({
          shortCode: sc,
          responseType: responseType ?? config.c2b?.responseType ?? 'Completed',
          confirmationUrl: cu,
          validationUrl: vu,
          apiVersion: apiVersion ?? config.c2b?.apiVersion ?? 'v2',
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  // ── C2B Simulate (sandbox) ─────────────────────────────────────────────────
  app.post<{
    Body: {
      commandId: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
      amount: number
      msisdn: string | number
      billRefNumber?: string
      shortCode?: string | number
    }
  }>(`${prefix}/mpesa/c2b/simulate`, async (req, reply) => {
    try {
      const { commandId, amount, msisdn, billRefNumber, shortCode } = req.body
      if (!commandId)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'commandId is required' })
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!msisdn)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'msisdn is required' })

      return {
        ok: true,
        data: await mpesa.simulateC2B({
          shortCode: shortCode ?? config.c2b?.shortCode ?? '',
          commandId,
          amount,
          msisdn,
          apiVersion: config.c2b?.apiVersion ?? 'v2',
          ...(billRefNumber !== undefined ? { billRefNumber } : {}),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  // ── C2B Validation webhook ─────────────────────────────────────────────────
  app.post(`${prefix}/mpesa/c2b/validation`, async (req) => {
    if (!config.skipIPCheck) {
      const ip = getIP(req)
      if (ip && !verifyWebhookIP(ip)) req.log.warn({ ip }, '[pesafy] C2B validation unknown IP')
    }
    const payload = req.body as C2BValidationPayload
    return config.onC2BValidation ? await config.onC2BValidation(payload) : acceptC2BValidation()
  })

  // ── C2B Confirmation webhook ───────────────────────────────────────────────
  app.post(`${prefix}/mpesa/c2b/confirmation`, async (req) => {
    const payload = req.body as C2BConfirmationPayload
    req.log.info(
      { txId: payload.TransID, amount: payload.TransAmount },
      '[pesafy] C2B confirmation',
    )
    fireHook(
      config.onC2BConfirmation
        ? () => Promise.resolve(config.onC2BConfirmation!(payload))
        : undefined,
      'onC2BConfirmation',
    )
    return { ResultCode: 0, ResultDesc: 'Success' }
  })

  // ── Account Balance ────────────────────────────────────────────────────────
  app.post<{
    Body: {
      partyA?: string
      identifierType?: '1' | '2' | '4'
      remarks?: string
      resultUrl?: string
      queueTimeoutUrl?: string
    }
  }>(`${prefix}/mpesa/balance/query`, async (req, reply) => {
    try {
      const { partyA, identifierType, remarks, resultUrl, queueTimeoutUrl } = req.body
      return {
        ok: true,
        data: await mpesa.accountBalance({
          partyA: partyA ?? config.balance?.partyA ?? '',
          identifierType: identifierType ?? '4',
          resultUrl: resolveUrl(resultUrl, config.balance?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            queueTimeoutUrl,
            config.balance?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(remarks !== undefined ? { remarks } : {}),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  app.post(`${prefix}/mpesa/balance/result`, async (req) => {
    const body = req.body as unknown
    if (isAccountBalanceSuccess(body as AccountBalanceResult)) {
      const raw = getAccountBalanceRawBalance(body as AccountBalanceResult)
      req.log.info(raw ? parseAccountBalance(raw) : body, '[pesafy] Account balance result')
    } else {
      req.log.warn(body, '[pesafy] Account balance failed')
    }
    fireHook(
      config.onAccountBalanceResult
        ? () => Promise.resolve(config.onAccountBalanceResult!(body as AccountBalanceResult))
        : undefined,
      'onAccountBalanceResult',
    )
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── Dynamic QR ─────────────────────────────────────────────────────────────
  app.post(`${prefix}/mpesa/qr/generate`, async (req, reply) => {
    try {
      return {
        ok: true,
        data: await mpesa.generateDynamicQR(
          req.body as import('../mpesa/dynamic-qr').DynamicQRRequest,
        ),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  // ── Reversal ───────────────────────────────────────────────────────────────
  app.post<{
    Body: {
      transactionId: string
      receiverParty: string
      amount: number
      remarks?: string
      occasion?: string
      resultUrl?: string
      queueTimeoutUrl?: string
    }
  }>(`${prefix}/mpesa/reversal/request`, async (req, reply) => {
    try {
      const {
        transactionId,
        receiverParty,
        amount,
        remarks,
        occasion,
        resultUrl,
        queueTimeoutUrl,
      } = req.body
      if (!transactionId)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'transactionId is required' })
      if (!receiverParty)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'receiverParty is required' })
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })

      return {
        ok: true,
        data: await mpesa.reverseTransaction({
          transactionId,
          receiverParty,
          amount,
          resultUrl: resolveUrl(resultUrl, config.reversal?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            queueTimeoutUrl,
            config.reversal?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(remarks !== undefined ? { remarks } : {}),
          ...(occasion !== undefined ? { occasion } : {}),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  app.post(`${prefix}/mpesa/reversal/result`, async (req) => {
    const body = req.body as unknown
    if (isReversalResult(body)) {
      if (isReversalSuccess(body))
        req.log.info({ txId: getReversalTransactionId(body) }, '[pesafy] Reversal success')
      else req.log.warn({ result: body.Result.ResultDesc }, '[pesafy] Reversal failed')
      fireHook(
        config.onReversalResult ? () => Promise.resolve(config.onReversalResult!(body)) : undefined,
        'onReversalResult',
      )
    }
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── Transaction Status ─────────────────────────────────────────────────────
  app.post<{
    Body: {
      transactionId?: string
      originalConversationId?: string
      partyA: string
      identifierType: '1' | '2' | '4'
      remarks?: string
      occasion?: string
      resultUrl?: string
      queueTimeoutUrl?: string
    }
  }>(`${prefix}/mpesa/tx-status/query`, async (req, reply) => {
    try {
      const {
        transactionId,
        originalConversationId,
        partyA,
        identifierType,
        remarks,
        occasion,
        resultUrl,
        queueTimeoutUrl,
      } = req.body
      return {
        ok: true,
        data: await mpesa.transactionStatus({
          ...(transactionId !== undefined ? { transactionId } : {}),
          ...(originalConversationId !== undefined ? { originalConversationId } : {}),
          partyA,
          identifierType,
          resultUrl: resolveUrl(resultUrl, config.txStatus?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            queueTimeoutUrl,
            config.txStatus?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(remarks !== undefined ? { remarks } : {}),
          ...(occasion !== undefined ? { occasion } : {}),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  app.post(`${prefix}/mpesa/tx-status/result`, async (req) => {
    const body = req.body as unknown
    if (isTransactionStatusResult(body)) {
      // FIX TS2769: pino expects (mergingObject, message), not (string, string)
      if (isTransactionStatusSuccess(body))
        req.log.info({ txId: body.Result.TransactionID }, '[pesafy] Tx-status success')
      else req.log.warn({ desc: body.Result.ResultDesc }, '[pesafy] Tx-status failed')
      fireHook(
        config.onTxStatusResult ? () => Promise.resolve(config.onTxStatusResult!(body)) : undefined,
        'onTxStatusResult',
      )
    }
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── Tax Remittance ─────────────────────────────────────────────────────────
  app.post<{
    Body: import('../mpesa/tax-remittance').TaxRemittanceRequest & { queueTimeoutUrl?: string }
  }>(`${prefix}/mpesa/tax/remit`, async (req, reply) => {
    try {
      const { amount, partyA, accountReference, remarks, partyB, queueTimeoutUrl, resultUrl } =
        req.body
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!accountReference)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'accountReference (KRA PRN) is required',
        })

      return {
        ok: true,
        data: await mpesa.remitTax({
          amount,
          partyA: partyA ?? config.tax?.partyA ?? '',
          accountReference,
          resultUrl: resolveUrl(resultUrl, config.tax?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            queueTimeoutUrl,
            config.tax?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(partyB !== undefined ? { partyB } : {}),
          ...(remarks !== undefined ? { remarks } : {}),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  app.post(`${prefix}/mpesa/tax/result`, async (req) => {
    const body = req.body as unknown
    if (isTaxRemittanceResult(body)) {
      // FIX TS2769: pino expects (mergingObject, message), not (string, string)
      if (isTaxRemittanceSuccess(body))
        req.log.info({ txId: body.Result.TransactionID }, '[pesafy] Tax success')
      else req.log.warn({ desc: body.Result.ResultDesc }, '[pesafy] Tax failed')
      fireHook(
        config.onTaxResult ? () => Promise.resolve(config.onTaxResult!(body)) : undefined,
        'onTaxResult',
      )
    }
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── B2B Express Checkout ───────────────────────────────────────────────────
  app.post<{
    Body: {
      primaryShortCode: string
      receiverShortCode?: string
      amount: number
      paymentRef: string
      partnerName: string
      callbackUrl?: string
      requestRefId?: string
    }
  }>(`${prefix}/mpesa/b2b/checkout`, async (req, reply) => {
    try {
      const {
        primaryShortCode,
        receiverShortCode,
        amount,
        paymentRef,
        partnerName,
        callbackUrl,
        requestRefId,
      } = req.body
      if (!primaryShortCode)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'primaryShortCode is required' })
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })

      const rsc = receiverShortCode ?? config.b2b?.receiverShortCode ?? ''
      const cbu = callbackUrl ?? config.b2b?.callbackUrl ?? ''
      if (!rsc)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'receiverShortCode is required',
        })
      if (!cbu)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'callbackUrl is required' })

      return {
        ok: true,
        data: await mpesa.b2bExpressCheckout({
          primaryShortCode,
          receiverShortCode: rsc,
          amount,
          paymentRef,
          callbackUrl: cbu,
          partnerName,
          ...(requestRefId !== undefined ? { requestRefId } : {}),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  app.post(`${prefix}/mpesa/b2b/callback`, async (req) => {
    const body = req.body as unknown
    if (!isB2BCheckoutCallback(body)) {
      req.log.warn('[pesafy] Unknown B2B callback payload')
      return { ResultCode: 0, ResultDesc: 'Accepted' }
    }
    const callback = body as B2BExpressCheckoutCallback
    if (isB2BCheckoutSuccess(callback))
      req.log.info(
        { txId: getB2BTransactionId(callback), amount: getB2BAmount(callback) },
        '[pesafy] B2B success',
      )
    else if (isB2BCheckoutCancelled(callback)) req.log.warn('[pesafy] B2B cancelled')
    else req.log.warn({ result: callback.resultDesc }, '[pesafy] B2B failed')
    fireHook(
      config.onB2BCheckoutCallback
        ? () => Promise.resolve(config.onB2BCheckoutCallback!(callback))
        : undefined,
      'onB2BCheckoutCallback',
    )
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── B2C Account Top-Up ─────────────────────────────────────────────────────
  app.post<{
    Body: {
      commandId: 'BusinessPayToBulk'
      amount: number
      partyA?: string
      partyB: string
      accountReference: string
      requester?: string
      remarks?: string
      resultUrl?: string
      queueTimeoutUrl?: string
    }
  }>(`${prefix}/mpesa/b2c/payment`, async (req, reply) => {
    try {
      const {
        commandId,
        amount,
        partyA,
        partyB,
        accountReference,
        requester,
        remarks,
        resultUrl,
        queueTimeoutUrl,
      } = req.body
      if (commandId !== 'BusinessPayToBulk')
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'commandId must be "BusinessPayToBulk"',
        })
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!partyB)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'partyB is required' })
      if (!accountReference)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'accountReference is required' })

      return {
        ok: true,
        data: await mpesa.b2cPayment({
          commandId,
          amount,
          partyA: partyA ?? config.b2c?.partyA ?? '',
          partyB,
          accountReference,
          resultUrl: resolveUrl(resultUrl, config.b2c?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            queueTimeoutUrl,
            config.b2c?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(requester !== undefined ? { requester } : {}),
          ...(remarks !== undefined ? { remarks } : {}),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  app.post(`${prefix}/mpesa/b2c/result`, async (req) => {
    const body = req.body as unknown
    if (isB2CResult(body)) {
      if (isB2CSuccess(body))
        req.log.info(
          { txId: getB2CTransactionId(body), amount: getB2CAmount(body) },
          '[pesafy] B2C success',
        )
      // FIX TS2769: pino expects (mergingObject, message), not (string, string)
      else req.log.warn({ desc: body.Result.ResultDesc }, '[pesafy] B2C failed')
      fireHook(
        config.onB2CResult ? () => Promise.resolve(config.onB2CResult!(body)) : undefined,
        'onB2CResult',
      )
    }
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── B2C Disbursement ───────────────────────────────────────────────────────
  app.post<{
    Body: import('../mpesa/b2c-disbursement').B2CDisbursementRequest & { queueTimeoutUrl?: string }
  }>(`${prefix}/mpesa/b2c/disburse`, async (req, reply) => {
    try {
      const { queueTimeoutUrl, resultUrl, ...rest } = req.body
      return {
        ok: true,
        data: await mpesa.b2cDisbursement({
          ...rest,
          resultUrl: resolveUrl(resultUrl, config.b2c?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            queueTimeoutUrl,
            config.b2c?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
        }),
      }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  app.post(`${prefix}/mpesa/b2c/disburse/result`, async (req) => {
    const body = req.body as unknown
    if (isB2CDisbursementResult(body)) {
      // FIX TS2769: pino expects (mergingObject, message), not (string, string)
      if (isB2CDisbursementSuccess(body))
        req.log.info({ txId: body.Result.TransactionID }, '[pesafy] Disbursement success')
      else req.log.warn({ desc: body.Result.ResultDesc }, '[pesafy] Disbursement failed')
      fireHook(
        config.onB2CDisbursementResult
          ? () => Promise.resolve(config.onB2CDisbursementResult!(body))
          : undefined,
        'onB2CDisbursementResult',
      )
    }
    return { ResultCode: 0, ResultDesc: 'Accepted' }
  })

  // ── Bill Manager ───────────────────────────────────────────────────────────
  app.post(`${prefix}/mpesa/bills/optin`, async (req, reply) => {
    try {
      return { ok: true, data: await mpesa.billManagerOptIn(req.body as never) }
    } catch (e) {
      return sendErr(reply, e)
    }
  })
  app.patch(`${prefix}/mpesa/bills/optin`, async (req, reply) => {
    try {
      return { ok: true, data: await mpesa.updateOptIn(req.body as never) }
    } catch (e) {
      return sendErr(reply, e)
    }
  })
  app.post(`${prefix}/mpesa/bills/invoice`, async (req, reply) => {
    try {
      return { ok: true, data: await mpesa.sendInvoice(req.body as never) }
    } catch (e) {
      return sendErr(reply, e)
    }
  })
  app.post(`${prefix}/mpesa/bills/invoice/bulk`, async (req, reply) => {
    try {
      return { ok: true, data: await mpesa.sendBulkInvoices(req.body as never) }
    } catch (e) {
      return sendErr(reply, e)
    }
  })
  app.delete(`${prefix}/mpesa/bills/invoice`, async (req, reply) => {
    try {
      return { ok: true, data: await mpesa.cancelInvoice(req.body as never) }
    } catch (e) {
      return sendErr(reply, e)
    }
  })
  app.delete(`${prefix}/mpesa/bills/invoice/bulk`, async (req, reply) => {
    try {
      return { ok: true, data: await mpesa.cancelBulkInvoices(req.body as never) }
    } catch (e) {
      return sendErr(reply, e)
    }
  })
  app.post(`${prefix}/mpesa/bills/reconcile`, async (req, reply) => {
    try {
      return { ok: true, data: await mpesa.reconcilePayment(req.body as never) }
    } catch (e) {
      return sendErr(reply, e)
    }
  })

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get(`${prefix}/mpesa/health`, async () => ({
    ok: true,
    environment: mpesa.environment,
    ts: new Date().toISOString(),
  }))
}

/**
 * Fastify plugin — register all M-PESA routes.
 * Wrapped with fastify-plugin so decorators are visible to the parent scope.
 *
 * @example
 * await app.register(registerMpesaPlugin, {
 *   consumerKey: '...',
 *   consumerSecret: '...',
 *   environment: 'sandbox',
 *   callbackUrl: 'https://yourdomain.com/mpesa/stk/callback',
 *   lipaNaMpesaShortCode: '174379',
 *   lipaNaMpesaPassKey: '...',
 * })
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fp = require('fastify-plugin') as typeof import('fastify-plugin').default
export const registerMpesaPlugin = fp(mpesaPlugin, {
  fastify: '>=4.0.0',
  name: 'pesafy-mpesa',
})

// ── Type augmentation ──────────────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyInstance {
    mpesa: Mpesa
  }
}
