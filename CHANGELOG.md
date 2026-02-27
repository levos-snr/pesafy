# pesafy

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
