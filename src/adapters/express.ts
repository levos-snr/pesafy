/**
 * @file src/adapters/express.ts
 * Express adapter for pesafy — full M-PESA Daraja surface.
 *
 * Usage:
 *   import express from 'express'
 *   import { createMpesaRouter } from 'pesafy/adapters/express'
 *
 *   const app = express()
 *   app.use(express.json())
 *   app.use(createMpesaRouter(config))
 */

import type { NextFunction, Request, RequestHandler, Response, Router } from 'express'
import { Mpesa } from '../mpesa'
import type { MpesaConfig } from '../mpesa/types'
import {
  type AccountBalanceRequest,
  type AccountBalanceResult,
  getAccountBalanceRawBalance,
  isAccountBalanceSuccess,
  parseAccountBalance,
} from '../mpesa/account-balance'
import {
  type B2BExpressCheckoutCallback,
  getB2BAmount,
  getB2BConversationId,
  getB2BTransactionId,
  isB2BCheckoutCallback,
  isB2BCheckoutCancelled,
  isB2BCheckoutSuccess,
} from '../mpesa/b2b-express-checkout'
import {
  type B2CResult,
  getB2CAmount,
  getB2COriginatorConversationId,
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
  type ReversalRequest,
  type ReversalResult,
  isReversalResult,
  isReversalSuccess,
  getReversalTransactionId,
} from '../mpesa/reversal'
import {
  type TaxRemittanceRequest,
  type TaxRemittanceResult,
  isTaxRemittanceResult,
  isTaxRemittanceSuccess,
} from '../mpesa/tax-remittance'
import {
  type TransactionStatusResult,
  isTransactionStatusResult,
  isTransactionStatusSuccess,
} from '../mpesa/transaction-status'
import {
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  isSuccessfulCallback,
  verifyWebhookIP,
} from '../mpesa/webhooks'
import { PesafyError } from '../utils/errors'

// ── Config ─────────────────────────────────────────────────────────────────────

export interface MpesaExpressConfig extends MpesaConfig {
  /** STK Push callback URL (required) */
  callbackUrl: string
  /** Default ResultURL for async APIs (balance, reversal, tx-status, b2c, tax) */
  resultUrl?: string
  /** Default QueueTimeOutURL */
  queueTimeoutUrl?: string
  /** Skip Safaricom IP whitelist check (local dev only) */
  skipIPCheck?: boolean
  /** Prefix for all routes — default "" */
  routePrefix?: string

  // ── Per-API URL overrides ──────────────────────────────────────────────────
  balance?: { resultUrl?: string; queueTimeoutUrl?: string; shortCode?: string }
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

  // ── Lifecycle hooks ────────────────────────────────────────────────────────
  onStkSuccess?: (data: StkSuccessPayload) => Awaitable<void>
  onStkFailure?: (data: StkFailurePayload) => Awaitable<void>
  onC2BValidation?: (payload: C2BValidationPayload) => Awaitable<C2BValidationResponse>
  onC2BConfirmation?: (payload: C2BConfirmationPayload) => Awaitable<void>
  onAccountBalanceResult?: (result: AccountBalanceResult) => Awaitable<void>
  onReversalResult?: (result: ReversalResult) => Awaitable<void>
  onTxStatusResult?: (result: TransactionStatusResult) => Awaitable<void>
  onTaxResult?: (result: TaxRemittanceResult) => Awaitable<void>
  onB2BCheckoutCallback?: (callback: B2BExpressCheckoutCallback) => Awaitable<void>
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

function getIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip ?? ''
  )
}

function sendError(res: Response, error: unknown): void {
  if (res.headersSent) return
  if (error instanceof PesafyError) {
    res.status(error.statusCode ?? 400).json({
      ok: false,
      error: error.code,
      message: error.message,
    })
    return
  }
  res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: 'Unexpected server error' })
}

function resolveUrl(
  explicit: string | undefined,
  override: string | undefined,
  fallback: string | undefined,
  label: string,
): string {
  const resolved = explicit ?? override ?? fallback ?? ''
  if (!resolved) {
    throw new PesafyError({
      code: 'VALIDATION_ERROR',
      message: `${label} is required. Set it in config or include it in the request body.`,
    })
  }
  return resolved
}

function fireHook(fn: (() => Promise<void>) | undefined, label: string): void {
  if (!fn) return
  fn().catch((err) => console.error(`[pesafy] ${label} hook error:`, err))
}

function ipGuard(req: Request, config: MpesaExpressConfig): boolean {
  if (config.skipIPCheck) return true
  const ip = getIP(req)
  return !ip || verifyWebhookIP(ip)
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Creates an Express Router with all M-PESA Daraja routes mounted.
 *
 * @example
 * import express from 'express'
 * import { createMpesaRouter } from 'pesafy/adapters/express'
 *
 * const app = express()
 * app.use(express.json())
 * app.use('/api', createMpesaRouter({
 *   consumerKey: process.env.MPESA_CONSUMER_KEY!,
 *   consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
 *   environment: 'sandbox',
 *   callbackUrl: 'https://yourdomain.com/api/mpesa/stk/callback',
 *   lipaNaMpesaShortCode: '174379',
 *   lipaNaMpesaPassKey: process.env.MPESA_PASSKEY!,
 * }))
 */
export function createMpesaRouter(config: MpesaExpressConfig, router?: Router): Router {
  const { Router: expressRouter } = require('express') as typeof import('express')
  const r: Router = router ?? expressRouter()
  const mpesa = new Mpesa(config)
  const prefix = config.routePrefix ?? ''

  // ── STK Push ───────────────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/stk/push`,
    asyncHandler(async (req, res) => {
      const { amount, phoneNumber, accountReference, transactionDesc, transactionType, partyB } =
        req.body as {
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

      res.json({ ok: true, data: result })
    }),
  )

  // ── STK Query ──────────────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/stk/query`,
    asyncHandler(async (req, res) => {
      const { checkoutRequestId } = req.body as { checkoutRequestId: string }
      if (!checkoutRequestId)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'checkoutRequestId is required',
        })
      const result = await mpesa.stkQuery({ checkoutRequestId })
      res.json({ ok: true, data: result })
    }),
  )

  // ── STK Callback ───────────────────────────────────────────────────────────
  r.post(`${prefix}/mpesa/stk/callback`, (req: Request, res: Response) => {
    if (!ipGuard(req, config)) {
      console.warn('[pesafy] STK callback from unknown IP:', getIP(req))
    }

    const webhook = req.body as import('../mpesa/webhooks').StkPushWebhook
    const cb = webhook?.Body?.stkCallback
    if (!cb) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    if (isSuccessfulCallback(webhook)) {
      const payload: StkSuccessPayload = {
        receiptNumber: extractTransactionId(webhook),
        amount: extractAmount(webhook),
        phone: extractPhoneNumber(webhook),
        checkoutRequestId: cb.CheckoutRequestID,
        merchantRequestId: cb.MerchantRequestID,
      }
      console.info('[pesafy] STK success:', payload)
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
      console.warn('[pesafy] STK failure:', payload)
      fireHook(
        config.onStkFailure ? () => Promise.resolve(config.onStkFailure!(payload)) : undefined,
        'onStkFailure',
      )
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── C2B Register URLs ──────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/c2b/register`,
    asyncHandler(async (req, res) => {
      const {
        shortCode = config.c2b?.shortCode,
        confirmationUrl = config.c2b?.confirmationUrl,
        validationUrl = config.c2b?.validationUrl,
        responseType = config.c2b?.responseType ?? 'Completed',
        apiVersion = config.c2b?.apiVersion ?? 'v2',
      } = req.body as {
        shortCode?: string
        confirmationUrl?: string
        validationUrl?: string
        responseType?: 'Completed' | 'Cancelled'
        apiVersion?: 'v1' | 'v2'
      }

      if (!shortCode)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'shortCode is required' })
      if (!confirmationUrl)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'confirmationUrl is required' })
      if (!validationUrl)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'validationUrl is required' })

      const result = await mpesa.registerC2BUrls({
        shortCode,
        responseType,
        confirmationUrl,
        validationUrl,
        apiVersion,
      })
      res.json({ ok: true, data: result })
    }),
  )

  // ── C2B Simulate (sandbox) ─────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/c2b/simulate`,
    asyncHandler(async (req, res) => {
      const { commandId, amount, msisdn, billRefNumber, shortCode, apiVersion } = req.body as {
        commandId: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
        amount: number
        msisdn: string | number
        billRefNumber?: string
        shortCode?: string | number
        apiVersion?: 'v1' | 'v2'
      }

      if (!commandId)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'commandId is required' })
      if (!amount || amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!msisdn)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'msisdn is required' })

      const result = await mpesa.simulateC2B({
        shortCode: shortCode ?? config.c2b?.shortCode ?? '',
        commandId,
        amount,
        msisdn,
        apiVersion: apiVersion ?? config.c2b?.apiVersion ?? 'v2',
        ...(billRefNumber !== undefined ? { billRefNumber } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  // ── C2B Validation webhook ─────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/c2b/validation`,
    asyncHandler(async (req, res) => {
      if (!ipGuard(req, config)) {
        console.warn('[pesafy] C2B validation from unknown IP:', getIP(req))
      }
      const payload = req.body as C2BValidationPayload
      const response = config.onC2BValidation
        ? await config.onC2BValidation(payload)
        : acceptC2BValidation()
      res.json(response)
    }),
  )

  // ── C2B Confirmation webhook ───────────────────────────────────────────────
  r.post(`${prefix}/mpesa/c2b/confirmation`, (req: Request, res: Response) => {
    const payload = req.body as C2BConfirmationPayload
    console.info('[pesafy] C2B confirmation:', {
      transactionId: payload.TransID,
      amount: payload.TransAmount,
      billRef: payload.BillRefNumber,
    })
    fireHook(
      config.onC2BConfirmation
        ? () => Promise.resolve(config.onC2BConfirmation!(payload))
        : undefined,
      'onC2BConfirmation',
    )
    res.json({ ResultCode: 0, ResultDesc: 'Success' })
  })

  // ── Account Balance ────────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/balance/query`,
    asyncHandler(async (req, res) => {
      const body = req.body as Partial<AccountBalanceRequest> & {
        resultUrl?: string
        queueTimeoutUrl?: string
      }
      const result = await mpesa.accountBalance({
        partyA: body.partyA ?? config.balance?.shortCode ?? '',
        identifierType: body.identifierType ?? '4',
        resultUrl: resolveUrl(
          body.resultUrl,
          config.balance?.resultUrl,
          config.resultUrl,
          'resultUrl',
        ),
        queueTimeOutUrl: resolveUrl(
          body.queueTimeoutUrl,
          config.balance?.queueTimeoutUrl,
          config.queueTimeoutUrl,
          'queueTimeoutUrl',
        ),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  r.post(`${prefix}/mpesa/balance/result`, (req: Request, res: Response) => {
    const body = req.body as unknown
    if (!isAccountBalanceSuccess(body as AccountBalanceResult)) {
      console.warn('[pesafy] Account balance failed:', body)
    } else {
      const raw = getAccountBalanceRawBalance(body as AccountBalanceResult)
      console.info('[pesafy] Account balance:', raw ? parseAccountBalance(raw) : body)
    }
    fireHook(
      config.onAccountBalanceResult
        ? () => Promise.resolve(config.onAccountBalanceResult!(body as AccountBalanceResult))
        : undefined,
      'onAccountBalanceResult',
    )
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Dynamic QR ─────────────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/qr/generate`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.generateDynamicQR(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  // ── Transaction Reversal ───────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/reversal/request`,
    asyncHandler(async (req, res) => {
      const body = req.body as Partial<ReversalRequest> & {
        resultUrl?: string
        queueTimeoutUrl?: string
      }
      if (!body.transactionId)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'transactionId is required' })
      if (!body.receiverParty)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'receiverParty is required' })
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })

      const result = await mpesa.reverseTransaction({
        transactionId: body.transactionId,
        receiverParty: body.receiverParty,
        amount: body.amount,
        resultUrl: resolveUrl(
          body.resultUrl,
          config.reversal?.resultUrl,
          config.resultUrl,
          'resultUrl',
        ),
        queueTimeOutUrl: resolveUrl(
          body.queueTimeoutUrl,
          config.reversal?.queueTimeoutUrl,
          config.queueTimeoutUrl,
          'queueTimeoutUrl',
        ),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        ...(body.occasion !== undefined ? { occasion: body.occasion } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  r.post(`${prefix}/mpesa/reversal/result`, (req: Request, res: Response) => {
    const body = req.body as unknown
    if (isReversalResult(body)) {
      if (isReversalSuccess(body)) {
        console.info('[pesafy] Reversal success:', { txId: getReversalTransactionId(body) })
      } else {
        console.warn('[pesafy] Reversal failed:', body.Result.ResultDesc)
      }
      fireHook(
        config.onReversalResult ? () => Promise.resolve(config.onReversalResult!(body)) : undefined,
        'onReversalResult',
      )
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Transaction Status ─────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/tx-status/query`,
    asyncHandler(async (req, res) => {
      const body = req.body as {
        transactionId?: string
        originalConversationId?: string
        partyA: string
        identifierType: '1' | '2' | '4'
        resultUrl?: string
        queueTimeoutUrl?: string
        remarks?: string
        occasion?: string
      }
      const result = await mpesa.transactionStatus({
        ...(body.transactionId !== undefined ? { transactionId: body.transactionId } : {}),
        ...(body.originalConversationId !== undefined
          ? { originalConversationId: body.originalConversationId }
          : {}),
        partyA: body.partyA,
        identifierType: body.identifierType,
        resultUrl: resolveUrl(
          body.resultUrl,
          config.txStatus?.resultUrl,
          config.resultUrl,
          'resultUrl',
        ),
        queueTimeOutUrl: resolveUrl(
          body.queueTimeoutUrl,
          config.txStatus?.queueTimeoutUrl,
          config.queueTimeoutUrl,
          'queueTimeoutUrl',
        ),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
        ...(body.occasion !== undefined ? { occasion: body.occasion } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  r.post(`${prefix}/mpesa/tx-status/result`, (req: Request, res: Response) => {
    const body = req.body as unknown
    if (isTransactionStatusResult(body)) {
      if (isTransactionStatusSuccess(body)) {
        console.info('[pesafy] Transaction status success:', body.Result.TransactionID)
      } else {
        console.warn('[pesafy] Transaction status failed:', body.Result.ResultDesc)
      }
      fireHook(
        config.onTxStatusResult ? () => Promise.resolve(config.onTxStatusResult!(body)) : undefined,
        'onTxStatusResult',
      )
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Tax Remittance ─────────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/tax/remit`,
    asyncHandler(async (req, res) => {
      const body = req.body as Partial<TaxRemittanceRequest> & {
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

      const result = await mpesa.remitTax({
        amount: body.amount,
        partyA: body.partyA ?? config.tax?.partyA ?? '',
        accountReference: body.accountReference,
        resultUrl: resolveUrl(body.resultUrl, config.tax?.resultUrl, config.resultUrl, 'resultUrl'),
        queueTimeOutUrl: resolveUrl(
          body.queueTimeoutUrl,
          config.tax?.queueTimeoutUrl,
          config.queueTimeoutUrl,
          'queueTimeoutUrl',
        ),
        ...(body.partyB !== undefined ? { partyB: body.partyB } : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  r.post(`${prefix}/mpesa/tax/result`, (req: Request, res: Response) => {
    const body = req.body as unknown
    if (isTaxRemittanceResult(body)) {
      if (isTaxRemittanceSuccess(body)) {
        console.info('[pesafy] Tax remittance success:', body.Result.TransactionID)
      } else {
        console.warn('[pesafy] Tax remittance failed:', body.Result.ResultDesc)
      }
      fireHook(
        config.onTaxResult ? () => Promise.resolve(config.onTaxResult!(body)) : undefined,
        'onTaxResult',
      )
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── B2B Express Checkout ───────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/b2b/checkout`,
    asyncHandler(async (req, res) => {
      const body = req.body as {
        primaryShortCode: string
        receiverShortCode?: string
        amount: number
        paymentRef: string
        partnerName: string
        callbackUrl?: string
        requestRefId?: string
      }

      if (!body.primaryShortCode)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'primaryShortCode is required' })
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!body.paymentRef)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'paymentRef is required' })
      if (!body.partnerName)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'partnerName is required' })

      const receiverShortCode = body.receiverShortCode ?? config.b2b?.receiverShortCode ?? ''
      if (!receiverShortCode)
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'receiverShortCode is required',
        })

      const callbackUrl = body.callbackUrl ?? config.b2b?.callbackUrl ?? ''
      if (!callbackUrl)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'callbackUrl is required' })

      const result = await mpesa.b2bExpressCheckout({
        primaryShortCode: body.primaryShortCode,
        receiverShortCode,
        amount: body.amount,
        paymentRef: body.paymentRef,
        callbackUrl,
        partnerName: body.partnerName,
        ...(body.requestRefId !== undefined ? { requestRefId: body.requestRefId } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  r.post(`${prefix}/mpesa/b2b/callback`, (req: Request, res: Response) => {
    const body = req.body as unknown
    if (!isB2BCheckoutCallback(body)) {
      console.warn('[pesafy] Unknown B2B callback payload')
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const callback = body as B2BExpressCheckoutCallback
    if (isB2BCheckoutSuccess(callback)) {
      console.info('[pesafy] B2B checkout success:', {
        txId: getB2BTransactionId(callback),
        conversationId: getB2BConversationId(callback),
        amount: getB2BAmount(callback),
      })
    } else if (isB2BCheckoutCancelled(callback)) {
      console.warn('[pesafy] B2B checkout cancelled by merchant')
    } else {
      console.warn('[pesafy] B2B checkout failed:', callback.resultDesc)
    }

    fireHook(
      config.onB2BCheckoutCallback
        ? () => Promise.resolve(config.onB2BCheckoutCallback!(callback))
        : undefined,
      'onB2BCheckoutCallback',
    )
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── B2C Account Top-Up ─────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/b2c/payment`,
    asyncHandler(async (req, res) => {
      const body = req.body as {
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
      if (!body.amount || body.amount <= 0)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'amount must be > 0' })
      if (!body.partyB)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'partyB is required' })
      if (!body.accountReference)
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'accountReference is required' })

      const result = await mpesa.b2cPayment({
        commandId: 'BusinessPayToBulk',
        amount: body.amount,
        partyA: body.partyA ?? config.b2c?.partyA ?? '',
        partyB: body.partyB,
        accountReference: body.accountReference,
        resultUrl: resolveUrl(body.resultUrl, config.b2c?.resultUrl, config.resultUrl, 'resultUrl'),
        queueTimeOutUrl: resolveUrl(
          body.queueTimeoutUrl,
          config.b2c?.queueTimeoutUrl,
          config.queueTimeoutUrl,
          'queueTimeoutUrl',
        ),
        ...(body.requester !== undefined ? { requester: body.requester } : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  r.post(`${prefix}/mpesa/b2c/result`, (req: Request, res: Response) => {
    const body = req.body as unknown
    if (isB2CResult(body)) {
      if (isB2CSuccess(body)) {
        console.info('[pesafy] B2C success:', {
          txId: getB2CTransactionId(body),
          amount: getB2CAmount(body),
          origConvId: getB2COriginatorConversationId(body),
        })
      } else {
        console.warn('[pesafy] B2C failed:', body.Result.ResultDesc)
      }
      fireHook(
        config.onB2CResult ? () => Promise.resolve(config.onB2CResult!(body)) : undefined,
        'onB2CResult',
      )
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── B2C Disbursement ───────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/b2c/disburse`,
    asyncHandler(async (req, res) => {
      const body = req.body as {
        originatorConversationId: string
        commandId: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment'
        amount: number
        partyA: string
        partyB: string
        remarks: string
        resultUrl?: string
        queueTimeoutUrl?: string
        occasion?: string
      }

      const result = await mpesa.b2cDisbursement({
        originatorConversationId: body.originatorConversationId,
        commandId: body.commandId,
        amount: body.amount,
        partyA: body.partyA,
        partyB: body.partyB,
        remarks: body.remarks,
        resultUrl: resolveUrl(body.resultUrl, config.b2c?.resultUrl, config.resultUrl, 'resultUrl'),
        queueTimeOutUrl: resolveUrl(
          body.queueTimeoutUrl,
          config.b2c?.queueTimeoutUrl,
          config.queueTimeoutUrl,
          'queueTimeoutUrl',
        ),
        ...(body.occasion !== undefined ? { occasion: body.occasion } : {}),
      })
      res.json({ ok: true, data: result })
    }),
  )

  r.post(`${prefix}/mpesa/b2c/disburse/result`, (req: Request, res: Response) => {
    const body = req.body as unknown
    if (isB2CDisbursementResult(body)) {
      if (isB2CDisbursementSuccess(body)) {
        console.info('[pesafy] B2C disbursement success:', body.Result.TransactionID)
      } else {
        console.warn('[pesafy] B2C disbursement failed:', body.Result.ResultDesc)
      }
      fireHook(
        config.onB2CDisbursementResult
          ? () => Promise.resolve(config.onB2CDisbursementResult!(body))
          : undefined,
        'onB2CDisbursementResult',
      )
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── Bill Manager ───────────────────────────────────────────────────────────
  r.post(
    `${prefix}/mpesa/bills/optin`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.billManagerOptIn(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  r.patch(
    `${prefix}/mpesa/bills/optin`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.updateOptIn(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  r.post(
    `${prefix}/mpesa/bills/invoice`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.sendInvoice(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  r.post(
    `${prefix}/mpesa/bills/invoice/bulk`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.sendBulkInvoices(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  r.delete(
    `${prefix}/mpesa/bills/invoice`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.cancelInvoice(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  r.delete(
    `${prefix}/mpesa/bills/invoice/bulk`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.cancelBulkInvoices(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  r.post(
    `${prefix}/mpesa/bills/reconcile`,
    asyncHandler(async (req, res) => {
      const result = await mpesa.reconcilePayment(req.body)
      res.json({ ok: true, data: result })
    }),
  )

  // ── Health check ───────────────────────────────────────────────────────────
  r.get(`${prefix}/mpesa/health`, (_req, res) => {
    res.json({ ok: true, environment: mpesa.environment, ts: new Date().toISOString() })
  })

  return r
}

// ── Error-catching async handler ───────────────────────────────────────────────

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => {
      if (!res.headersSent) sendError(res, err)
      else next(err)
    })
  }
}

// ── Named convenience alias (backwards compat) ─────────────────────────────────

export { createMpesaRouter as createMpesaExpressRouter }

export function createMpesaExpressClient(config: MpesaExpressConfig) {
  return { mpesa: new Mpesa(config) }
}
