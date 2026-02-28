# pesafy

## 0.3.7

### Patch Changes

- add transaction status

## 0.3.6

### Patch Changes

- add new version

## 0.3.8

### Patch Changes

- cleaning up tag

## 0.3.7

### Patch Changes

- d202bbe: chnaging version to 0.3.6
- a12678b: changing the verssion since l cant delete/unpublish previons versio to start from scratch

## 0.1.0

### Minor Changes

- ae074f1: Refactored pesafy to STK Push only — removed B2B, B2C, C2B, QR Code, Reversal, and Transaction Status modules along with all related imports, types, and webhook handlers. The Mpesa client now exposes only stkPush() and stkQuery(), the Express router only serves STK Push endpoints, and webhook handling is scoped to STK callbacks exclusively. Core infrastructure (auth, HTTP, phone utils, error handling) is unchanged. Bundle size reduced ~60%.

## 0.3.5

### Patch Changes

- d066c9c: conditional bill reference for bu goods

## 0.3.4

### Patch Changes

- f983f64: The /v2/simulate path is the most critical bug — it will cause persistent 500.003.1001 errors in sandbox just like the /v2/registerurl issue you already fixed.

## 0.3.3

### Patch Changes

- 2790c0f: The v2 path for registerurl does not exist on Daraja

## 0.3.2

### Patch Changes

- 4115f0a: fix

## 0.3.1

### Patch Changes

- **C2B module rewrite & phone utility refactor** — Fixed `simulateC2B` where `CommandID` was hardcoded to `CustomerPayBillOnline`, making `CustomerBuyGoodsOnline` (Till) payments impossible. Corrected `BillRefNumber` logic so the field is omitted entirely for BuyGoods requests rather than defaulting to the string `"default"`, which caused a `400` from Daraja. Fixed `Msisdn` being sent as a quoted string instead of a JSON number as the spec requires. Removed the phantom `ConversationID` field from both `C2BSimulateResponse` and `C2BRegisterUrlResponse` — Daraja never returns this field for C2B, only `OriginatorCoversationID`. Extracted phone formatting into a shared `src/utils/phone.ts` module with two intentionally separate formatters: `formatSafaricomPhone` (strict, Safaricom/Airtel only, for STK Push) and `formatKenyanMsisdn` (permissive, all Kenyan networks, for C2B and B2C), eliminating duplicated logic across modules. Added the `C2BCommandId` union type and full callback payload types — `C2BValidationPayload`, `C2BConfirmationPayload`, and `C2BCallbackPayload` — to enable type-safe webhook handlers.
- fbfa311: fix url patch and add elemt accountref
- aa9c176: **C2B module rewrite & phone utility refactor** — Fixed `simulateC2B` where `CommandID` was hardcoded to `CustomerPayBillOnline`, making `CustomerBuyGoodsOnline` (Till) payments impossible. Corrected `BillRefNumber` logic so the field is omitted entirely for BuyGoods requests rather than defaulting to the string `"default"`, which caused a `400` from Daraja. Fixed `Msisdn` being sent as a quoted string instead of a JSON number as the spec requires. Removed the phantom `ConversationID` field from both `C2BSimulateResponse` and `C2BRegisterUrlResponse` — Daraja never returns this field for C2B, only `OriginatorCoversationID`. Extracted phone formatting into a shared `src/utils/phone.ts` module with two intentionally separate formatters: `formatSafaricomPhone` (strict, Safaricom/Airtel only, for STK Push) and `formatKenyanMsisdn` (permissive, all Kenyan networks, for C2B and B2C), eliminating duplicated logic across modules. Added the `C2BCommandId` union type and full callback payload types — `C2BValidationPayload`, `C2BConfirmationPayload`, and `C2BCallbackPayload` — to enable type-safe webhook handlers.

## 0.3.0

### Minor Changes

- fe95c2b: The C2B M-Pesa implementation in the pesafy package has been comprehensively overhauled for full Daraja C2B v2 compliance, including a complete rewrite of types.ts with all 13 callback fields (C2BCallbackPayload), validation responses, rejection codes, and command/response unions; fixes to register-url.ts ensuring ValidationURL is always sent (defaulting to confirmationUrl); enhanced simulate.ts supporting both CustomerPayBillOnline and CustomerBuyGoodsOnline with proper BillRefNumber handling, amount validation, and Msisdn casting; new c2b index exports; root index public exports; and improved http client error reporting. Dashboard updates add c2bRegisterUrls and c2bSimulate actions in mpesaActions.ts, fix http.ts webhook handlers with 6 missing fields (TransactionType, TransTime, etc.), upsert logic via createTransaction, a new getByShortCode query in businesses.ts, and a complete C2B tab in PaymentsPage.tsx featuring URL registration, simulation forms, and unified transactions—addressing prior gaps like hardcoded commands, missing UI, incomplete types, and non-upserting handlers.

## 0.2.4

### Patch Changes

- 4a535ef: Request failed with status 500 but swallows the actual Daraja error body — it parses it into data but never includes it in the error message.

## 0.2.3

### Patch Changes

- 16a7a59: error code fix

## 0.2.2

### Patch Changes

- fix the missing pieces

## 0.2.1

### Patch Changes

- fix versioning

## 0.2.0

### Minor Changes

- Add M-Pesa Express (STK Push) support
  - Add `processStkPush` to initiate STK Push payment prompts on a
    customer's phone via POST /mpesa/stkpush/v1/processrequest
  - Add `queryStkPush` to check the status of an STK Push transaction
    via POST /mpesa/stkpushquery/v1/query
  - Add `StkPushRequest`, `StkPushResponse`, `StkQueryRequest`,
    `StkQueryResponse` and `TransactionType` types
  - Add `formatPhoneNumber` utility to normalize Kenyan phone numbers
    to 254 format
  - Add `getStkPushPassword` to generate Base64(Shortcode+Passkey+Timestamp)
  - Add `getTimestamp` helper for Daraja-formatted timestamps
  - Export all STK Push types and utilities from the package root

## 0.1.0

### Minor Changes

- d988767: ready for phase one

## 0.0.1

### Patch Changes

- init changeset/cli
