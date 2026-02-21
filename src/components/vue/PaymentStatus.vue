<template>
  <div
    v-if="status !== 'idle' || $slots.default"
    :class="[
      'pesafy-payment-status',
      `pesafy-payment-status--${status}`,
      className,
    ]"
    role="status"
    aria-live="polite"
  >
    <template v-if="status === 'pending'">
      <slot>{{ message || "Waiting for payment..." }}</slot>
    </template>
    <template v-else-if="status === 'success'">
      <slot>
        Payment successful
        <template v-if="transactionId"> ({{ transactionId }})</template>
        <template v-if="message"> - {{ message }}</template>
      </slot>
    </template>
    <template v-else-if="status === 'error'">
      <slot>
        Payment failed
        <template v-if="message"> - {{ message }}</template>
      </slot>
    </template>
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
export type PaymentStatusState = "idle" | "pending" | "success" | "error";

interface Props {
  status: PaymentStatusState;
  message?: string;
  transactionId?: string;
  className?: string;
}

withDefaults(defineProps<Props>(), {
  className: "",
});
</script>

<style scoped>
.pesafy-payment-status {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.pesafy-payment-status--pending {
  background: #fef3c7;
  color: #92400e;
}

.pesafy-payment-status--success {
  background: #d1fae5;
  color: #065f46;
}

.pesafy-payment-status--error {
  background: #fee2e2;
  color: #991b1b;
}
</style>
