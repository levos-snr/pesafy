/**
 * Webhook event types from Daraja API
 */

export type WebhookEventType =
  | "stk_push"
  | "b2c"
  | "b2b"
  | "c2b"
  | "transaction_status"
  | "reversal";

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

/** B2C webhook payload */
export interface B2CWebhook {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters: {
      ResultParameter: Array<{
        Key: string;
        Value: string | number;
      }>;
    };
    ReferenceData: {
      ReferenceItem: Array<{
        Key: string;
        Value: string;
      }>;
    };
  };
}

/** C2B webhook payload */
export interface C2BWebhook {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}
