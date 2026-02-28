/**
 * STK Push Query — checks the status of a Lipa Na M-Pesa Online Payment.
 *
 * API: POST /mpesa/stkpushquery/v1/query
 *
 * Daraja request body (from Discover APIs M-Pesa Express Query docs):
 * {
 *   "BusinessShortCode": "174379",
 *   "Password":          "base64(Shortcode+Passkey+Timestamp)",
 *   "Timestamp":         "20160216165627",
 *   "CheckoutRequestID": "ws_CO_260520211133524545"
 * }
 *
 * Response ResultCode values (from docs):
 *   0    = The service request is processed successfully.
 *   1032 = Request cancelled by user
 *   1037 = DS timeout user cannot be reached
 *   2001 = Wrong PIN
 *   (and more — see STK Push docs result code table)
 */

import { httpRequest } from "../../utils/http";
import type { StkQueryRequest, StkQueryResponse } from "./types";
import { getStkPushPassword, getTimestamp } from "./utils";

export async function queryStkPush(
  baseUrl: string,
  accessToken: string,
  request: StkQueryRequest
): Promise<StkQueryResponse> {
  // Generate timestamp ONCE — Password and Timestamp field MUST match.
  const timestamp = getTimestamp();

  const body = {
    BusinessShortCode: request.shortCode,
    Password: getStkPushPassword(request.shortCode, request.passKey, timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: request.checkoutRequestId,
  };

  const { data } = await httpRequest<StkQueryResponse>(
    `${baseUrl}/mpesa/stkpushquery/v1/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
