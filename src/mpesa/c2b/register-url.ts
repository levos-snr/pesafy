/**
 * C2B Register URLs
 * API: POST /mpesa/c2b/v1/registerurl   ← v1 (NOT v2 — v2 does not exist for this endpoint)
 *
 * Registers Validation and Confirmation callback URLs for a short code.
 * Sandbox: can be called multiple times (though Daraja sandbox is flaky — retry on 500).
 * Production: one-time registration; contact Safaricom to change.
 *
 * ⚠️  Common mistake: using /v2/registerurl causes persistent 500.003.1001 errors.
 *     The Daraja Postman collection and official docs both confirm the path is /v1/registerurl.
 */
import { httpRequest } from "../../utils/http";
import type { C2BRegisterUrlRequest, C2BResponseType } from "./types";

/**
 * Actual response shape from Daraja.
 * Note: Daraja's field name has a typo ("CoversationID" — missing the 'n').
 * We match it exactly so JSON parsing is lossless.
 */
export interface C2BRegisterUrlResponse {
  /** Global unique identifier for this registration request. Daraja typo: "Coversation" */
  OriginatorCoversationID: string;
  /** "0" = accepted */
  ResponseCode: string;
  ResponseDescription: string;
}

export async function registerC2BUrls(
  baseUrl: string,
  accessToken: string,
  request: C2BRegisterUrlRequest
): Promise<C2BRegisterUrlResponse> {
  const responseType: C2BResponseType = request.responseType ?? "Completed";

  const body = {
    ShortCode: request.shortCode,
    ResponseType: responseType,
    ConfirmationURL: request.confirmationUrl,
    ValidationURL: request.validationUrl,
  };

  // ✅ FIXED: /v1/registerurl (was incorrectly /v2/registerurl)
  // The v2 path does not exist and will always return 500.003.1001.
  const { data } = await httpRequest<C2BRegisterUrlResponse>(
    `${baseUrl}/mpesa/c2b/v1/registerurl`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
