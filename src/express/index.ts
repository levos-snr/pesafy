// src/express/index.ts
/**
 * Express-friendly helpers for Daraja APIs.
 *
 * Attaches handlers to an existing Express Router:
 *
 *   STK Push / M-Pesa Express:
 *     POST /mpesa/express/stk-push          — initiate STK Push
 *     POST /mpesa/express/stk-query         — check STK Push status
 *     POST /mpesa/express/callback          — receive STK Push callback from Safaricom
 *
 *   Transaction Status:
 *     POST /mpesa/transaction-status/query  — query M-Pesa transaction
 *     POST /mpesa/transaction-status/result — receive Transaction Status result from Safaricom
 *
 *   Customer to Business (C2B):
 *     POST /mpesa/c2b/register-url          — register Confirmation + Validation URLs
 *     POST /mpesa/c2b/simulate              — sandbox simulation (sandbox only)
 *     POST /mpesa/c2b/validation            — receive C2B validation from Safaricom
 *     POST /mpesa/c2b/confirmation          — receive C2B confirmation from Safaricom
 *
 *   Tax Remittance:
 *     POST /mpesa/tax/remit                 — initiate a tax remittance to KRA
 *     POST /mpesa/tax/result                — receive Tax Remittance result from Safaricom
 *
 *   B2B Express Checkout:
 *     POST /mpesa/b2b/checkout              — initiate USSD Push to merchant's till
 *     POST /mpesa/b2b/callback              — receive B2B transaction result from Safaricom
 *
 *   B2C Payment / Account Top Up:
 *     POST /mpesa/b2c/payment               — initiate B2C payment or account top-up
 *     POST /mpesa/b2c/result                — receive B2C result from Safaricom
 *
 * NOTE: This module does NOT import Express at runtime.
 * Pass in an existing Express Router and it attaches handlers.
 */

import type { NextFunction, Request, Response, Router } from 'express'
import { Mpesa } from '../mpesa'
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
  getB2CConversationId,
  getB2COriginatorConversationId,
  getB2CTransactionId,
  isB2CResult,
  isB2CSuccess,
} from '../mpesa/b2c'
import {
  acceptC2BValidation,
  type C2BConfirmationPayload,
  type C2BValidationPayload,
  type C2BValidationResponse,
} from '../mpesa/c2b'
import type { TaxRemittanceResult } from '../mpesa/tax-remittance'
import type { MpesaConfig } from '../mpesa/types'
import {
  extractAmount,
  extractPhoneNumber,
  extractTransactionId,
  handleWebhook,
  isSuccessfulCallback,
  verifyWebhookIP,
} from '../mpesa/webhooks'
import { PesafyError } from '../utils/errors'

// ── Config ────────────────────────────────────────────────────────────────────

export interface MpesaExpressConfig extends MpesaConfig {
  callbackUrl: string
  resultUrl?: string
  queueTimeOutUrl?: string
  c2bShortCode?: string
  c2bConfirmationUrl?: string
  c2bValidationUrl?: string
  c2bResponseType?: 'Completed' | 'Cancelled'
  c2bApiVersion?: 'v1' | 'v2'
  onC2BValidation?: (
    payload: C2BValidationPayload,
  ) => Promise<C2BValidationResponse> | C2BValidationResponse
  onC2BConfirmation?: (payload: C2BConfirmationPayload) => Promise<void> | void
  taxPartyA?: string
  taxResultUrl?: string
  taxQueueTimeOutUrl?: string
  onTaxRemittanceResult?: (result: TaxRemittanceResult) => Promise<void> | void
  b2bReceiverShortCode?: string
  b2bCallbackUrl?: string
  onB2BCheckoutCallback?: (callback: B2BExpressCheckoutCallback) => Promise<void> | void
  b2cPartyA?: string
  b2cResultUrl?: string
  b2cQueueTimeOutUrl?: string
  onB2CResult?: (result: B2CResult) => Promise<void> | void
  skipIPCheck?: boolean
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createMpesaExpressClient(config: MpesaExpressConfig): { mpesa: Mpesa } {
  if (!config.consumerKey || !config.consumerSecret) {
    throw new PesafyError({
      code: 'INVALID_CREDENTIALS',
      message: 'consumerKey and consumerSecret are required',
    })
  }
  if (!config.lipaNaMpesaShortCode || !config.lipaNaMpesaPassKey) {
    throw new PesafyError({
      code: 'VALIDATION_ERROR',
      message: 'lipaNaMpesaShortCode and lipaNaMpesaPassKey are required for STK Push',
    })
  }
  if (!config.callbackUrl) {
    throw new PesafyError({
      code: 'VALIDATION_ERROR',
      message: 'callbackUrl is required for STK Push callbacks',
    })
  }
  return { mpesa: new Mpesa(config) }
}

// ── Request body shapes ───────────────────────────────────────────────────────

interface StkPushBody {
  amount: number
  phoneNumber: string
  accountReference?: string
  transactionDesc?: string
  transactionType?: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
  partyB?: string
}

interface StkQueryBody {
  checkoutRequestId: string
}

interface TransactionStatusBody {
  transactionId: string
  partyA: string
  identifierType: '1' | '2' | '4'
  remarks?: string
  occasion?: string
}

interface C2BSimulateBody {
  commandId: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'
  amount: number
  msisdn: string | number
  billRefNumber?: string
  shortCode?: string | number
}

interface TaxRemitBody {
  amount: number
  partyA?: string
  accountReference: string
  remarks?: string
}

interface B2BCheckoutBody {
  primaryShortCode: string
  amount: number
  paymentRef: string
  partnerName: string
  receiverShortCode?: string
  callbackUrl?: string
  requestRefId?: string
}

interface B2CPaymentBody {
  commandId: 'BusinessPayToBulk' | 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment'
  amount: number
  partyA?: string
  partyB: string
  accountReference: string
  requester?: string
  remarks?: string
  resultUrl?: string
  queueTimeOutUrl?: string
}

// ── Error helper ──────────────────────────────────────────────────────────────

function sendError(res: Response, error: unknown): void {
  if (error instanceof PesafyError) {
    const status = error.statusCode ?? 400
    res.status(status).json({ error: error.code, message: error.message, statusCode: status })
    return
  }
  res.status(500).json({
    error: 'REQUEST_FAILED',
    message: 'An unexpected error occurred while processing the M-Pesa request',
  })
}

// ── IP helper ─────────────────────────────────────────────────────────────────

function extractRequestIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip ?? ''
  )
}

// ── Router factory ────────────────────────────────────────────────────────────

export function createMpesaExpressRouter(router: Router, config: MpesaExpressConfig): Router {
  const { mpesa } = createMpesaExpressClient(config)

  // ── POST /mpesa/express/stk-push ──────────────────────────────────────────
  router.post(
    '/mpesa/express/stk-push',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as StkPushBody

        if (!body || typeof body.amount !== 'number' || body.amount <= 0) {
          throw new PesafyError({
            code: 'VALIDATION_ERROR',
            message: 'amount must be a positive number',
          })
        }
        if (!body.phoneNumber) {
          throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'phoneNumber is required' })
        }

        // exactOptionalPropertyTypes: use conditional spreads for every optional
        // field. Passing `T | undefined` directly to a `?: T` parameter is
        // a compile error — the property must be absent, not set to undefined.
        const result = await mpesa.stkPush({
          amount: body.amount,
          phoneNumber: body.phoneNumber,
          callbackUrl: config.callbackUrl,
          accountReference:
            body.accountReference ?? `PESAFY-${Date.now().toString(36).toUpperCase()}`,
          transactionDesc: body.transactionDesc ?? 'Payment',
          ...(body.transactionType !== undefined ? { transactionType: body.transactionType } : {}),
          ...(body.partyB !== undefined ? { partyB: body.partyB } : {}),
        })

        res.status(200).json(result)
      } catch (error) {
        if (res.headersSent) return next(error)
        sendError(res, error)
      }
    },
  )

  // ── POST /mpesa/express/stk-query ─────────────────────────────────────────
  router.post(
    '/mpesa/express/stk-query',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as StkQueryBody
        if (!body?.checkoutRequestId) {
          throw new PesafyError({
            code: 'VALIDATION_ERROR',
            message: 'checkoutRequestId is required',
          })
        }
        const result = await mpesa.stkQuery({ checkoutRequestId: body.checkoutRequestId })
        res.status(200).json(result)
      } catch (error) {
        if (res.headersSent) return next(error)
        sendError(res, error)
      }
    },
  )

  // ── POST /mpesa/express/callback ──────────────────────────────────────────
  // noImplicitReturns: every branch of this non-async handler must explicitly
  // return. We add `return` before every `res.json()` call.
  router.post('/mpesa/express/callback', (req: Request, res: Response) => {
    const requestIP = extractRequestIP(req)

    // exactOptionalPropertyTypes: config.skipIPCheck is `?: boolean`.
    // Spreading with a conditional omits the key entirely when undefined.
    const result = handleWebhook(req.body, {
      requestIP,
      ...(config.skipIPCheck !== undefined ? { skipIPCheck: config.skipIPCheck } : {}),
    })

    if (!result.success) {
      console.error('[pesafy] STK Push webhook rejected:', result.error)
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const webhook = result.data as import('../mpesa/webhooks').StkPushWebhook
    const success = isSuccessfulCallback(webhook)

    if (success) {
      console.info('[pesafy] STK Push success:', {
        receiptNumber: extractTransactionId(webhook),
        amount: extractAmount(webhook),
        phone: extractPhoneNumber(webhook),
      })
    } else {
      console.warn('[pesafy] STK Push failed:', {
        resultCode: webhook.Body.stkCallback.ResultCode,
        resultDesc: webhook.Body.stkCallback.ResultDesc,
      })
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── POST /mpesa/transaction-status/query ──────────────────────────────────
  router.post(
    '/mpesa/transaction-status/query',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!config.resultUrl || !config.queueTimeOutUrl) {
          throw new PesafyError({
            code: 'VALIDATION_ERROR',
            message:
              'resultUrl and queueTimeOutUrl must be set in config to use transaction status routes',
          })
        }

        const body = req.body as TransactionStatusBody

        if (!body?.transactionId) {
          throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'transactionId is required' })
        }
        if (!body.partyA) {
          throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'partyA is required' })
        }
        if (!body.identifierType) {
          throw new PesafyError({
            code: 'VALIDATION_ERROR',
            message: 'identifierType is required: "1" | "2" | "4"',
          })
        }

        const result = await mpesa.transactionStatus({
          transactionId: body.transactionId,
          partyA: body.partyA,
          identifierType: body.identifierType,
          resultUrl: config.resultUrl,
          queueTimeOutUrl: config.queueTimeOutUrl,
          ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
          ...(body.occasion !== undefined ? { occasion: body.occasion } : {}),
        })

        res.status(200).json(result)
      } catch (error) {
        if (res.headersSent) return next(error)
        sendError(res, error)
      }
    },
  )

  // ── POST /mpesa/transaction-status/result ─────────────────────────────────
  router.post('/mpesa/transaction-status/result', (req: Request, res: Response) => {
    const body = req.body as import('../mpesa/transaction-status').TransactionStatusResult
    const result = body?.Result

    if (result) {
      if (result.ResultCode === 0) {
        console.info('[pesafy] Transaction Status result (success):', {
          transactionId: result.TransactionID,
          conversationId: result.ConversationID,
          resultDesc: result.ResultDesc,
        })
      } else {
        console.warn('[pesafy] Transaction Status result (failed):', {
          resultCode: result.ResultCode,
          resultDesc: result.ResultDesc,
          transactionId: result.TransactionID,
        })
      }
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── POST /mpesa/c2b/register-url ──────────────────────────────────────────
  router.post(
    '/mpesa/c2b/register-url',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = req.body as {
          shortCode?: string
          confirmationUrl?: string
          validationUrl?: string
          responseType?: 'Completed' | 'Cancelled'
          apiVersion?: 'v1' | 'v2'
        }

        const shortCode = body.shortCode ?? config.c2bShortCode
        const confirmationUrl = body.confirmationUrl ?? config.c2bConfirmationUrl
        const validationUrl = body.validationUrl ?? config.c2bValidationUrl
        const responseType = body.responseType ?? config.c2bResponseType ?? 'Completed'
        const apiVersion = body.apiVersion ?? config.c2bApiVersion ?? 'v2'

        if (!shortCode) {
          throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'shortCode is required' })
        }
        if (!confirmationUrl) {
          throw new PesafyError({
            code: 'VALIDATION_ERROR',
            message: 'confirmationUrl is required',
          })
        }
        if (!validationUrl) {
          throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'validationUrl is required' })
        }

        const result = await mpesa.registerC2BUrls({
          shortCode,
          responseType,
          confirmationUrl,
          validationUrl,
          apiVersion,
        })

        res.status(200).json(result)
      } catch (error) {
        if (res.headersSent) return next(error)
        sendError(res, error)
      }
    },
  )

  // ── POST /mpesa/c2b/simulate (SANDBOX ONLY) ───────────────────────────────
  router.post('/mpesa/c2b/simulate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as C2BSimulateBody

      if (!body?.commandId) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'commandId is required: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline"',
        })
      }
      if (!body.amount || body.amount <= 0) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'amount must be a positive number',
        })
      }
      if (!body.msisdn) {
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'msisdn is required' })
      }

      // C2BSimulateRequest.billRefNumber is `?: string | null`.
      // body.billRefNumber is `?: string` (undefined when absent from the request).
      // With exactOptionalPropertyTypes, undefined ≠ string | null, so we
      // spread it only when present — passing null explicitly for Buy Goods
      // is handled inside simulateC2B itself.
      const result = await mpesa.simulateC2B({
        shortCode: body.shortCode ?? config.c2bShortCode ?? '',
        commandId: body.commandId,
        amount: body.amount,
        msisdn: body.msisdn,
        apiVersion: config.c2bApiVersion ?? 'v2',
        ...(body.billRefNumber !== undefined ? { billRefNumber: body.billRefNumber } : {}),
      })

      res.status(200).json(result)
    } catch (error) {
      if (res.headersSent) return next(error)
      sendError(res, error)
    }
  })

  // ── POST /mpesa/c2b/validation ────────────────────────────────────────────
  router.post('/mpesa/c2b/validation', async (req: Request, res: Response) => {
    if (!config.skipIPCheck) {
      const requestIP = extractRequestIP(req)
      if (!verifyWebhookIP(requestIP)) {
        console.error(
          '[pesafy] C2B validation rejected — IP not in Safaricom whitelist:',
          requestIP,
        )
        return res.status(200).json({ ResultCode: '0', ResultDesc: 'Accepted' })
      }
    }

    const payload = req.body as C2BValidationPayload

    try {
      let validationResponse: C2BValidationResponse

      if (config.onC2BValidation) {
        validationResponse = await config.onC2BValidation(payload)
      } else {
        validationResponse = acceptC2BValidation()
      }

      console.info('[pesafy] C2B validation response:', {
        transactionId: payload.TransID,
        amount: payload.TransAmount,
        billRef: payload.BillRefNumber,
        resultCode: validationResponse.ResultCode,
      })

      return res.status(200).json(validationResponse)
    } catch (error) {
      console.error('[pesafy] C2B validation hook threw an error:', error)
      return res.status(200).json({ ResultCode: '0', ResultDesc: 'Accepted' })
    }
  })

  // ── POST /mpesa/c2b/confirmation ──────────────────────────────────────────
  router.post('/mpesa/c2b/confirmation', (req: Request, res: Response) => {
    const payload = req.body as C2BConfirmationPayload

    console.info('[pesafy] C2B confirmation received:', {
      transactionId: payload.TransID,
      amount: payload.TransAmount,
      shortCode: payload.BusinessShortCode,
      billRef: payload.BillRefNumber,
      transactionType: payload.TransactionType,
      transTime: payload.TransTime,
      balance: payload.OrgAccountBalance,
    })

    if (config.onC2BConfirmation) {
      Promise.resolve(config.onC2BConfirmation(payload)).catch((err) => {
        console.error('[pesafy] C2B confirmation hook error:', err)
      })
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' })
  })

  // ── POST /mpesa/tax/remit ─────────────────────────────────────────────────
  router.post('/mpesa/tax/remit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.taxResultUrl || !config.taxQueueTimeOutUrl) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message:
            'taxResultUrl and taxQueueTimeOutUrl must be set in config to use tax remittance routes',
        })
      }

      const body = req.body as TaxRemitBody

      if (!body || typeof body.amount !== 'number' || body.amount <= 0) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'amount must be a positive number',
        })
      }
      if (!body.accountReference) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'accountReference is required — the KRA PRN',
        })
      }

      const partyA = body.partyA ?? config.taxPartyA ?? ''
      if (!partyA) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'partyA is required — set taxPartyA in config or provide in request body',
        })
      }

      const result = await mpesa.remitTax({
        amount: body.amount,
        partyA,
        accountReference: body.accountReference,
        resultUrl: config.taxResultUrl,
        queueTimeOutUrl: config.taxQueueTimeOutUrl,
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      })

      res.status(200).json(result)
    } catch (error) {
      if (res.headersSent) return next(error)
      sendError(res, error)
    }
  })

  // ── POST /mpesa/tax/result ────────────────────────────────────────────────
  router.post('/mpesa/tax/result', (req: Request, res: Response) => {
    const body = req.body as TaxRemittanceResult
    const result = body?.Result

    if (result) {
      if (result.ResultCode === 0) {
        console.info('[pesafy] Tax Remittance result (success):', {
          transactionId: result.TransactionID,
          conversationId: result.ConversationID,
          resultDesc: result.ResultDesc,
        })
      } else {
        console.warn('[pesafy] Tax Remittance result (failed):', {
          resultCode: result.ResultCode,
          resultDesc: result.ResultDesc,
          transactionId: result.TransactionID,
        })
      }
    }

    if (config.onTaxRemittanceResult && body) {
      Promise.resolve(config.onTaxRemittanceResult(body)).catch((err) => {
        console.error('[pesafy] Tax Remittance result hook error:', err)
      })
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── POST /mpesa/b2b/checkout ───────────────────────────────────────────────
  router.post('/mpesa/b2b/checkout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as B2BCheckoutBody

      if (!body?.primaryShortCode) {
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'primaryShortCode is required' })
      }
      if (!body.amount || body.amount <= 0) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'amount must be a positive number',
        })
      }
      if (!body.paymentRef) {
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'paymentRef is required' })
      }
      if (!body.partnerName) {
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'partnerName is required' })
      }

      const receiverShortCode = body.receiverShortCode ?? config.b2bReceiverShortCode ?? ''
      if (!receiverShortCode) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message:
            'receiverShortCode is required — set b2bReceiverShortCode in config or provide in request body',
        })
      }

      const callbackUrl = body.callbackUrl ?? config.b2bCallbackUrl ?? ''
      if (!callbackUrl) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message:
            'callbackUrl is required — set b2bCallbackUrl in config or provide in request body',
        })
      }

      const result = await mpesa.b2bExpressCheckout({
        primaryShortCode: body.primaryShortCode,
        receiverShortCode,
        amount: body.amount,
        paymentRef: body.paymentRef,
        callbackUrl,
        partnerName: body.partnerName,
        ...(body.requestRefId !== undefined ? { requestRefId: body.requestRefId } : {}),
      })

      res.status(200).json(result)
    } catch (error) {
      if (res.headersSent) return next(error)
      sendError(res, error)
    }
  })

  // ── POST /mpesa/b2b/callback ───────────────────────────────────────────────
  // noImplicitReturns: all branches must return.
  router.post('/mpesa/b2b/callback', (req: Request, res: Response) => {
    const body = req.body as unknown

    if (!isB2BCheckoutCallback(body)) {
      console.error(
        '[pesafy] B2B callback received unrecognised payload:',
        JSON.stringify(body).slice(0, 200),
      )
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const callback = body as B2BExpressCheckoutCallback

    if (isB2BCheckoutSuccess(callback)) {
      console.info('[pesafy] B2B Express Checkout success:', {
        transactionId: getB2BTransactionId(callback),
        conversationId: getB2BConversationId(callback),
        amount: getB2BAmount(callback),
        requestId: callback.requestId,
        status: callback.status,
      })
    } else if (isB2BCheckoutCancelled(callback)) {
      console.warn('[pesafy] B2B Express Checkout cancelled by merchant:', {
        resultCode: callback.resultCode,
        resultDesc: callback.resultDesc,
        requestId: callback.requestId,
        amount: getB2BAmount(callback),
      })
    } else {
      console.warn('[pesafy] B2B Express Checkout unknown result:', {
        resultCode: callback.resultCode,
        resultDesc: callback.resultDesc,
      })
    }

    if (config.onB2BCheckoutCallback) {
      Promise.resolve(config.onB2BCheckoutCallback(callback)).catch((err) => {
        console.error('[pesafy] B2B callback hook error:', err)
      })
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  // ── POST /mpesa/b2c/payment ────────────────────────────────────────────────
  router.post('/mpesa/b2c/payment', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!config.b2cResultUrl || !config.b2cQueueTimeOutUrl) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'b2cResultUrl and b2cQueueTimeOutUrl must be set in config to use B2C routes',
        })
      }

      const body = req.body as B2CPaymentBody

      if (!body?.commandId) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message:
            'commandId is required: "BusinessPayToBulk" | "BusinessPayment" | "SalaryPayment" | "PromotionPayment"',
        })
      }
      if (!body.amount || body.amount <= 0) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'amount must be a positive number',
        })
      }
      if (!body.partyB) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message:
            'partyB is required — the recipient shortcode (BusinessPayToBulk) or customer MSISDN',
        })
      }
      if (!body.accountReference) {
        throw new PesafyError({ code: 'VALIDATION_ERROR', message: 'accountReference is required' })
      }

      const partyA = body.partyA ?? config.b2cPartyA ?? ''
      if (!partyA) {
        throw new PesafyError({
          code: 'VALIDATION_ERROR',
          message: 'partyA is required — set b2cPartyA in config or provide in request body',
        })
      }

      const result = await mpesa.b2cPayment({
        commandId: body.commandId,
        amount: body.amount,
        partyA,
        partyB: body.partyB,
        accountReference: body.accountReference,
        resultUrl: body.resultUrl ?? config.b2cResultUrl,
        queueTimeOutUrl: body.queueTimeOutUrl ?? config.b2cQueueTimeOutUrl,
        ...(body.requester !== undefined ? { requester: body.requester } : {}),
        ...(body.remarks !== undefined ? { remarks: body.remarks } : {}),
      })

      res.status(200).json(result)
    } catch (error) {
      if (res.headersSent) return next(error)
      sendError(res, error)
    }
  })

  // ── POST /mpesa/b2c/result ─────────────────────────────────────────────────
  // noImplicitReturns: all branches must return.
  router.post('/mpesa/b2c/result', (req: Request, res: Response) => {
    const body = req.body as unknown

    if (!isB2CResult(body)) {
      console.error(
        '[pesafy] B2C result received unrecognised payload:',
        JSON.stringify(body).slice(0, 200),
      )
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    const result = body as B2CResult

    if (isB2CSuccess(result)) {
      console.info('[pesafy] B2C payment result (success):', {
        transactionId: getB2CTransactionId(result),
        conversationId: getB2CConversationId(result),
        originatorConversationId: getB2COriginatorConversationId(result),
        amount: getB2CAmount(result),
        resultDesc: result.Result.ResultDesc,
      })
    } else {
      console.warn('[pesafy] B2C payment result (failed):', {
        resultCode: result.Result.ResultCode,
        resultDesc: result.Result.ResultDesc,
        transactionId: result.Result.TransactionID,
        conversationId: getB2CConversationId(result),
        originatorConversationId: getB2COriginatorConversationId(result),
      })
    }

    if (config.onB2CResult) {
      Promise.resolve(config.onB2CResult(result)).catch((err) => {
        console.error('[pesafy] B2C result hook error:', err)
      })
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' })
  })

  return router
}
