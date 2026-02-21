// Generic fallback for all .vue files (default export only)
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}

// Specific declaration for PaymentForm.vue — exposes its named type export
declare module "./PaymentForm.vue" {
  import type { DefineComponent } from "vue";
  export interface PaymentFormData {
    amount: number;
    phoneNumber: string;
    accountReference: string;
    transactionDesc: string;
  }
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}

// Specific declaration for PaymentStatus.vue — exposes its named type export
declare module "./PaymentStatus.vue" {
  import type { DefineComponent } from "vue";
  export type PaymentStatusState = "idle" | "pending" | "success" | "error";
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}
