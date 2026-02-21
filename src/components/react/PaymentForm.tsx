/**
 * PaymentForm - Collect payment details for M-Pesa STK Push
 * Parent receives form data and handles API call (credentials stay server-side)
 */

import { type FormEvent, useState } from "react";

export interface PaymentFormData {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
}

export interface PaymentFormProps {
  /** Called on submit. Parent should call your backend which uses Pesafy stkPush */
  onSubmit: (data: PaymentFormData) => void | Promise<void>;
  defaultAmount?: number;
  defaultReference?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function PaymentForm({
  onSubmit,
  defaultAmount = 0,
  defaultReference = "",
  disabled = false,
  loading = false,
  className = "",
}: PaymentFormProps) {
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState(defaultReference);
  const [desc, setDesc] = useState("Payment");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled || loading) return;

    const amt = Number.parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) return;

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 9) return;

    await onSubmit({
      amount: amt,
      phoneNumber: phone,
      accountReference: reference || `REF-${Date.now()}`,
      transactionDesc: desc,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`pesafy-payment-form ${className}`}
    >
      <div className="pesafy-payment-form-field">
        <label htmlFor="pesafy-amount">Amount (KES)</label>
        <input
          id="pesafy-amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
          placeholder="100"
          disabled={disabled}
          required
        />
      </div>
      <div className="pesafy-payment-form-field">
        <label htmlFor="pesafy-phone">M-Pesa Phone Number</label>
        <input
          id="pesafy-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
          placeholder="07XX XXX XXX or 2547XX XXX XXX"
          disabled={disabled}
          required
        />
      </div>
      <div className="pesafy-payment-form-field">
        <label htmlFor="pesafy-reference">Reference</label>
        <input
          id="pesafy-reference"
          type="text"
          value={reference}
          onChange={(e) => setReference((e.target as HTMLInputElement).value)}
          placeholder="ORDER-123"
          disabled={disabled}
          maxLength={12}
        />
      </div>
      <div className="pesafy-payment-form-field">
        <label htmlFor="pesafy-desc">Description</label>
        <input
          id="pesafy-desc"
          type="text"
          value={desc}
          onChange={(e) => setDesc((e.target as HTMLInputElement).value)}
          placeholder="Payment"
          disabled={disabled}
          maxLength={13}
        />
      </div>
      <button
        type="submit"
        disabled={disabled || loading}
        className="pesafy-payment-form-submit"
        aria-busy={loading}
      >
        {loading ? "Processing..." : "Pay with M-Pesa"}
      </button>
    </form>
  );
}
