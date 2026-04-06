/**
 * @file src/adapters/nextjs.ts
 * Next.js App Router adapter for pesafy.
 *
 * Provides factory functions for Route Handlers and a catch-all handler.
 * Works with the Web Request/Response API — no Next.js imports needed.
 *
 * Usage (one file per route):
 *   // app/api/mpesa/stk/push/route.ts
 *   export { POST } from 'pesafy/adapters/nextjs/stk-push'
 *
 * Usage (catch-all):
 *   // app/api/mpesa/[[...route]]/route.ts
 *   export const { POST, GET } = createMpesaHandlers(config)
 */

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

export interface MpesaNextConfig extends MpesaConfig {
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
type RouteHandler = (req: Request, ctx?: { params?: Record<string, string> }) => Promise<Response>

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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function ok(data: unknown): Response {
  return json({ ok: true, data })
}

function err(error: unknown): Response {
  if (error instanceof PesafyError) {
    return json({ ok: false, error: error.code, message: error.message }, error.statusCode ?? 400)
  }
  return json({ ok: false, error: 'INTERNAL_ERROR', message: 'Unexpected error' }, 500)
}

function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    ''
  )
}

function resolveUrl(...candidates: (string | undefined)[]): string {
  return candidates.find((u) => u?.trim()) ?? ''
}

function fireHook(fn: (() => Promise<void>) | undefined, label: string): void {
  fn?.().catch((e) => console.error(`[pesafy/nextjs] ${label} hook error:`, e))
}

function ipAllowed(req: Request, config: MpesaNextConfig): boolean {
  if (config.skipIPCheck) return true
  const ip = getIP(req)
  return !ip || verifyWebhookIP(ip)
}

// ── Individual route handler factories ────────────────────────────────────────

/**
 * Returns a POST Route Handler for STK Push initiation.
 *
 * @example
 * // app/api/mpesa/stk/push/route.ts
 * import { createStkPushHandler } from 'pesafy/adapters/nextjs'
 * export const POST = createStkPushHandler(config)
 */
export function createStkPushHandler(config: MpesaNextConfig): RouteHandler {
  const mpesa = new Mpesa(config)
  return async (req) => {
    try {
      const { amount, phoneNumber, accountReference, transactionDesc, transactionType, partyB } =
        (await req.json()) as {
          amount: number
          phoneNumber: string
          accountReference?: string
          transactionDesc?: string
          transactionType?: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
          partyB?: string
        }

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
      return ok(result)
    } catch (e) {
      return err(e)
    }
  }
}

/**
 * Returns a POST Route Handler for STK Push Query.
 *
 * @example
 * // app/api/mpesa/stk/query/route.ts
 * export const POST = createStkQueryHandler(config)
 */
export function createStkQueryHandler(config: MpesaNextConfig): RouteHandler {
  const mpesa = new Mpesa(config)
  return async (req) => {
    try {
      const { checkoutRequestId } = (await req.json()) as { checkoutRequestId: string }
      if (!checkoutRequestId)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'checkoutRequestId is required',
        })
      return ok(await mpesa.stkQuery({ checkoutRequestId }))
    } catch (e) {
      return err(e)
    }
  }
}

/**
 * Returns a POST Route Handler for STK Push callbacks.
 *
 * @example
 * // app/api/mpesa/stk/callback/route.ts
 * export const POST = createStkCallbackHandler(config)
 */
export function createStkCallbackHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    if (!ipAllowed(req, config)) {
      console.warn('[pesafy/nextjs] STK callback from unknown IP:', getIP(req))
    }

    const webhook = (await req.json()) as import('../mpesa/webhooks').StkPushWebhook
    const cb = webhook?.Body?.stkCallback
    if (!cb) return json({ ResultCode: 0, ResultDesc: 'Accepted' })

    if (isSuccessfulCallback(webhook)) {
      const payload: StkSuccessPayload = {
        receiptNumber: extractTransactionId(webhook),
        amount: extractAmount(webhook),
        phone: extractPhoneNumber(webhook),
        checkoutRequestId: cb.CheckoutRequestID,
        merchantRequestId: cb.MerchantRequestID,
      }
      console.info('[pesafy/nextjs] STK success:', payload)
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
      console.warn('[pesafy/nextjs] STK failure:', payload)
      fireHook(
        config.onStkFailure ? () => Promise.resolve(config.onStkFailure!(payload)) : undefined,
        'onStkFailure',
      )
    }
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

/**
 * Returns a POST Route Handler for C2B Validation.
 *
 * @example
 * // app/api/mpesa/c2b/validation/route.ts
 * export const POST = createC2BValidationHandler(config)
 */
export function createC2BValidationHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    if (!ipAllowed(req, config))
      console.warn('[pesafy/nextjs] C2B validation unknown IP:', getIP(req))
    const payload = (await req.json()) as C2BValidationPayload
    const response = config.onC2BValidation
      ? await config.onC2BValidation(payload)
      : acceptC2BValidation()
    return json(response)
  }
}

/**
 * Returns a POST Route Handler for C2B Confirmation.
 *
 * @example
 * // app/api/mpesa/c2b/confirmation/route.ts
 * export const POST = createC2BConfirmationHandler(config)
 */
export function createC2BConfirmationHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const payload = (await req.json()) as C2BConfirmationPayload
    console.info('[pesafy/nextjs] C2B confirmation:', {
      txId: payload.TransID,
      amount: payload.TransAmount,
    })
    fireHook(
      config.onC2BConfirmation
        ? () => Promise.resolve(config.onC2BConfirmation!(payload))
        : undefined,
      'onC2BConfirmation',
    )
    return json({ ResultCode: 0, ResultDesc: 'Success' })
  }
}

/**
 * Returns POST handler for Account Balance result callback.
 *
 * @example
 * // app/api/mpesa/balance/result/route.ts
 * export const POST = createBalanceResultHandler(config)
 */
export function createBalanceResultHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const body = (await req.json()) as unknown
    if (isAccountBalanceSuccess(body as AccountBalanceResult)) {
      const raw = getAccountBalanceRawBalance(body as AccountBalanceResult)
      console.info('[pesafy/nextjs] Balance result:', raw ? parseAccountBalance(raw) : body)
    } else {
      console.warn('[pesafy/nextjs] Balance failed:', body)
    }
    fireHook(
      config.onAccountBalanceResult
        ? () => Promise.resolve(config.onAccountBalanceResult!(body as AccountBalanceResult))
        : undefined,
      'onAccountBalanceResult',
    )
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

/**
 * Returns POST handler for Reversal result callback.
 *
 * @example
 * // app/api/mpesa/reversal/result/route.ts
 * export const POST = createReversalResultHandler(config)
 */
export function createReversalResultHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const body = (await req.json()) as unknown
    if (isReversalResult(body)) {
      if (isReversalSuccess(body))
        console.info('[pesafy/nextjs] Reversal success:', getReversalTransactionId(body))
      else console.warn('[pesafy/nextjs] Reversal failed:', body.Result.ResultDesc)
      fireHook(
        config.onReversalResult ? () => Promise.resolve(config.onReversalResult!(body)) : undefined,
        'onReversalResult',
      )
    }
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

/**
 * Returns POST handler for B2B Express Checkout callback.
 *
 * @example
 * // app/api/mpesa/b2b/callback/route.ts
 * export const POST = createB2BCallbackHandler(config)
 */
export function createB2BCallbackHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const body = (await req.json()) as unknown
    if (!isB2BCheckoutCallback(body)) {
      console.warn('[pesafy/nextjs] Unknown B2B callback')
      return json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }
    const callback = body as B2BExpressCheckoutCallback
    if (isB2BCheckoutSuccess(callback))
      console.info('[pesafy/nextjs] B2B success:', {
        txId: getB2BTransactionId(callback),
        amount: getB2BAmount(callback),
      })
    else if (isB2BCheckoutCancelled(callback)) console.warn('[pesafy/nextjs] B2B cancelled')
    else console.warn('[pesafy/nextjs] B2B failed:', callback.resultDesc)
    fireHook(
      config.onB2BCheckoutCallback
        ? () => Promise.resolve(config.onB2BCheckoutCallback!(callback))
        : undefined,
      'onB2BCheckoutCallback',
    )
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

/**
 * Returns POST handler for B2C result callback.
 *
 * @example
 * // app/api/mpesa/b2c/result/route.ts
 * export const POST = createB2CResultHandler(config)
 */
export function createB2CResultHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const body = (await req.json()) as unknown
    if (isB2CResult(body)) {
      if (isB2CSuccess(body))
        console.info('[pesafy/nextjs] B2C success:', {
          txId: getB2CTransactionId(body),
          amount: getB2CAmount(body),
        })
      else console.warn('[pesafy/nextjs] B2C failed:', body.Result.ResultDesc)
      fireHook(
        config.onB2CResult ? () => Promise.resolve(config.onB2CResult!(body)) : undefined,
        'onB2CResult',
      )
    }
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

/**
 * Returns POST handler for Tax Remittance result callback.
 *
 * @example
 * // app/api/mpesa/tax/result/route.ts
 * export const POST = createTaxResultHandler(config)
 */
export function createTaxResultHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const body = (await req.json()) as unknown
    if (isTaxRemittanceResult(body)) {
      if (isTaxRemittanceSuccess(body))
        console.info('[pesafy/nextjs] Tax success:', body.Result.TransactionID)
      else console.warn('[pesafy/nextjs] Tax failed:', body.Result.ResultDesc)
      fireHook(
        config.onTaxResult ? () => Promise.resolve(config.onTaxResult!(body)) : undefined,
        'onTaxResult',
      )
    }
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

/**
 * Returns POST handler for B2C Disbursement result callback.
 */
export function createB2CDisbursementResultHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const body = (await req.json()) as unknown
    if (isB2CDisbursementResult(body)) {
      if (isB2CDisbursementSuccess(body))
        console.info('[pesafy/nextjs] Disbursement success:', body.Result.TransactionID)
      else console.warn('[pesafy/nextjs] Disbursement failed:', body.Result.ResultDesc)
      fireHook(
        config.onB2CDisbursementResult
          ? () => Promise.resolve(config.onB2CDisbursementResult!(body))
          : undefined,
        'onB2CDisbursementResult',
      )
    }
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

/**
 * Returns POST handler for Transaction Status result callback.
 */
export function createTxStatusResultHandler(config: MpesaNextConfig): RouteHandler {
  return async (req) => {
    const body = (await req.json()) as unknown
    if (isTransactionStatusResult(body)) {
      if (isTransactionStatusSuccess(body))
        console.info('[pesafy/nextjs] Tx-status success:', body.Result.TransactionID)
      else console.warn('[pesafy/nextjs] Tx-status failed:', body.Result.ResultDesc)
      fireHook(
        config.onTxStatusResult ? () => Promise.resolve(config.onTxStatusResult!(body)) : undefined,
        'onTxStatusResult',
      )
    }
    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

// ── Catch-all handler factory ──────────────────────────────────────────────────

const _ROUTE_MAP = {
  '/mpesa/stk/push': 'stkPush',
  '/mpesa/stk/query': 'stkQuery',
  '/mpesa/stk/callback': 'stkCallback',
  '/mpesa/c2b/register': 'c2bRegister',
  '/mpesa/c2b/simulate': 'c2bSimulate',
  '/mpesa/c2b/validation': 'c2bValidation',
  '/mpesa/c2b/confirmation': 'c2bConfirmation',
  '/mpesa/balance/query': 'balanceQuery',
  '/mpesa/balance/result': 'balanceResult',
  '/mpesa/qr/generate': 'qrGenerate',
  '/mpesa/reversal/request': 'reversalRequest',
  '/mpesa/reversal/result': 'reversalResult',
  '/mpesa/tx-status/query': 'txStatusQuery',
  '/mpesa/tx-status/result': 'txStatusResult',
  '/mpesa/tax/remit': 'taxRemit',
  '/mpesa/tax/result': 'taxResult',
  '/mpesa/b2b/checkout': 'b2bCheckout',
  '/mpesa/b2b/callback': 'b2bCallback',
  '/mpesa/b2c/payment': 'b2cPayment',
  '/mpesa/b2c/result': 'b2cResult',
  '/mpesa/b2c/disburse': 'b2cDisburse',
  '/mpesa/b2c/disburse/result': 'b2cDisburseResult',
  '/mpesa/bills/optin': 'billsOptin',
  '/mpesa/bills/invoice': 'billsInvoice',
  '/mpesa/bills/invoice/bulk': 'billsInvoiceBulk',
  '/mpesa/bills/reconcile': 'billsReconcile',
  '/mpesa/health': 'health',
} as const

export interface MpesaHandlers {
  POST: RouteHandler
  GET: RouteHandler
  PATCH: RouteHandler
  DELETE: RouteHandler
}

/**
 * Creates all route handlers as a single catch-all.
 * Mount at `app/api/mpesa/[[...route]]/route.ts`.
 *
 * The request pathname is resolved relative to the segment after `/mpesa/`.
 *
 * @example
 * // app/api/mpesa/[[...route]]/route.ts
 * import { createMpesaHandlers } from 'pesafy/adapters/nextjs'
 * export const { POST, GET, PATCH, DELETE } = createMpesaHandlers(config)
 */
export function createMpesaHandlers(config: MpesaNextConfig): MpesaHandlers {
  const mpesa = new Mpesa(config)

  async function dispatch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    // Normalise: extract the /mpesa/... segment
    const path = url.pathname.replace(/^.*?(\/mpesa\/.*)$/, '$1').replace(/\/$/, '')

    switch (path) {
      // ── STK Push ─────────────────────────────────────────────────────────
      case '/mpesa/stk/push': {
        try {
          const {
            amount,
            phoneNumber,
            accountReference,
            transactionDesc,
            transactionType,
            partyB,
          } = (await req.json()) as {
            amount: number
            phoneNumber: string
            accountReference?: string
            transactionDesc?: string
            transactionType?: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
            partyB?: string
          }
          if (!amount || amount <= 0)
            throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
          if (!phoneNumber)
            throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'phoneNumber is required' })
          return ok(
            await mpesa.stkPush({
              amount,
              phoneNumber,
              callbackUrl: config.callbackUrl,
              accountReference: accountReference ?? `REF-${Date.now().toString(36).toUpperCase()}`,
              transactionDesc: transactionDesc ?? 'Payment',
              ...(transactionType !== undefined ? { transactionType } : {}),
              ...(partyB !== undefined ? { partyB } : {}),
            }),
          )
        } catch (e) {
          return err(e)
        }
      }

      // ── STK Query ────────────────────────────────────────────────────────
      case '/mpesa/stk/query': {
        try {
          const { checkoutRequestId } = (await req.json()) as { checkoutRequestId: string }
          if (!checkoutRequestId)
            throw new PesafyError({
              code: 'VALIDATION_ERROR',
              message: 'checkoutRequestId is required',
            })
          return ok(await mpesa.stkQuery({ checkoutRequestId }))
        } catch (e) {
          return err(e)
        }
      }

      // ── STK Callback ──────────────────────────────────────────────────────
      case '/mpesa/stk/callback':
        return createStkCallbackHandler(config)(req)

      // ── C2B Register URLs ─────────────────────────────────────────────────
      case '/mpesa/c2b/register': {
        try {
          const { shortCode, confirmationUrl, validationUrl, responseType, apiVersion } =
            (await req.json()) as {
              shortCode?: string
              confirmationUrl?: string
              validationUrl?: string
              responseType?: 'Completed' | 'Cancelled'
              apiVersion?: 'v1' | 'v2'
            }
          const sc = shortCode ?? config.c2b?.shortCode ?? ''
          const cu = confirmationUrl ?? config.c2b?.confirmationUrl ?? ''
          const vu = validationUrl ?? config.c2b?.validationUrl ?? ''
          if (!sc)
            throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'shortCode is required' })
          if (!cu)
            throw new PesafyError({
              code: 'VALIDATION_ERROR',
              message: 'confirmationUrl is required',
            })
          if (!vu)
            throw new PesafyError({
              code: 'VALIDATION_ERROR',
              message: 'validationUrl is required',
            })
          return ok(
            await mpesa.registerC2BUrls({
              shortCode: sc,
              confirmationUrl: cu,
              validationUrl: vu,
              responseType: responseType ?? config.c2b?.responseType ?? 'Completed',
              apiVersion: apiVersion ?? config.c2b?.apiVersion ?? 'v2',
            }),
          )
        } catch (e) {
          return err(e)
        }
      }

      // ── C2B Simulate ──────────────────────────────────────────────────────
      case '/mpesa/c2b/simulate': {
        try {
          const { commandId, amount, msisdn, billRefNumber, shortCode } = (await req.json()) as {
            commandId: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
            amount: number
            msisdn: string | number
            billRefNumber?: string
            shortCode?: string | number
          }
          return ok(
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
          return err(e)
        }
      }

      case '/mpesa/c2b/validation':
        return createC2BValidationHandler(config)(req)
      case '/mpesa/c2b/confirmation':
        return createC2BConfirmationHandler(config)(req)

      // ── Account Balance ───────────────────────────────────────────────────
      case '/mpesa/balance/query': {
        try {
          const body = (await req.json()) as {
            partyA?: string
            identifierType?: '1' | '2' | '4'
            remarks?: string
            resultUrl?: string
            queueTimeoutUrl?: string
          }
          return ok(
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
          return err(e)
        }
      }
      case '/mpesa/balance/result':
        return createBalanceResultHandler(config)(req)

      // ── Dynamic QR ────────────────────────────────────────────────────────
      case '/mpesa/qr/generate': {
        try {
          return ok(await mpesa.generateDynamicQR(await req.json()))
        } catch (e) {
          return err(e)
        }
      }

      // ── Reversal ──────────────────────────────────────────────────────────
      case '/mpesa/reversal/request': {
        try {
          const body = (await req.json()) as {
            transactionId: string
            receiverParty: string
            amount: number
            remarks?: string
            occasion?: string
            resultUrl?: string
            queueTimeoutUrl?: string
          }
          if (!body.transactionId)
            throw new PesafyError({
              code: 'VALIDATION_ERROR',
              message: 'transactionId is required',
            })
          if (!body.receiverParty)
            throw new PesafyError({
              code: 'VALIDATION_ERROR',
              message: 'receiverParty is required',
            })
          if (!body.amount || body.amount <= 0)
            throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
          return ok(
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
          return err(e)
        }
      }
      case '/mpesa/reversal/result':
        return createReversalResultHandler(config)(req)

      // ── Transaction Status ────────────────────────────────────────────────
      case '/mpesa/tx-status/query': {
        try {
          const body = (await req.json()) as {
            transactionId?: string
            originalConversationId?: string
            partyA: string
            identifierType: '1' | '2' | '4'
            remarks?: string
            occasion?: string
            resultUrl?: string
            queueTimeoutUrl?: string
          }
          return ok(
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
          return err(e)
        }
      }
      case '/mpesa/tx-status/result':
        return createTxStatusResultHandler(config)(req)

      // ── Tax Remittance ────────────────────────────────────────────────────
      case '/mpesa/tax/remit': {
        try {
          const body = (await req.json()) as {
            amount: number
            partyA?: string
            partyB?: string
            accountReference: string
            remarks?: string
            resultUrl?: string
            queueTimeoutUrl?: string
          }
          if (!body.amount || body.amount <= 0)
            throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
          if (!body.accountReference)
            throw new PesafyError({
              code: 'VALIDATION_ERROR',
              message: 'accountReference (KRA PRN) is required',
            })
          return ok(
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
          return err(e)
        }
      }
      case '/mpesa/tax/result':
        return createTaxResultHandler(config)(req)

      case '/mpesa/b2b/checkout': {
        try {
          const body = (await req.json()) as {
            primaryShortCode: string
            receiverShortCode?: string
            amount: number
            paymentRef: string
            partnerName: string
            callbackUrl?: string
            requestRefId?: string
          }
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
            await mpesa.b2bExpressCheckout({ ...body, receiverShortCode: rsc, callbackUrl: cbu }),
          )
        } catch (e) {
          return err(e)
        }
      }
      case '/mpesa/b2b/callback':
        return createB2BCallbackHandler(config)(req)

      case '/mpesa/b2c/payment': {
        try {
          const body = (await req.json()) as {
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
          if (body.commandId !== 'BusinessPayToBulk')
            throw new PesafyError({
              code: 'VALIDATION_ERROR',
              message: 'commandId must be "BusinessPayToBulk"',
            })
          if (!body.partyB)
            throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'partyB is required' })
          return ok(
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
          return err(e)
        }
      }
      case '/mpesa/b2c/result':
        return createB2CResultHandler(config)(req)

      case '/mpesa/b2c/disburse': {
        try {
          const body =
            (await req.json()) as import('../mpesa/b2c-disbursement').B2CDisbursementRequest & {
              queueTimeoutUrl?: string
            }
          const { queueTimeoutUrl, resultUrl, ...rest } = body
          return ok(
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
          return err(e)
        }
      }
      case '/mpesa/b2c/disburse/result':
        return createB2CDisbursementResultHandler(config)(req)

      // ── Bill Manager ──────────────────────────────────────────────────────
      case '/mpesa/bills/optin': {
        try {
          return ok(await mpesa.billManagerOptIn(await req.json()))
        } catch (e) {
          return err(e)
        }
      }
      case '/mpesa/bills/invoice': {
        if (req.method === 'DELETE') {
          try {
            return ok(await mpesa.cancelInvoice(await req.json()))
          } catch (e) {
            return err(e)
          }
        }
        try {
          return ok(await mpesa.sendInvoice(await req.json()))
        } catch (e) {
          return err(e)
        }
      }
      case '/mpesa/bills/invoice/bulk': {
        if (req.method === 'DELETE') {
          try {
            return ok(await mpesa.cancelBulkInvoices(await req.json()))
          } catch (e) {
            return err(e)
          }
        }
        try {
          return ok(await mpesa.sendBulkInvoices(await req.json()))
        } catch (e) {
          return err(e)
        }
      }
      case '/mpesa/bills/reconcile': {
        try {
          return ok(await mpesa.reconcilePayment(await req.json()))
        } catch (e) {
          return err(e)
        }
      }

      // ── Health ────────────────────────────────────────────────────────────
      case '/mpesa/health':
        return json({ ok: true, environment: mpesa.environment, ts: new Date().toISOString() })

      default:
        return json({ ok: false, error: 'NOT_FOUND', message: `No handler for ${path}` }, 404)
    }
  }

  const POST: RouteHandler = (req) => dispatch(req)
  const GET: RouteHandler = (req) => dispatch(req)
  const PATCH: RouteHandler = (req) => dispatch(req)
  const DELETE: RouteHandler = (req) => dispatch(req)

  return { POST, GET, PATCH, DELETE }
}
