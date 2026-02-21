/**
 * C2B Register URLs - Register validation and confirmation URLs
 * API: POST /mpesa/c2b/v2/registerurl
 */

import { httpRequest } from "../../utils/http";
import type { C2BRegisterUrlRequest } from "./types";

export interface C2BRegisterUrlResponse {
  ConversationID: string;
  OriginatorCoversationID: string;
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
