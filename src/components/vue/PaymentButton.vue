<template>
  <button
    :disabled="disabled || loading"
    :class="['pesafy-payment-btn', className]"
    @click="handleClick"
    :aria-busy="loading"
  >
    <span v-if="loading" class="pesafy-payment-btn-loading">
      Processing...
    </span>
    <slot v-else> Pay KES {{ amount.toLocaleString() }} </slot>
  </button>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

interface Props {
  amount: number;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  loading: false,
  className: "",
});

const emit = defineEmits<{
  pay: [params: { amount: number }];
}>();

const handleClick = async () => {
  if (props.disabled || props.loading) return;
  emit("pay", { amount: props.amount });
};
</script>

<style scoped>
.pesafy-payment-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  background: #00a651;
  color: white;
  transition:
    background 0.2s,
    opacity 0.2s;
}

.pesafy-payment-btn:hover:not(:disabled) {
  background: #008f45;
}

.pesafy-payment-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pesafy-payment-btn-loading {
  opacity: 0.9;
}
</style>
