// src/mpesa/tax-remittance/index.ts

/**
 * Tax Remittance module exports
 *
 * Enables businesses to remit tax to Kenya Revenue Authority (KRA)
 * via M-PESA Business to Business (B2B) API.
 *
 * Supports:
 *   - remitTax() — submit a tax remittance to KRA
 *
 * Prerequisites (from Daraja docs):
 *   - Prior KRA integration for tax declaration + PRN generation.
 *   - Initiator with "Tax Remittance ORG API" role on M-PESA org portal.
 *   - Valid SecurityCredential encrypted with the correct environment certificate.
 */

export { KRA_SHORTCODE, remitTax, TAX_COMMAND_ID } from './remit-tax'
export type {
  TaxRemittanceErrorResponse,
  TaxRemittanceRequest,
  TaxRemittanceResponse,
  TaxRemittanceResult,
  TaxRemittanceResultParameter,
} from './types'
