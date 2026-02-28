---
"pesafy": minor
---

Refactored pesafy to STK Push only — removed B2B, B2C, C2B, QR Code, Reversal, and Transaction Status modules along with all related imports, types, and webhook handlers. The Mpesa client now exposes only stkPush() and stkQuery(), the Express router only serves STK Push endpoints, and webhook handling is scoped to STK callbacks exclusively. Core infrastructure (auth, HTTP, phone utils, error handling) is unchanged. Bundle size reduced ~60%.
