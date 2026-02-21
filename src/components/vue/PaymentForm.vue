<template>
  <form
    @submit.prevent="handleSubmit"
    :class="['pesafy-payment-form', className]"
  >
    <div class="pesafy-payment-form-field">
      <label for="pesafy-amount">Amount (KES)</label>
      <input
        id="pesafy-amount"
        type="number"
        min="1"
        step="0.01"
        v-model="formData.amount"
        placeholder="100"
        :disabled="disabled"
        required
      />
    </div>
    <div class="pesafy-payment-form-field">
      <label for="pesafy-phone">M-Pesa Phone Number</label>
      <input
        id="pesafy-phone"
        type="tel"
        v-model="formData.phoneNumber"
        placeholder="07XX XXX XXX or 2547XX XXX XXX"
        :disabled="disabled"
        required
      />
    </div>
    <div class="pesafy-payment-form-field">
      <label for="pesafy-reference">Reference</label>
      <input
        id="pesafy-reference"
        type="text"
        v-model="formData.accountReference"
        placeholder="ORDER-123"
        :disabled="disabled"
        maxlength="12"
      />
    </div>
    <div class="pesafy-payment-form-field">
      <label for="pesafy-desc">Description</label>
      <input
        id="pesafy-desc"
        type="text"
        v-model="formData.transactionDesc"
        placeholder="Payment"
        :disabled="disabled"
        maxlength="13"
      />
    </div>
    <button
      type="submit"
      :disabled="disabled || loading"
      class="pesafy-payment-form-submit"
      :aria-busy="loading"
    >
      {{ loading ? "Processing..." : "Pay with M-Pesa" }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";

export interface PaymentFormData {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
}

interface Props {
  defaultAmount?: number;
  defaultReference?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  defaultAmount: 0,
  defaultReference: "",
  disabled: false,
  loading: false,
  className: "",
});

const emit = defineEmits<{
  submit: [data: PaymentFormData];
}>();

const formData = reactive({
  amount: props.defaultAmount.toString(),
  phoneNumber: "",
  accountReference: props.defaultReference,
  transactionDesc: "Payment",
});

const handleSubmit = () => {
  if (props.disabled || props.loading) return;

  const amount = Number.parseFloat(formData.amount);
  if (Number.isNaN(amount) || amount <= 0) return;

  const cleaned = formData.phoneNumber.replace(/\D/g, "");
  if (cleaned.length < 9) return;

  emit("submit", {
    amount,
    phoneNumber: formData.phoneNumber,
    accountReference: formData.accountReference || `REF-${Date.now()}`,
    transactionDesc: formData.transactionDesc,
  });
};
</script>

<style scoped>
.pesafy-payment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 24rem;
}

.pesafy-payment-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pesafy-payment-form-field label {
  font-size: 0.875rem;
  font-weight: 500;
}

.pesafy-payment-form-field input {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

.pesafy-payment-form-field input:focus {
  outline: none;
  border-color: #00a651;
  box-shadow: 0 0 0 2px rgba(0, 166, 81, 0.2);
}

.pesafy-payment-form-submit {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  background: #00a651;
  color: white;
  margin-top: 0.5rem;
}

.pesafy-payment-form-submit:hover:not(:disabled) {
  background: #008f45;
}

.pesafy-payment-form-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
