# Core Module

The core module provides foundational functionality used across all payment operations.

## Modules

### Auth (`auth/`)

OAuth token management and caching for Daraja API authentication.

### Encryption (`encryption/`)

Security credential encryption using RSA with M-Pesa public certificates.

### Idempotency (`idempotency/`)

Idempotency key generation and state management to prevent duplicate transactions.

### Validation (`validation/`)

Request validation and sanitization utilities.

## Usage

```typescript
import { TokenManager } from "./auth";
import { encryptSecurityCredentials } from "./encryption";
import { generateIdempotencyKey } from "./idempotency";
import { validateRequest } from "./validation";
```
