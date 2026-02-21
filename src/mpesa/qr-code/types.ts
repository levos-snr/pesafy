/** Dynamic QR Code types - LIPA NA M-PESA */

export type TrxCode = "BG" | "WA" | "PB" | "SM" | "SB";

export interface DynamicQRRequest {
  merchantName: string;
  refNo: string;
  amount: number;
  trxCode: TrxCode;
  cpi: string;
  size?: string;
}
