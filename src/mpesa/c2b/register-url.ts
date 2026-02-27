/**
 * C2B Register URLs
 * API: POST /mpesa/c2b/v2/registerurl
 *
 * Registers your Confirmation and Validation URLs with Safaricom.
 *
 * Sandbox: register before EVERY simulation.
 * Production: one-time registration. To change, delete via Daraja portal
 *             self-service then re-register.
 *
 * URL requirements:
 *   - Must be publicly accessible (no localhost, ngrok, requestbin in prod)
 *   - Production must be HTTPS; sandbox allows HTTP
 *   - Must NOT contain: mpesa, safaricom, exe, exec, cmd, sql, query
 */

import { httpRequest } from "../../utils/http";
import type {
  C2BRegisterUrlRequest,
  C2BRegisterUrlResponse,
  C2BResponseType,
} from "./types";

export async function registerC2BUrls(
  baseUrl: string,
  accessToken: string,
  request: C2BRegisterUrlRequest
): Promise<C2BRegisterUrlResponse> {
  const responseType: C2BResponseType = request.responseType ?? "Completed";

  const body: Record<string, string> = {
    ShortCode: request.shortCode,
    ResponseType: responseType,
    ConfirmationURL: request.confirmationUrl,
    // Daraja requires ValidationURL even when external validation is disabled.
    // Use the same URL as confirmation if you don't need custom validation.
    ValidationURL: request.validationUrl ?? request.confirmationUrl,
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
