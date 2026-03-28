// 📁 PATH: src/mpesa/bill-manager/invoice.ts

/**
 * Bill Manager — create and send invoices via M-PESA.
 *
 * Ref: Bill Manager — Daraja Developer Portal
 */

import { createError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type {
  BillManagerBulkInvoiceRequest,
  BillManagerBulkInvoiceResponse,
  BillManagerCancelInvoiceRequest,
  BillManagerCancelInvoiceResponse,
  BillManagerOptInRequest,
  BillManagerOptInResponse,
  BillManagerSingleInvoiceRequest,
  BillManagerSingleInvoiceResponse,
} from "./types";

/** Opt-in a shortcode for Bill Manager */
export async function billManagerOptIn(
  baseUrl: string,
  accessToken: string,
  request: BillManagerOptInRequest,
): Promise<BillManagerOptInResponse> {
  if (!request.shortcode?.trim())
    throw createError({ code: "VALIDATION_ERROR", message: "shortcode is required." });
  if (!request.email?.trim())
    throw createError({ code: "VALIDATION_ERROR", message: "email is required." });
  if (!request.callbackUrl?.trim())
    throw createError({ code: "VALIDATION_ERROR", message: "callbackUrl is required." });

  const payload = {
    shortcode: request.shortcode,
    email: request.email,
    officialContact: request.officialContact,
    sendReminders: request.sendReminders,
    logo: request.logo ?? "",
    callbackUrl: request.callbackUrl,
  };

  const { data } = await httpRequest<BillManagerOptInResponse>(
    `${baseUrl}/v1/billmanager-invoice/optin`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: payload },
  );
  return data;
}

/** Send a single invoice */
export async function sendSingleInvoice(
  baseUrl: string,
  accessToken: string,
  request: BillManagerSingleInvoiceRequest,
): Promise<BillManagerSingleInvoiceResponse> {
  if (!request.externalReference?.trim())
    throw createError({ code: "VALIDATION_ERROR", message: "externalReference is required." });
  if (!request.partyA?.trim())
    throw createError({
      code: "VALIDATION_ERROR",
      message: "partyA (customer MSISDN) is required.",
    });

  const amount = Math.round(request.amount);
  if (!Number.isFinite(amount) || amount < 1)
    throw createError({
      code: "VALIDATION_ERROR",
      message: `amount must be ≥ 1 (got ${request.amount}).`,
    });

  const payload = {
    externalReference: request.externalReference,
    billingPeriod: request.billingPeriod,
    invoiceName: request.invoiceName,
    dueDate: request.dueDate,
    accountReference: request.accountReference,
    amount: String(amount),
    partyA: request.partyA,
    invoiceItems:
      request.invoiceItems?.map((i) => ({
        itemName: i.itemName,
        amount: String(Math.round(i.amount)),
      })) ?? [],
  };

  const { data } = await httpRequest<BillManagerSingleInvoiceResponse>(
    `${baseUrl}/v1/billmanager-invoice/single-invoicing`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: payload },
  );
  return data;
}

/** Send up to 1 000 invoices in a single request */
export async function sendBulkInvoices(
  baseUrl: string,
  accessToken: string,
  request: BillManagerBulkInvoiceRequest,
): Promise<BillManagerBulkInvoiceResponse> {
  if (!request.invoices?.length)
    throw createError({ code: "VALIDATION_ERROR", message: "invoices array must not be empty." });
  if (request.invoices.length > 1000)
    throw createError({
      code: "VALIDATION_ERROR",
      message: "Maximum 1 000 invoices per bulk request.",
    });

  const { data } = await httpRequest<BillManagerBulkInvoiceResponse>(
    `${baseUrl}/v1/billmanager-invoice/bulk-invoicing`,
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: request.invoices },
  );
  return data;
}

/** Cancel a previously issued invoice */
export async function cancelInvoice(
  baseUrl: string,
  accessToken: string,
  request: BillManagerCancelInvoiceRequest,
): Promise<BillManagerCancelInvoiceResponse> {
  if (!request.externalReference?.trim())
    throw createError({ code: "VALIDATION_ERROR", message: "externalReference is required." });

  const { data } = await httpRequest<BillManagerCancelInvoiceResponse>(
    `${baseUrl}/v1/billmanager-invoice/cancel-single-invoice`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: [{ externalReference: request.externalReference }],
    },
  );
  return data;
}
