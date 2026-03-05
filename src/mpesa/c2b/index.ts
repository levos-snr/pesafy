/**
 * Customer to Business (C2B) module exports
 *
 * Supports:
 *   - Register Confirmation + Validation URLs (v1 and v2)
 *   - Simulate C2B transaction (sandbox only)
 *   - Validation callback helpers (accept / reject)
 *   - Confirmation callback helpers
 *   - Typed payload shapes for both callback types
 */

export { registerC2BUrls } from "./register-url";
export { simulateC2B } from "./simulate";
export type {
  C2BApiVersion,
  C2BCommandID,
  C2BConfirmationAck,
  C2BConfirmationPayload,
  C2BRegisterUrlRequest,
  C2BRegisterUrlResponse,
  C2BResponseType,
  C2BSimulateRequest,
  C2BSimulateResponse,
  C2BValidationPayload,
  C2BValidationResponse,
  C2BValidationResultCode,
} from "./types";
export {
  acceptC2BValidation,
  acknowledgeC2BConfirmation,
  getC2BAccountRef,
  getC2BAmount,
  getC2BCustomerName,
  getC2BTransactionId,
  isBuyGoodsPayment,
  isC2BPayload,
  isPaybillPayment,
  rejectC2BValidation,
} from "./webhooks";
