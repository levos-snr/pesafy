/**
 * Webhook event types from Daraja API (STK Push focused)
 */

export type WebhookEventType = "stk_push";

export interface WebhookEvent {
  eventType: WebhookEventType;
  timestamp: string;
  data: unknown;
}

/** STK Push webhook payload */
export interface StkPushWebhook {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}
