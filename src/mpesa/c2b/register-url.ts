/**
 * C2B Register URLs
 * API: POST /mpesa/c2b/v2/registerurl
 *
 * Registers Validation and Confirmation callback URLs for a short code.
 * Sandbox: can be called multiple times.
 * Production: one-time registration; contact Safaricom to change.
 */
import { httpRequest } from "../../utils/http";
import type { C2BRegisterUrlRequest } from "./types";

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
  const body = {
    ShortCode: request.shortCode,
    ResponseType: request.responseType ?? "Completed",
    ConfirmationURL: request.confirmationUrl,
    ValidationURL: request.validationUrl,
  };

  const { data } = await httpRequest<C2BRegisterUrlResponse>(
    `${baseUrl}/mpesa/c2b/v2/registerurl`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
