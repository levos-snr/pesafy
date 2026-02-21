/**
 * PaymentStatus - Display payment state (pending, success, failed)
 */

import type { ReactNode } from "react";

export type PaymentStatusState = "idle" | "pending" | "success" | "error";

export interface PaymentStatusProps {
  status: PaymentStatusState;
  /** Optional message for success/error states */
  message?: string;
  /** Optional transaction/callback data */
  transactionId?: string;
  children?: ReactNode;
  className?: string;
}

export function PaymentStatus({
  status,
  message,
  transactionId,
  children,
  className = "",
}: PaymentStatusProps) {
  if (status === "idle" && !children) return null;

  return (
    <div
      className={`pesafy-payment-status pesafy-payment-status--${status} ${className}`}
      role="status"
      aria-live="polite"
    >
      {status === "pending" &&
        (children ?? <span>Waiting for payment...</span>)}
      {status === "success" &&
        (children ?? (
          <span>
            Payment successful
            {transactionId && ` (${transactionId})`}
            {message && ` - ${message}`}
          </span>
        ))}
      {status === "error" &&
        (children ?? (
          <span>
            Payment failed
            {message && ` - ${message}`}
          </span>
        ))}
      {status === "idle" && children}
    </div>
  );
}
