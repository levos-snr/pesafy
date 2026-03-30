# CLI

pesafy ships a CLI that lets you interact with Daraja directly from your terminal — ideal for setup, testing, and debugging.

## Usage

```sh
npx pesafy <command>
# or
bunx pesafy <command>
```

## Commands

| Command                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `init`                   | Scaffold `.env` interactively                     |
| `doctor`                 | Validate `.env` for common mistakes               |
| `token`                  | Print a fresh OAuth access token                  |
| `encrypt`                | Encrypt initiator password → `SecurityCredential` |
| `validate-phone <phone>` | Validate and normalise a Kenyan phone number      |
| `stk-push`               | Initiate an STK Push (interactive or with flags)  |
| `stk-query <checkoutId>` | Check STK Push status                             |
| `balance`                | Query M-PESA account balance                      |
| `reversal <txId>`        | Initiate a transaction reversal                   |
| `register-c2b-urls`      | Register C2B Confirmation + Validation URLs       |
| `simulate-c2b`           | Simulate a C2B payment (sandbox only)             |
| `version`                | Print library version                             |
| `help`                   | Show help                                         |

## Examples

### Scaffold config

```sh
npx pesafy init
```

Walks you through all required environment variables and writes a `.env` file.

### Validate config

```sh
npx pesafy doctor
```

```
✔  MPESA_CONSUMER_KEY
✔  MPESA_CONSUMER_SECRET
✔  MPESA_ENVIRONMENT
✔  MPESA_SHORTCODE
✔  MPESA_PASSKEY
✔  MPESA_CALLBACK_URL
✔  All checks passed! Your config looks good.
```

### Get an OAuth token

```sh
npx pesafy token
```

```
Access Token:

eyJhbGciOiJSUzI1NiIsInR5c...

Token is valid for 3600 seconds (1 hour).
```

### Send an STK Push

```sh
# Interactive
npx pesafy stk-push

# With flags
npx pesafy stk-push --amount 100 --phone 0712345678 --ref INV-001
```

### Query STK Push status

```sh
npx pesafy stk-query ws_CO_260520211133524545
```

### Encrypt a password

```sh
npx pesafy encrypt Safaricom999! ./SandboxCertificate.cer
```

```
SecurityCredential (base64):

MIIBIjANBgkqhk...

Copy this value into MPESA_SECURITY_CREDENTIAL in your .env or config.
```

### Validate a phone number

```sh
npx pesafy validate-phone 0712345678
```

```
✔  0712345678 → 254712345678
```

### Register C2B URLs

```sh
npx pesafy register-c2b-urls \
  600984 \
  https://yourdomain.com/api/mpesa/c2b/confirmation \
  https://yourdomain.com/api/mpesa/c2b/validation
```

### Simulate a C2B payment (sandbox only)

```sh
npx pesafy simulate-c2b
```

## Environment Variables

The CLI reads from `.env` in the current working directory. All standard `MPESA_*` variables are supported — see [Installation](/guide/installation#environment-variables) for the full list.

## Debug Mode

Set `PESAFY_DEBUG=1` to print full stack traces on errors:

```sh
PESAFY_DEBUG=1 npx pesafy stk-push
```
