/**
 * Tax Remittance — remits tax to Kenya Revenue Authority (KRA) via M-PESA.
 *
 * API: POST /mpesa/b2b/v1/remittax
 *
 * This is ASYNCHRONOUS. The synchronous response only acknowledges receipt.
 * Final results arrive via POST to your ResultURL.
 *
 * Prerequisites (from Daraja docs):
 *   - Prior integration with KRA for tax declaration.
 *   - A valid Payment Registration Number (PRN) from KRA.
 *   - Initiator with the "Tax Remittance ORG API" role on the M-PESA org portal.
 *   - SecurityCredential encrypted with the correct environment certificate.
 *
 * Fixed Daraja field values for this API:
 *   CommandID:              "PayTaxToKRA"  (always)
 *   SenderIdentifierType:   "4"            (always — Organisation ShortCode)
 *   RecieverIdentifierType: "4"            (always — Organisation ShortCode)
 *   PartyB:                 "572572"       (always — KRA's M-PESA shortcode)
 */

import { createError } from "../../utils/errors";
import { httpRequest } from "../../utils/http";
import type { TaxRemittanceRequest, TaxRemittanceResponse } from "./types";

/** KRA's M-PESA shortcode — the only allowed PartyB for tax remittance */
export const KRA_SHORTCODE = "572572";

/** The only CommandID accepted by the Tax Remittance API */
export const TAX_COMMAND_ID = "PayTaxToKRA";

/**
 * Remits tax to Kenya Revenue Authority (KRA) via M-PESA.
 *
 * @param baseUrl            - Daraja base URL (sandbox or production)
 * @param accessToken        - Valid OAuth bearer token
 * @param securityCredential - RSA-encrypted initiator password (base64)
 * @param initiatorName      - M-PESA org portal API operator username
 * @param request            - Tax remittance parameters
 * @returns                  - Daraja acknowledgement response
 */
export async function remitTax(
  baseUrl: string,
  accessToken: string,
  securityCredential: string,
  initiatorName: string,
  request: TaxRemittanceRequest
): Promise<TaxRemittanceResponse> {
  // ── Validation ──────────────────────────────────────────────────────────────

  const amount = Math.round(request.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    throw createError({
      code: "VALIDATION_ERROR",
      message: `amount must be a whole number ≥ 1 (got ${request.amount} which rounds to ${amount}).`,
    });
  }

  if (!request.partyA) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "partyA is required — your M-PESA business shortcode from which tax is deducted.",
    });
  }

  if (!request.accountReference?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "accountReference is required — the Payment Registration Number (PRN) issued by KRA.",
    });
  }

  if (!request.resultUrl?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "resultUrl is required — Safaricom POSTs the tax remittance result here.",
    });
  }

  if (!request.queueTimeOutUrl?.trim()) {
    throw createError({
      code: "VALIDATION_ERROR",
      message:
        "queueTimeOutUrl is required — Safaricom calls this on request timeout.",
    });
  }

  // ── Build payload matching Daraja spec exactly ──────────────────────────────
  //
  // Fixed values per Daraja Tax Remittance docs:
  //   CommandID:              "PayTaxToKRA" — only valid value
  //   SenderIdentifierType:   "4"           — Organisation ShortCode (only allowed)
  //   RecieverIdentifierType: "4"           — Organisation ShortCode (only allowed)
  //   PartyB:                 "572572"      — KRA shortcode (only allowed)

  const payload = {
    Initiator: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: TAX_COMMAND_ID,
    SenderIdentifierType: "4",
    RecieverIdentifierType: "4",
    Amount: String(amount),
    PartyA: String(request.partyA),
    PartyB: request.partyB ?? KRA_SHORTCODE,
    AccountReference: request.accountReference,
    Remarks: request.remarks ?? "Tax Remittance",
    QueueTimeOutURL: request.queueTimeOutUrl,
    ResultURL: request.resultUrl,
  };

  const { data } = await httpRequest<TaxRemittanceResponse>(
    `${baseUrl}/mpesa/b2b/v1/remittax`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: payload,
    }
  );

  return data;
}
