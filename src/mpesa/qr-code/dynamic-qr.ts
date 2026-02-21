/**
 * Dynamic QR Code - Generate LIPA NA M-PESA QR codes
 * API: POST /mpesa/qrcode/v1/generate
 */

import { httpRequest } from "../../utils/http";
import type { DynamicQRRequest } from "./types";

export interface DynamicQRResponse {
  ResponseCode: string;
  RequestID: string;
  ResponseDescription: string;
  QRCode: string;
}

export async function generateDynamicQR(
  baseUrl: string,
  accessToken: string,
  request: DynamicQRRequest
): Promise<DynamicQRResponse> {
  const body = {
    MerchantName: request.merchantName,
    RefNo: request.refNo,
    Amount: Math.round(request.amount),
    TrxCode: request.trxCode,
    CPI: request.cpi,
    Size: request.size ?? "300",
  };

  const { data } = await httpRequest<DynamicQRResponse>(
    `${baseUrl}/mpesa/qrcode/v1/generate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    }
  );

  return data;
}
