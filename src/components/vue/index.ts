/**
 * Pesafy Vue Components
 * Use with your backend API - never expose Daraja credentials in the browser
 */

export { default as PaymentButton } from "./PaymentButton.vue";
export { default as PaymentForm } from "./PaymentForm.vue";
export { default as PaymentStatus } from "./PaymentStatus.vue";
export { default as QRCode } from "./QRCode.vue";

// Types are exported from a plain .ts file — avoids TypeScript shim limitations
// with named exports from .vue modules.
export type { PaymentFormData, PaymentStatusState } from "./types";
