/**
 * Shared types for Pesafy Vue components.
 * Extracted here so they can be re-exported from index.ts without
 * relying on named exports from .vue files (which TypeScript shims
 * cannot reliably expose).
 */

export interface PaymentFormData {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
}

export type PaymentStatusState = "idle" | "pending" | "success" | "error";
