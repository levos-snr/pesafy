# CLI

pesafy ships a zero-install CLI for scaffolding, testing, debugging, and
managing your Daraja integration from the terminal.

## Usage

```sh
npx pesafy <command> [options]
# or
bunx pesafy <command> [options]
# or, after installing globally:
pnpm add -g pesafy && pesafy <command>
```

## Commands

| Command                         | Description                                       |
| ------------------------------- | ------------------------------------------------- |
| `init`                          | Scaffold `.env` interactively                     |
| `doctor`                        | Validate `.env` for errors and missing keys       |
| `token`                         | Print a fresh Daraja OAuth access token           |
| `encrypt [password] [certPath]` | Encrypt initiator password → `SecurityCredential` |
| `validate-phone <phone>`        | Validate and normalise a Kenyan phone number      |
| `stk-push`                      | Initiate an STK Push payment                      |
| `stk-query <checkoutId>`        | Query STK Push status by CheckoutRequestID        |
| `balance`                       | Query M-PESA account balance (async)              |
| `reversal <txId>`               | Initiate a transaction reversal                   |
| `register-c2b-urls`             | Register C2B Confirmation + Validation URLs       |
| `simulate-c2b`                  | Simulate a C2B payment (sandbox only)             |
| `version`                       | Print library version                             |
| `help`                          | Show usage information                            |

---

## `init` — Scaffold config

```sh
npx pesafy init
```

Walks you through every required environment variable and writes `.env` in the
current directory. If a `.env` already exists you are asked before overwriting.

---

## `doctor` — Validate config

```sh
npx pesafy doctor
```

Checks all `MPESA_*` variables in `.env` for:

- Missing required keys
- Invalid `MPESA_ENVIRONMENT` value
- Callback/result URLs containing forbidden keywords (`mpesa`, `safaricom`,
  `exec`, etc.)
- Non-HTTPS URLs in production
- Certificate file existence at `MPESA_CERTIFICATE_PATH`

```
✔  MPESA_CONSUMER_KEY
✔  MPESA_CONSUMER_SECRET
✔  MPESA_ENVIRONMENT
✔  MPESA_SHORTCODE
✔  MPESA_PASSKEY
✔  MPESA_CALLBACK_URL
✔  MPESA_INITIATOR_NAME
✔  MPESA_INITIATOR_PASSWORD
✔  MPESA_CERTIFICATE_PATH  (/home/user/project/SandboxCertificate.cer)
✔  MPESA_RESULT_URL
✔  MPESA_QUEUE_TIMEOUT_URL

✔  All checks passed! Your config looks good.
```

---

## `token` — Get OAuth token

```sh
npx pesafy token
```

Fetches a fresh Daraja access token using `MPESA_CONSUMER_KEY` and
`MPESA_CONSUMER_SECRET` from `.env` and prints it to stdout.

```
Access Token:

eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

Token is valid for 3600 seconds (1 hour).
```

---

## `encrypt` — Encrypt initiator password

```sh
npx pesafy encrypt
# interactive — prompts for password and certificate path

npx pesafy encrypt "Safaricom999!" ./SandboxCertificate.cer
# non-interactive — pass arguments directly
```

Encrypts the initiator password with the Daraja X.509 certificate (RSA PKCS#1)
and prints the base64 `SecurityCredential`. Store this in
`MPESA_SECURITY_CREDENTIAL` to skip per-call encryption in production.

```
SecurityCredential (base64):

MIIBIjANBgkqhkiG9w0BAQEFAAOCAa8AMIIBCgKCAa...

Copy this value into MPESA_SECURITY_CREDENTIAL in your .env or config.
```

---

## `validate-phone` — Normalise a phone number

```sh
npx pesafy validate-phone 0712345678
npx pesafy validate-phone +254712345678
npx pesafy validate-phone 712345678
```

```
✔  0712345678 → 254712345678
```

Exits with code 1 and an error message if the number cannot be normalised.

---

## `stk-push` — Send a payment prompt

```sh
# Interactive — prompts for all fields
npx pesafy stk-push

# With flags
npx pesafy stk-push --amount 100 --phone 0712345678 --ref INV-001 --desc "Test payment"
```

**Flags:**

| Flag           | Description                               |
| -------------- | ----------------------------------------- |
| `--amount <n>` | Amount in KES                             |
| `--phone <n>`  | Customer phone number (any Kenyan format) |
| `--ref <s>`    | Account reference (max 12 chars)          |
| `--desc <s>`   | Transaction description (max 13 chars)    |

**Output:**

```
✔  STK Push sent successfully!

  CheckoutRequestID:  ws_CO_260520241133524545
  MerchantRequestID:  29115-34620561-1
  CustomerMessage:    Success. Request accepted for processing

  Use `npx pesafy stk-query <CheckoutRequestID>` to check status.
```

Reads `MPESA_SHORTCODE`, `MPESA_PASSKEY`, and `MPESA_CALLBACK_URL` from `.env`.

---

## `stk-query` — Check payment status

```sh
npx pesafy stk-query ws_CO_260520241133524545
# or interactive (prompts if omitted):
npx pesafy stk-query
```

```
✔  Payment confirmed! — The service request has been accepted successfully.

{
  "ResponseCode": "0",
  "ResultCode": 0,
  "ResultDesc": "The service request has been accepted successfully.",
  ...
}
```

---

## `balance` — Query account balance

```sh
npx pesafy balance
# or with flags:
npx pesafy balance --shortcode 600000 --identifier-type 4
```

**Flags:**

| Flag                    | Description                               | Default                          |
| ----------------------- | ----------------------------------------- | -------------------------------- |
| `--shortcode <n>`       | Shortcode to query (PartyA)               | `MPESA_SHORTCODE`                |
| `--identifier-type <n>` | `1` = MSISDN, `2` = Till, `4` = ShortCode | `4`                              |
| `--remarks <s>`         | Optional remarks                          | `'Balance query via pesafy CLI'` |

::: info Asynchronous API Account Balance is asynchronous. The CLI submits the
request and prints the `OriginatorConversationID`. The actual balance data will
be POSTed to `MPESA_RESULT_URL` by Safaricom. Monitor your result endpoint or
check the M-PESA org portal. :::

```
✔  Account Balance query submitted!

  OriginatorConversationID:  AG_20241114_20107ed6349ccf88d49e
  ConversationID:            AG_20241114_20107ed6349ccf88d49e
  ResponseDescription:       Accept the service request successfully.
  PartyA (shortcode):        600000
  IdentifierType:            4 (Organisation ShortCode)

  ⚠  This API is ASYNCHRONOUS. The balance data will be POSTed to:
  https://yourdomain.com/api/mpesa/result
```

---

## `reversal` — Reverse a transaction

```sh
npx pesafy reversal PDU91HIVIT
# or interactive:
npx pesafy reversal
```

Arguments (positional or interactive):

1. Transaction ID (M-PESA receipt number)
2. Receiver Party (your shortcode)
3. Amount to reverse

::: info Asynchronous API Like Account Balance, Reversal is async — the result
arrives at `MPESA_RESULT_URL`. :::

---

## `register-c2b-urls` — Register C2B callbacks

```sh
npx pesafy register-c2b-urls \
  600984 \
  https://yourdomain.com/api/mpesa/c2b/confirmation \
  https://yourdomain.com/api/mpesa/c2b/validation \
  Completed
```

Arguments (positional or interactive):

1. Shortcode
2. Confirmation URL
3. Validation URL
4. Response type (`Completed` or `Cancelled`, sentence-case)

---

## `simulate-c2b` — Simulate a payment (sandbox only)

```sh
npx pesafy simulate-c2b
```

Prompts for shortcode, amount, MSISDN, CommandID, and BillRefNumber (Paybill
only). Sandbox test MSISDN: `254708374149`.

---

## Environment Variables

All CLI commands read from `.env` in the current working directory. The relevant
variables per command:

| Command                             | Required Variables                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `token`                             | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_ENVIRONMENT`                                                                  |
| `stk-push`                          | Above + `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`                                                                    |
| `stk-query`                         | Above + `MPESA_SHORTCODE`, `MPESA_PASSKEY`                                                                                          |
| `balance`, `reversal`               | Above + `MPESA_INITIATOR_NAME`, `MPESA_INITIATOR_PASSWORD`, `MPESA_CERTIFICATE_PATH`, `MPESA_RESULT_URL`, `MPESA_QUEUE_TIMEOUT_URL` |
| `encrypt`                           | `MPESA_CERTIFICATE_PATH` (or pass path as argument)                                                                                 |
| `register-c2b-urls`, `simulate-c2b` | `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_ENVIRONMENT`                                                                  |

## Debug mode

Set `PESAFY_DEBUG=1` to print full stack traces on errors:

```sh
PESAFY_DEBUG=1 npx pesafy stk-push --amount 100 --phone 0712345678
```
