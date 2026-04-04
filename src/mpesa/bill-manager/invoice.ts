// src/mpesa/bill-manager/invoice.ts

/**
 * src/mpesa/bill-manager/invoice.ts
 *
 * Bill Manager — opt-in, invoice creation/cancellation, and payment reconciliation.
 *
 * Strictly aligned with Safaricom Daraja Bill Manager API documentation.
 *
 * APIs:
 *   POST /v1/billmanager-invoice/optin                 — Opt-in shortcode
 *   POST /v1/billmanager-invoice/change-optin-details  — Update opt-in details
 *   POST /v1/billmanager-invoice/single-invoicing      — Send a single invoice
 *   POST /v1/billmanager-invoice/bulk-invoicing        — Send bulk invoices (up to 1000)
 *   POST /v1/billmanager-invoice/cancel-single-invoice — Cancel a single invoice
 *   POST /v1/billmanager-invoice/cancel-bulk-invoices  — Cancel multiple invoices
 *   POST /v1/billmanager-invoice/reconciliation        — Acknowledge a payment
 */

import { createError } from '../../utils/errors'
import { httpRequest } from '../../utils/http'
import type {
  BillManagerBulkInvoiceRequest,
  BillManagerBulkInvoiceResponse,
  BillManagerCancelBulkInvoiceRequest,
  BillManagerCancelBulkInvoiceResponse,
  BillManagerCancelInvoiceRequest,
  BillManagerCancelInvoiceResponse,
  BillManagerOptInRequest,
  BillManagerOptInResponse,
  BillManagerReconciliationRequest,
  BillManagerReconciliationResponse,
  BillManagerSingleInvoiceRequest,
  BillManagerSingleInvoiceResponse,
  BillManagerUpdateOptInRequest,
  BillManagerUpdateOptInResponse,
} from './types'

// ── Opt-in ────────────────────────────────────────────────────────────────────

/**
 * Opts a shortcode into Bill Manager.
 *
 * After a successful response the shortcode is whitelisted and all other
 * Bill Manager APIs become available.
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Opt-in parameters
 *
 * @throws {PesafyError} VALIDATION_ERROR when required fields are missing
 * @throws {PesafyError} API_ERROR / REQUEST_FAILED on Daraja HTTP errors
 */
export async function billManagerOptIn(
  baseUrl: string,
  accessToken: string,
  request: BillManagerOptInRequest,
): Promise<BillManagerOptInResponse> {
  if (!request.shortcode?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'shortcode is required.' })
  }
  if (!request.email?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'email is required.' })
  }
  if (!request.officialContact?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'officialContact is required.' })
  }
  if (request.sendReminders !== '0' && request.sendReminders !== '1') {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'sendReminders must be "0" (disable) or "1" (enable).',
    })
  }
  if (!request.callbackUrl?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'callbackUrl is required.' })
  }

  // Per Daraja docs the field name is "callbackurl" (all lowercase)
  const payload: Record<string, unknown> = {
    shortcode: request.shortcode,
    email: request.email,
    officialContact: request.officialContact,
    sendReminders: request.sendReminders,
    logo: request.logo ?? '',
    callbackurl: request.callbackUrl,
  }

  const { data } = await httpRequest<BillManagerOptInResponse>(
    `${baseUrl}/v1/billmanager-invoice/optin`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )
  return data
}

// ── Update Opt-in ─────────────────────────────────────────────────────────────

/**
 * Updates opt-in details for an already-registered shortcode.
 *
 * Endpoint: POST /v1/billmanager-invoice/change-optin-details
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Updated opt-in parameters
 */
export async function updateOptIn(
  baseUrl: string,
  accessToken: string,
  request: BillManagerUpdateOptInRequest,
): Promise<BillManagerUpdateOptInResponse> {
  if (!request.shortcode?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'shortcode is required.' })
  }
  if (!request.email?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'email is required.' })
  }
  if (!request.officialContact?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'officialContact is required.' })
  }
  if (request.sendReminders !== '0' && request.sendReminders !== '1') {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'sendReminders must be "0" (disable) or "1" (enable).',
    })
  }
  if (!request.callbackUrl?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'callbackUrl is required.' })
  }

  const payload: Record<string, unknown> = {
    shortcode: request.shortcode,
    email: request.email,
    officialContact: request.officialContact,
    sendReminders: request.sendReminders,
    logo: request.logo ?? '',
    callbackurl: request.callbackUrl,
  }

  const { data } = await httpRequest<BillManagerUpdateOptInResponse>(
    `${baseUrl}/v1/billmanager-invoice/change-optin-details`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )
  return data
}

// ── Single Invoice ────────────────────────────────────────────────────────────

/**
 * Sends a single customised e-invoice to a customer via SMS.
 *
 * The customer receives the invoice notification on their Safaricom number.
 * They can pay via USSD, STK, M-PESA App, or from the invoice link directly.
 *
 * Endpoint: POST /v1/billmanager-invoice/single-invoicing
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Invoice parameters
 */
export async function sendSingleInvoice(
  baseUrl: string,
  accessToken: string,
  request: BillManagerSingleInvoiceRequest,
): Promise<BillManagerSingleInvoiceResponse> {
  if (!request.externalReference?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'externalReference is required.' })
  }
  if (!request.billedFullName?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'billedFullName is required.' })
  }
  if (!request.billedPhoneNumber?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'billedPhoneNumber is required — the Safaricom number to receive the invoice SMS.',
    })
  }
  if (!request.billedPeriod?.trim()) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'billedPeriod is required (e.g. "August 2021").',
    })
  }
  if (!request.invoiceName?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'invoiceName is required.' })
  }
  if (!request.dueDate?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'dueDate is required.' })
  }
  if (!request.accountReference?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'accountReference is required.' })
  }

  const amount = Math.round(request.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `amount must be a whole number ≥ 1 (got ${request.amount}).`,
    })
  }

  // Per docs: amount is sent as a string
  const payload: Record<string, unknown> = {
    externalReference: request.externalReference,
    billedFullName: request.billedFullName,
    billedPhoneNumber: request.billedPhoneNumber,
    billedPeriod: request.billedPeriod,
    invoiceName: request.invoiceName,
    dueDate: request.dueDate,
    accountReference: request.accountReference,
    amount: String(amount),
    invoiceItems:
      request.invoiceItems?.map((i) => ({
        itemName: i.itemName,
        amount: String(Math.round(i.amount)),
      })) ?? [],
  }

  const { data } = await httpRequest<BillManagerSingleInvoiceResponse>(
    `${baseUrl}/v1/billmanager-invoice/single-invoicing`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )
  return data
}

// ── Bulk Invoicing ────────────────────────────────────────────────────────────

/**
 * Sends up to 1000 e-invoices in a single request.
 *
 * Per Daraja docs the request body is a JSON array sent directly
 * (not wrapped in an object).
 *
 * Endpoint: POST /v1/billmanager-invoice/bulk-invoicing
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Bulk invoice parameters (wraps the array for ergonomics)
 */
export async function sendBulkInvoices(
  baseUrl: string,
  accessToken: string,
  request: BillManagerBulkInvoiceRequest,
): Promise<BillManagerBulkInvoiceResponse> {
  if (!request.invoices?.length) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'invoices array must not be empty.' })
  }
  if (request.invoices.length > 1000) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: `Maximum 1000 invoices per bulk request (got ${request.invoices.length}).`,
    })
  }

  // Validate each invoice minimally — Daraja will reject bad records
  for (let i = 0; i < request.invoices.length; i++) {
    const inv = request.invoices[i]
    if (!inv || !inv.externalReference?.trim()) {
      throw createError({
        code: 'VALIDATION_ERROR',
        message: `Invoice at index ${i}: externalReference is required.`,
      })
    }
    if (!inv.billedFullName?.trim()) {
      throw createError({
        code: 'VALIDATION_ERROR',
        message: `Invoice at index ${i}: billedFullName is required.`,
      })
    }
    if (!inv.billedPhoneNumber?.trim()) {
      throw createError({
        code: 'VALIDATION_ERROR',
        message: `Invoice at index ${i}: billedPhoneNumber is required.`,
      })
    }
    const amount = Math.round(inv.amount)
    if (!Number.isFinite(amount) || amount < 1) {
      throw createError({
        code: 'VALIDATION_ERROR',
        message: `Invoice at index ${i}: amount must be a whole number ≥ 1 (got ${inv.amount}).`,
      })
    }
  }

  // Per Daraja docs: body is the raw array, not a wrapper object
  const payload = request.invoices.map((inv) => ({
    externalReference: inv.externalReference,
    billedFullName: inv.billedFullName,
    billedPhoneNumber: inv.billedPhoneNumber,
    billedPeriod: inv.billedPeriod,
    invoiceName: inv.invoiceName,
    dueDate: inv.dueDate,
    accountReference: inv.accountReference,
    amount: String(Math.round(inv.amount)),
    invoiceItems:
      inv.invoiceItems?.map((item) => ({
        itemName: item.itemName,
        amount: String(Math.round(item.amount)),
      })) ?? [],
  }))

  const { data } = await httpRequest<BillManagerBulkInvoiceResponse>(
    `${baseUrl}/v1/billmanager-invoice/bulk-invoicing`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )
  return data
}

// ── Cancel Single Invoice ─────────────────────────────────────────────────────

/**
 * Cancels a previously sent invoice.
 *
 * A partially paid or fully paid invoice cannot be cancelled.
 *
 * Endpoint: POST /v1/billmanager-invoice/cancel-single-invoice
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Cancel parameters
 */
export async function cancelInvoice(
  baseUrl: string,
  accessToken: string,
  request: BillManagerCancelInvoiceRequest,
): Promise<BillManagerCancelInvoiceResponse> {
  if (!request.externalReference?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'externalReference is required.' })
  }

  const { data } = await httpRequest<BillManagerCancelInvoiceResponse>(
    `${baseUrl}/v1/billmanager-invoice/cancel-single-invoice`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: { externalReference: request.externalReference },
    },
  )
  return data
}

// ── Cancel Bulk Invoices ──────────────────────────────────────────────────────

/**
 * Cancels multiple previously sent invoices.
 *
 * A partially paid or fully paid invoice cannot be cancelled.
 *
 * Per Daraja docs the request body is a JSON array.
 *
 * Endpoint: POST /v1/billmanager-invoice/cancel-bulk-invoices
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Bulk cancel parameters
 */
export async function cancelBulkInvoices(
  baseUrl: string,
  accessToken: string,
  request: BillManagerCancelBulkInvoiceRequest,
): Promise<BillManagerCancelBulkInvoiceResponse> {
  if (!request.externalReferences?.length) {
    throw createError({
      code: 'VALIDATION_ERROR',
      message: 'externalReferences array must not be empty.',
    })
  }

  for (let i = 0; i < request.externalReferences.length; i++) {
    const ref = request.externalReferences[i]
    if (!ref?.trim()) {
      throw createError({
        code: 'VALIDATION_ERROR',
        message: `externalReferences[${i}] must not be empty.`,
      })
    }
  }

  // Per Daraja docs: body is a raw array of { externalReference } objects
  const payload = request.externalReferences.map((ref) => ({ externalReference: ref }))

  const { data } = await httpRequest<BillManagerCancelBulkInvoiceResponse>(
    `${baseUrl}/v1/billmanager-invoice/cancel-bulk-invoices`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )
  return data
}

// ── Reconciliation / Acknowledgment ──────────────────────────────────────────

/**
 * Sends a payment acknowledgment to Bill Manager after your system has
 * processed a payment notification received at your callbackUrl.
 *
 * Endpoint: POST /v1/billmanager-invoice/reconciliation
 *
 * @param baseUrl     - Daraja environment base URL
 * @param accessToken - Valid OAuth bearer token
 * @param request     - Reconciliation / acknowledgment payload
 */
export async function reconcilePayment(
  baseUrl: string,
  accessToken: string,
  request: BillManagerReconciliationRequest,
): Promise<BillManagerReconciliationResponse> {
  if (!request.transactionId?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'transactionId is required.' })
  }
  if (!request.externalReference?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'externalReference is required.' })
  }
  if (!request.accountReference?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'accountReference is required.' })
  }
  if (!request.paidAmount?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'paidAmount is required.' })
  }
  if (!request.paymentDate?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'paymentDate is required.' })
  }
  if (!request.phoneNumber?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'phoneNumber is required.' })
  }
  if (!request.fullName?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'fullName is required.' })
  }
  if (!request.invoiceName?.trim()) {
    throw createError({ code: 'VALIDATION_ERROR', message: 'invoiceName is required.' })
  }

  const payload: Record<string, unknown> = {
    paymentDate: request.paymentDate,
    paidAmount: request.paidAmount,
    accountReference: request.accountReference,
    transactionId: request.transactionId,
    phoneNumber: request.phoneNumber,
    fullName: request.fullName,
    invoiceName: request.invoiceName,
    externalReference: request.externalReference,
  }

  const { data } = await httpRequest<BillManagerReconciliationResponse>(
    `${baseUrl}/v1/billmanager-invoice/reconciliation`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    },
  )
  return data
}
