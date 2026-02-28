/**
 * Webhook event types for Daraja callbacks
 */

export type WebhookEventType = "stk_push";

export interface WebhookEvent {
  eventType: WebhookEventType;
  timestamp: string;
  data: unknown;
}

/** STK Push webhook payload (POSTed to your CallBackURL) */
export interface StkPushWebhook {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      /** 0 = success */
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
