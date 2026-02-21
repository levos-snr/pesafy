/**
 * PaymentButton - Trigger M-Pesa STK Push payment
 * Call onPay with payment details; parent handles API call (credentials stay server-side)
 */

import type { ReactNode } from "react";

export interface PaymentButtonProps {
  amount: number;
  /** Called when user clicks pay. Parent should call your backend which uses Pesafy */
  onPay: (params: { amount: number }) => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

export function PaymentButton({
  amount,
  onPay,
  disabled = false,
  loading = false,
  children,
  className = "",
}: PaymentButtonProps) {
  const handleClick = async () => {
    if (disabled || loading) return;
    await onPay({ amount });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`pesafy-payment-btn ${className}`}
      aria-busy={loading}
    >
      {loading ? (
        <span className="pesafy-payment-btn-loading">Processing...</span>
      ) : (
        (children ?? `Pay KES ${amount.toLocaleString()}`)
      )}
    </button>
  );
}
