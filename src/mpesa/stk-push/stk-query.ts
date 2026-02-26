/**
 * STK Push Query - Check status of STK Push transaction
 * API: POST /mpesa/stkpushquery/v1/query
 */

import { httpRequest } from "../../utils/http";
import type { StkQueryRequest, StkQueryResponse } from "./types";
import { getStkPushPassword, getTimestamp } from "./utils";

export async function queryStkPush(
  baseUrl: string,
  accessToken: string,
  request: StkQueryRequest
): Promise<StkQueryResponse> {
  // Generate timestamp ONCE — Password and Timestamp field must match exactly.
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
