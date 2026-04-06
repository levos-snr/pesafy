/**
 * @file src/adapters/hono.ts
 * Hono adapter for pesafy — works on Node.js, Bun, Deno, and Cloudflare Workers.
 *
 * Usage:
 *   import { Hono } from 'hono'
 *   import { createMpesaHono } from 'pesafy/adapters/hono'
 *
 *   const app = new Hono()
 *   app.route('/api', createMpesaHono(config))
 */

import type { Context, Hono, MiddlewareHandler } from 'hono'
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
  type C2BValidationResponse,
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

export interface MpesaHonoConfig extends MpesaConfig {
  callbackUrl: string
  resultUrl?: string
  queueTimeoutUrl?: string
  skipIPCheck?: boolean

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
  onC2BValidation?: (payload: C2BValidationPayload) => Awaitable<C2BValidationResponse>
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

// ── Internal helpers ───────────────────────────────────────────────────────────

function getIP(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-real-ip') ??
    ''
  )
}

function ok(c: Context, data: unknown): Response {
  return c.json({ ok: true, data })
}

function sendErr(c: Context, err: unknown): Response {
  if (err instanceof PesafyError) {
    return c.json(
      { ok: false, error: err.code, message: err.message },
      (err.statusCode ?? 400) as 400 | 401 | 403 | 404 | 422 | 429 | 500,
    )
  }
  return c.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Unexpected error' }, 500)
}

function resolveUrl(...candidates: (string | undefined)[]): string {
  return candidates.find((u) => u?.trim()) ?? ''
}

function fireHook(fn: (() => Promise<void>) | undefined, label: string): void {
  fn?.().catch((e) => console.error(`[pesafy/hono] ${label} hook error:`, e))
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Creates a Hono app with all M-PESA routes.
 * Mount it on your main app with `app.route('/api', createMpesaHono(config))`.
 *
 * @example
 * import { Hono } from 'hono'
 * import { createMpesaHono } from 'pesafy/adapters/hono'
 *
 * const api = createMpesaHono({
 *   consumerKey: env.MPESA_CONSUMER_KEY,
 *   consumerSecret: env.MPESA_CONSUMER_SECRET,
 *   environment: 'sandbox',
 *   callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
 *   lipaNaMpesaShortCode: '174379',
 *   lipaNaMpesaPassKey: env.MPESA_PASSKEY,
 * })
 *
 * const app = new Hono()
 * app.route('/api', api)
 */
export function createMpesaHono(config: MpesaHonoConfig): Hono {
  // Dynamic import so Hono is a peer dependency
  const { Hono } = require('hono') as typeof import('hono')
  const app = new Hono()
  const mpesa = new Mpesa(config)

  // Expose mpesa on all requests via context variable
  app.use('*', async (c, next) => {
    c.set('mpesa', mpesa)
    await next()
  })

  // ── STK Push ───────────────────────────────────────────────────────────────
  app.post('/mpesa/stk/push', async (c) => {
    try {
      const { amount, phoneNumber, accountReference, transactionDesc, transactionType, partyB } =
        await c.req.json<{
          amount: number
          phoneNumber: string
          accountReference?: string
          transactionDesc?: string
          transactionType?: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
          partyB?: string
        }>()

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
      return ok(c, result)
    } catch (e) {
      return sendErr(c, e)
    }
  })

  // ── STK Query ──────────────────────────────────────────────────────────────
  app.post('/mpesa/stk/query', async (c) => {
    try {
      const { checkoutRequestId } = await c.req.json<{ checkoutRequestId: string }>()
      if (!checkoutRequestId)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'checkoutRequestId is required',
        })
      return ok(c, await mpesa.stkQuery({ checkoutRequestId }))
    } catch (e) {
      return sendErr(c, e)
    }
  })

  // ── STK Callback ───────────────────────────────────────────────────────────
  app.post('/mpesa/stk/callback', async (c) => {
    if (!config.skipIPCheck) {
      const ip = getIP(c)
      if (ip && !verifyWebhookIP(ip)) console.warn('[pesafy/hono] STK callback unknown IP:', ip)
    }

    const webhook = (await c.req.json()) as import('../mpesa/webhooks').StkPushWebhook
    const cb = webhook?.Body?.stkCallback
    if (!cb) return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    if (isSuccessfulCallback(webhook)) {
      const payload: StkSuccessPayload = {
        receiptNumber: extractTransactionId(webhook),
        amount: extractAmount(webhook),
        phone: extractPhoneNumber(webhook),
        checkoutRequestId: cb.CheckoutRequestID,
        merchantRequestId: cb.MerchantRequestID,
      }
      console.info('[pesafy/hono] STK success:', payload)
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
      console.warn('[pesafy/hono] STK failure:', payload)
      fireHook(
        config.onStkFailure ? () => Promise.resolve(config.onStkFailure!(payload)) : undefined,
        'onStkFailure',
      )
    }
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── C2B Register URLs ──────────────────────────────────────────────────────
  app.post('/mpesa/c2b/register', async (c) => {
    try {
      const { shortCode, confirmationUrl, validationUrl, responseType, apiVersion } =
        await c.req.json<{
          shortCode?: string
          confirmationUrl?: string
          validationUrl?: string
          responseType?: 'Completed' | 'Cancelled'
          apiVersion?: 'v1' | 'v2'
        }>()

      const sc = shortCode ?? config.c2b?.shortCode ?? ''
      const cu = confirmationUrl ?? config.c2b?.confirmationUrl ?? ''
      const vu = validationUrl ?? config.c2b?.validationUrl ?? ''
      if (!sc) throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'shortCode is required' })
      if (!cu)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'confirmationUrl is required' })
      if (!vu)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'validationUrl is required' })

      return ok(
        c,
        await mpesa.registerC2BUrls({
          shortCode: sc,
          responseType: responseType ?? config.c2b?.responseType ?? 'Completed',
          confirmationUrl: cu,
          validationUrl: vu,
          apiVersion: apiVersion ?? config.c2b?.apiVersion ?? 'v2',
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  // ── C2B Simulate ───────────────────────────────────────────────────────────
  app.post('/mpesa/c2b/simulate', async (c) => {
    try {
      const { commandId, amount, msisdn, billRefNumber, shortCode } = await c.req.json<{
        commandId: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
        amount: number
        msisdn: string | number
        billRefNumber?: string
        shortCode?: string | number
      }>()

      if (!commandId)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'commandId is required' })
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!msisdn)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'msisdn is required' })

      return ok(
        c,
        await mpesa.simulateC2B({
          shortCode: shortCode ?? config.c2b?.shortCode ?? '',
          commandId,
          amount,
          msisdn,
          apiVersion: config.c2b?.apiVersion ?? 'v2',
          ...(billRefNumber !== undefined ? { billRefNumber } : {}),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  // ── C2B Validation webhook ─────────────────────────────────────────────────
  app.post('/mpesa/c2b/validation', async (c) => {
    if (!config.skipIPCheck) {
      const ip = getIP(c)
      if (ip && !verifyWebhookIP(ip)) console.warn('[pesafy/hono] C2B validation unknown IP:', ip)
    }
    const payload = await c.req.json<C2BValidationPayload>()
    const response = config.onC2BValidation
      ? await config.onC2BValidation(payload)
      : acceptC2BValidation()
    return c.json(response)
  })

  // ── C2B Confirmation webhook ───────────────────────────────────────────────
  app.post('/mpesa/c2b/confirmation', async (c) => {
    const payload = await c.req.json<C2BConfirmationPayload>()
    console.info('[pesafy/hono] C2B confirmation:', {
      txId: payload.TransID,
      amount: payload.TransAmount,
    })
    fireHook(
      config.onC2BConfirmation
        ? () => Promise.resolve(config.onC2BConfirmation!(payload))
        : undefined,
      'onC2BConfirmation',
    )
    return c.json({ ResultCode: 0, ResultDesc: 'Success' })
  })

  // ── Dynamic QR ─────────────────────────────────────────────────────────────
  app.post('/mpesa/qr/generate', async (c) => {
    try {
      return ok(c, await mpesa.generateDynamicQR(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })

  // ── Account Balance ────────────────────────────────────────────────────────
  app.post('/mpesa/balance/query', async (c) => {
    try {
      const body = await c.req.json<{
        partyA?: string
        identifierType?: '1' | '2' | '4'
        remarks?: string
        resultUrl?: string
        queueTimeoutUrl?: string
      }>()
      return ok(
        c,
        await mpesa.accountBalance({
          partyA: body.partyA ?? config.balance?.partyA ?? '',
          identifierType: body.identifierType ?? '4',
          resultUrl: resolveUrl(body.resultUrl, config.balance?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            body.queueTimeoutUrl,
            config.balance?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  app.post('/mpesa/balance/result', async (c) => {
    const body = (await c.req.json()) as unknown
    if (isAccountBalanceSuccess(body as AccountBalanceResult)) {
      const raw = getAccountBalanceRawBalance(body as AccountBalanceResult)
      console.info('[pesafy/hono] Balance result:', raw ? parseAccountBalance(raw) : body)
    } else {
      console.warn('[pesafy/hono] Balance failed:', body)
    }
    fireHook(
      config.onAccountBalanceResult
        ? () => Promise.resolve(config.onAccountBalanceResult!(body as AccountBalanceResult))
        : undefined,
      'onAccountBalanceResult',
    )
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Reversal ───────────────────────────────────────────────────────────────
  app.post('/mpesa/reversal/request', async (c) => {
    try {
      const body = await c.req.json<{
        transactionId: string
        receiverParty: string
        amount: number
        remarks?: string
        occasion?: string
        resultUrl?: string
        queueTimeoutUrl?: string
      }>()
      if (!body.transactionId)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'transactionId is required' })
      if (!body.receiverParty)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'receiverParty is required' })
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })

      return ok(
        c,
        await mpesa.reverseTransaction({
          transactionId: body.transactionId,
          receiverParty: body.receiverParty,
          amount: body.amount,
          resultUrl: resolveUrl(body.resultUrl, config.reversal?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            body.queueTimeoutUrl,
            config.reversal?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
          ...(body.occasion !== undefined ? { occasion: body.occasion } : {}),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  app.post('/mpesa/reversal/result', async (c) => {
    const body = (await c.req.json()) as unknown
    if (isReversalResult(body)) {
      if (isReversalSuccess(body))
        console.info('[pesafy/hono] Reversal success:', getReversalTransactionId(body))
      else console.warn('[pesafy/hono] Reversal failed:', body.Result.ResultDesc)
      fireHook(
        config.onReversalResult ? () => Promise.resolve(config.onReversalResult!(body)) : undefined,
        'onReversalResult',
      )
    }
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Transaction Status ─────────────────────────────────────────────────────
  app.post('/mpesa/tx-status/query', async (c) => {
    try {
      const body = await c.req.json<{
        transactionId?: string
        originalConversationId?: string
        partyA: string
        identifierType: '1' | '2' | '4'
        remarks?: string
        occasion?: string
        resultUrl?: string
        queueTimeoutUrl?: string
      }>()
      return ok(
        c,
        await mpesa.transactionStatus({
          ...(body.transactionId !== undefined ? { transactionId: body.transactionId } : {}),
          ...(body.originalConversationId !== undefined
            ? { originalConversationId: body.originalConversationId }
            : {}),
          partyA: body.partyA,
          identifierType: body.identifierType,
          resultUrl: resolveUrl(body.resultUrl, config.txStatus?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            body.queueTimeoutUrl,
            config.txStatus?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
          ...(body.occasion !== undefined ? { occasion: body.occasion } : {}),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  app.post('/mpesa/tx-status/result', async (c) => {
    const body = (await c.req.json()) as unknown
    if (isTransactionStatusResult(body)) {
      if (isTransactionStatusSuccess(body))
        console.info('[pesafy/hono] Tx-status success:', body.Result.TransactionID)
      else console.warn('[pesafy/hono] Tx-status failed:', body.Result.ResultDesc)
      fireHook(
        config.onTxStatusResult ? () => Promise.resolve(config.onTxStatusResult!(body)) : undefined,
        'onTxStatusResult',
      )
    }
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Tax Remittance ─────────────────────────────────────────────────────────
  app.post('/mpesa/tax/remit', async (c) => {
    try {
      const body = await c.req.json<{
        amount: number
        partyA?: string
        partyB?: string
        accountReference: string
        remarks?: string
        resultUrl?: string
        queueTimeoutUrl?: string
      }>()
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!body.accountReference)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'accountReference (KRA PRN) is required',
        })

      return ok(
        c,
        await mpesa.remitTax({
          amount: body.amount,
          partyA: body.partyA ?? config.tax?.partyA ?? '',
          accountReference: body.accountReference,
          resultUrl: resolveUrl(body.resultUrl, config.tax?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            body.queueTimeoutUrl,
            config.tax?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(body.partyB !== undefined ? { partyB: body.partyB } : {}),
          ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  app.post('/mpesa/tax/result', async (c) => {
    const body = (await c.req.json()) as unknown
    if (isTaxRemittanceResult(body)) {
      if (isTaxRemittanceSuccess(body))
        console.info('[pesafy/hono] Tax success:', body.Result.TransactionID)
      else console.warn('[pesafy/hono] Tax failed:', body.Result.ResultDesc)
      fireHook(
        config.onTaxResult ? () => Promise.resolve(config.onTaxResult!(body)) : undefined,
        'onTaxResult',
      )
    }
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── B2B Express Checkout ───────────────────────────────────────────────────
  app.post('/mpesa/b2b/checkout', async (c) => {
    try {
      const body = await c.req.json<{
        primaryShortCode: string
        receiverShortCode?: string
        amount: number
        paymentRef: string
        partnerName: string
        callbackUrl?: string
        requestRefId?: string
      }>()
      if (!body.primaryShortCode)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'primaryShortCode is required' })
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })

      const rsc = body.receiverShortCode ?? config.b2b?.receiverShortCode ?? ''
      const cbu = body.callbackUrl ?? config.b2b?.callbackUrl ?? ''
      if (!rsc)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'receiverShortCode is required',
        })
      if (!cbu)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'callbackUrl is required' })

      return ok(
        c,
        await mpesa.b2bExpressCheckout({
          primaryShortCode: body.primaryShortCode,
          receiverShortCode: rsc,
          amount: body.amount,
          paymentRef: body.paymentRef,
          callbackUrl: cbu,
          partnerName: body.partnerName,
          ...(body.requestRefId !== undefined ? { requestRefId: body.requestRefId } : {}),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  app.post('/mpesa/b2b/callback', async (c) => {
    const body = (await c.req.json()) as unknown
    if (!isB2BCheckoutCallback(body)) {
      console.warn('[pesafy/hono] Unknown B2B callback')
      return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
    const callback = body as B2BExpressCheckoutCallback
    if (isB2BCheckoutSuccess(callback))
      console.info('[pesafy/hono] B2B success:', {
        txId: getB2BTransactionId(callback),
        amount: getB2BAmount(callback),
      })
    else if (isB2BCheckoutCancelled(callback)) console.warn('[pesafy/hono] B2B cancelled')
    else console.warn('[pesafy/hono] B2B failed:', callback.resultDesc)
    fireHook(
      config.onB2BCheckoutCallback
        ? () => Promise.resolve(config.onB2BCheckoutCallback!(callback))
        : undefined,
      'onB2BCheckoutCallback',
    )
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── B2C Account Top-Up ─────────────────────────────────────────────────────
  app.post('/mpesa/b2c/payment', async (c) => {
    try {
      const body = await c.req.json<{
        commandId: 'BusinessPayToBulk'
        amount: number
        partyA?: string
        partyB: string
        accountReference: string
        requester?: string
        remarks?: string
        resultUrl?: string
        queueTimeoutUrl?: string
      }>()
      if (body.commandId !== 'BusinessPayToBulk')
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'commandId must be "BusinessPayToBulk"',
        })
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!body.partyB)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'partyB is required' })
      if (!body.accountReference)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'accountReference is required' })

      return ok(
        c,
        await mpesa.b2cPayment({
          commandId: 'BusinessPayToBulk',
          amount: body.amount,
          partyA: body.partyA ?? config.b2c?.partyA ?? '',
          partyB: body.partyB,
          accountReference: body.accountReference,
          resultUrl: resolveUrl(body.resultUrl, config.b2c?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            body.queueTimeoutUrl,
            config.b2c?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
          ...(body.requester !== undefined ? { requester: body.requester } : {}),
          ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  app.post('/mpesa/b2c/result', async (c) => {
    const body = (await c.req.json()) as unknown
    if (isB2CResult(body)) {
      if (isB2CSuccess(body))
        console.info('[pesafy/hono] B2C success:', {
          txId: getB2CTransactionId(body),
          amount: getB2CAmount(body),
        })
      else console.warn('[pesafy/hono] B2C failed:', body.Result.ResultDesc)
      fireHook(
        config.onB2CResult ? () => Promise.resolve(config.onB2CResult!(body)) : undefined,
        'onB2CResult',
      )
    }
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── B2C Disbursement ───────────────────────────────────────────────────────
  app.post('/mpesa/b2c/disburse', async (c) => {
    try {
      const body = await c.req.json<
        import('../mpesa/b2c-disbursement').B2CDisbursementRequest & { queueTimeoutUrl?: string }
      >()
      const { queueTimeoutUrl, resultUrl, ...rest } = body
      return ok(
        c,
        await mpesa.b2cDisbursement({
          ...rest,
          resultUrl: resolveUrl(resultUrl, config.b2c?.resultUrl, config.resultUrl),
          queueTimeOutUrl: resolveUrl(
            queueTimeoutUrl,
            config.b2c?.queueTimeoutUrl,
            config.queueTimeoutUrl,
          ),
        }),
      )
    } catch (e) {
      return sendErr(c, e)
    }
  })

  app.post('/mpesa/b2c/disburse/result', async (c) => {
    const body = (await c.req.json()) as unknown
    if (isB2CDisbursementResult(body)) {
      if (isB2CDisbursementSuccess(body))
        console.info('[pesafy/hono] Disbursement success:', body.Result.TransactionID)
      else console.warn('[pesafy/hono] Disbursement failed:', body.Result.ResultDesc)
      fireHook(
        config.onB2CDisbursementResult
          ? () => Promise.resolve(config.onB2CDisbursementResult!(body))
          : undefined,
        'onB2CDisbursementResult',
      )
    }
    return c.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Bill Manager ───────────────────────────────────────────────────────────
  app.post('/mpesa/bills/optin', async (c) => {
    try {
      return ok(c, await mpesa.billManagerOptIn(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })
  app.patch('/mpesa/bills/optin', async (c) => {
    try {
      return ok(c, await mpesa.updateOptIn(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })
  app.post('/mpesa/bills/invoice', async (c) => {
    try {
      return ok(c, await mpesa.sendInvoice(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })
  app.post('/mpesa/bills/invoice/bulk', async (c) => {
    try {
      return ok(c, await mpesa.sendBulkInvoices(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })
  app.delete('/mpesa/bills/invoice', async (c) => {
    try {
      return ok(c, await mpesa.cancelInvoice(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })
  app.delete('/mpesa/bills/invoice/bulk', async (c) => {
    try {
      return ok(c, await mpesa.cancelBulkInvoices(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })
  app.post('/mpesa/bills/reconcile', async (c) => {
    try {
      return ok(c, await mpesa.reconcilePayment(await c.req.json()))
    } catch (e) {
      return sendErr(c, e)
    }
  })

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/mpesa/health', (c) =>
    c.json({ ok: true, environment: mpesa.environment, ts: new Date().toISOString() }),
  )

  return app
}

// ── Middleware helper ──────────────────────────────────────────────────────────

/**
 * Returns a Hono middleware that injects an Mpesa instance into context.
 * Use when you want to call the SDK directly inside your own route handlers.
 */
export function mpesaMiddleware(config: MpesaHonoConfig): MiddlewareHandler {
  const mpesa = new Mpesa(config)
  return async (c, next) => {
    c.set('mpesa', mpesa)
    await next()
  }
}

// ── Type augmentation ──────────────────────────────────────────────────────────

declare module 'hono' {
  interface ContextVariableMap {
    mpesa: Mpesa
  }
}
