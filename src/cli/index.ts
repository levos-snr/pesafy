#!/usr/bin/env node
// 📁 PATH: src/cli/index.ts
/**
 *
 * Usage:
 *   npx pesafy <command> [options]
 *   bunx pesafy <command> [options]
 *
 * Commands:
 *   init               — scaffold .env + config with prompts
 *   stk-push           — send an STK Push from the terminal
 *   stk-query          — query an STK Push status
 *   balance            — query M-PESA account balance
 *   token              — print a fresh OAuth token
 *   encrypt            — encrypt an initiator password → SecurityCredential
 *   validate-phone     — validate/normalise a Kenyan phone number
 *   register-c2b-urls  — register C2B Confirmation + Validation URLs
 *   simulate-c2b       — simulate a C2B payment (sandbox only)
 *   reversal           — initiate a transaction reversal
 *   doctor             — check your .env config for common mistakes
 *   version            — print the library version
 *   help               — show this help
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
}

const g = (s: string) => `${C.green}${s}${C.reset}`
const y = (s: string) => `${C.yellow}${s}${C.reset}`
const r = (s: string) => `${C.red}${s}${C.reset}`
const b = (s: string) => `${C.bold}${s}${C.reset}`
const c = (s: string) => `${C.cyan}${s}${C.reset}`
const dim = (s: string) => `${C.dim}${s}${C.reset}`

// ── Package version ───────────────────────────────────────────────────────────
function getPkgVersion(): string {
  try {
    const pkgPath = resolve(
      new URL('../../package.json', import.meta.url).pathname,
    )
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      version: string
    }
    return pkg.version
  } catch {
    return 'unknown'
  }
}

// ── Prompt helper ─────────────────────────────────────────────────────────────
function prompt(question: string, defaultVal = ''): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const displayDefault = defaultVal ? dim(` [${defaultVal}]`) : ''
  return new Promise((resolve) => {
    rl.question(`${question}${displayDefault}: `, (answer) => {
      rl.close()
      resolve(answer.trim() || defaultVal)
    })
  })
}

// ── Env loader ────────────────────────────────────────────────────────────────
function loadEnv(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return {}
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  const env: Record<string, string> = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    env[key] = val
  }
  return env
}

function requireEnv(env: Record<string, string>, ...keys: string[]): void {
  const missing = keys.filter((k) => !env[k])
  if (missing.length) {
    console.error(r(`✖  Missing env vars: ${missing.join(', ')}`))
    console.error(dim('  Run: npx pesafy init'))
    process.exit(1)
  }
}

// ── HTTP helper (no external deps needed) ────────────────────────────────────
async function fetchJson<T>(
  url: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`)
  }
}

async function getToken(
  consumerKey: string,
  consumerSecret: string,
  baseUrl: string,
): Promise<string> {
  const creds = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    'base64',
  )
  const data = await fetchJson<{ access_token: string }>(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    'GET',
    { Authorization: `Basic ${creds}` },
  )
  if (!data.access_token) throw new Error('No access_token in response')
  return data.access_token
}

// ── Commands ──────────────────────────────────────────────────────────────────

async function cmdVersion() {
  console.log(`pesafy v${getPkgVersion()}`)
}

async function cmdHelp() {
  console.log(`
${b(`pesafy`)} ${dim(`v${getPkgVersion()}`)} — M-PESA Daraja SDK CLI

${b('COMMANDS')}
  ${g('init')}                  Scaffold .env + config file interactively
  ${g('doctor')}                Validate .env config for common mistakes
  ${g('token')}                 Print a fresh Daraja OAuth token
  ${g('encrypt')}               Encrypt an initiator password → SecurityCredential
  ${g('validate-phone')} ${c('<phone>')}  Validate and normalise a Kenyan phone number
  ${g('stk-push')}              Initiate an STK Push payment prompt
  ${g('stk-query')} ${c('<checkoutId>')}  Query status of an STK Push
  ${g('balance')}               Query M-PESA account balance
  ${g('reversal')} ${c('<txId>')}         Initiate a transaction reversal
  ${g('register-c2b-urls')}     Register C2B Confirmation + Validation URLs
  ${g('simulate-c2b')}          Simulate a C2B payment (sandbox only)
  ${g('version')}               Print library version
  ${g('help')}                  Show this help

${b('ENVIRONMENT')}
  All commands read from .env in the current directory.
  Required keys:
    MPESA_CONSUMER_KEY     — Daraja consumer key
    MPESA_CONSUMER_SECRET  — Daraja consumer secret
    MPESA_ENVIRONMENT      — "sandbox" | "production"

  STK Push additionally requires:
    MPESA_SHORTCODE        — Paybill / HO shortcode
    MPESA_PASSKEY          — Lipa Na M-PESA passkey
    MPESA_CALLBACK_URL     — Public callback URL

  Initiator APIs (B2C / Reversal / Balance) additionally require:
    MPESA_INITIATOR_NAME
    MPESA_INITIATOR_PASSWORD
    MPESA_CERTIFICATE_PATH — Path to .cer file

${b('EXAMPLES')}
  ${dim('$ npx pesafy init')}
  ${dim('$ npx pesafy stk-push --amount 100 --phone 254712345678')}
  ${dim('$ npx pesafy stk-query ws_CO_1234567890')}
  ${dim('$ npx pesafy token')}
  ${dim('$ npx pesafy doctor')}
  ${dim('$ npx pesafy validate-phone 0712345678')}
`)
}

async function cmdInit() {
  console.log(`\n${b('🚀  pesafy — Interactive Setup')}\n`)
  console.log(dim('This will create a .env file in the current directory.\n'))

  const env = await prompt('Environment (sandbox/production)', 'sandbox')
  const consumerKey = await prompt('Consumer Key')
  const consumerSecret = await prompt('Consumer Secret')
  const shortcode = await prompt(
    'Lipa Na M-PESA Shortcode (for STK Push)',
    '174379',
  )
  const passkey = await prompt('Lipa Na M-PESA Passkey')
  const callbackUrl = await prompt(
    'STK Push Callback URL',
    'https://yourdomain.com/api/mpesa/callback',
  )
  const initiatorName = await prompt(
    'Initiator Name (leave blank if not using B2C/Reversal)',
  )
  const initiatorPassword = await prompt(
    'Initiator Password (leave blank if not using B2C/Reversal)',
  )
  const certPath = await prompt(
    'Certificate path (leave blank to skip)',
    './SandboxCertificate.cer',
  )
  const resultUrl = await prompt(
    'Result URL (for async APIs)',
    'https://yourdomain.com/api/mpesa/result',
  )
  const queueTimeoutUrl = await prompt(
    'Queue Timeout URL',
    'https://yourdomain.com/api/mpesa/timeout',
  )

  const content = `# pesafy — M-PESA Daraja configuration
# Generated by: npx pesafy init

MPESA_ENVIRONMENT=${env}
MPESA_CONSUMER_KEY=${consumerKey}
MPESA_CONSUMER_SECRET=${consumerSecret}

# STK Push (M-PESA Express)
MPESA_SHORTCODE=${shortcode}
MPESA_PASSKEY=${passkey}
MPESA_CALLBACK_URL=${callbackUrl}

# Initiator (B2C / Reversal / Account Balance / Tax Remittance)
MPESA_INITIATOR_NAME=${initiatorName}
MPESA_INITIATOR_PASSWORD=${initiatorPassword}
MPESA_CERTIFICATE_PATH=${certPath}

# Async API result endpoints
MPESA_RESULT_URL=${resultUrl}
MPESA_QUEUE_TIMEOUT_URL=${queueTimeoutUrl}
`

  const envPath = resolve(process.cwd(), '.env')
  if (existsSync(envPath)) {
    const overwrite = await prompt(
      '.env already exists — overwrite? (y/N)',
      'N',
    )
    if (overwrite.toLowerCase() !== 'y') {
      console.log(y('⚠  Skipped — existing .env preserved.'))
      return
    }
  }

  writeFileSync(envPath, content)
  console.log(
    `\n${g('✔  .env created')} — run ${c('npx pesafy doctor')} to validate.\n`,
  )
}

async function cmdDoctor() {
  console.log(`\n${b('🩺  pesafy doctor')}\n`)
  const env = loadEnv()
  let ok = true

  function check(key: string, hint = '') {
    if (env[key]) {
      console.log(`${g('✔')}  ${key}`)
    } else {
      console.log(`${r('✖')}  ${key}${hint ? dim(` — ${hint}`) : ''}`)
      ok = false
    }
  }

  console.log(b('Core:'))
  check('MPESA_CONSUMER_KEY', 'Get from https://developer.safaricom.co.ke')
  check('MPESA_CONSUMER_SECRET')
  check('MPESA_ENVIRONMENT', "'sandbox' or 'production'")

  const envVal = env['MPESA_ENVIRONMENT'] ?? ''
  if (envVal && envVal !== 'sandbox' && envVal !== 'production') {
    console.log(
      r(
        `  ✖  MPESA_ENVIRONMENT must be "sandbox" or "production", got "${envVal}"`,
      ),
    )
    ok = false
  }

  console.log(`\n${b('STK Push:')}`)
  check('MPESA_SHORTCODE')
  check('MPESA_PASSKEY')
  check(
    'MPESA_CALLBACK_URL',
    'Must be a publicly accessible HTTPS URL in production',
  )

  const cb = env['MPESA_CALLBACK_URL'] ?? ''
  if (cb && envVal === 'production' && !cb.startsWith('https://')) {
    console.log(r('  ✖  MPESA_CALLBACK_URL must be HTTPS in production'))
    ok = false
  }
  if (
    cb &&
    ['mpesa', 'safaricom', '.exe', 'cmd', 'sql'].some((kw) =>
      cb.toLowerCase().includes(kw),
    )
  ) {
    console.log(
      r(
        '  ✖  MPESA_CALLBACK_URL contains a forbidden keyword (mpesa/safaricom/etc.)',
      ),
    )
    ok = false
  }

  console.log(`\n${b('Initiator (B2C / Reversal / Balance — optional):')}`)
  const hasInitiator = !!(
    env['MPESA_INITIATOR_NAME'] && env['MPESA_INITIATOR_PASSWORD']
  )
  if (!hasInitiator) {
    console.log(
      dim('  — Not configured (only required for B2C, Reversal, Balance, Tax)'),
    )
  } else {
    check('MPESA_INITIATOR_NAME')
    check('MPESA_INITIATOR_PASSWORD')
    const certPath = env['MPESA_CERTIFICATE_PATH']
    if (certPath) {
      const fullPath = resolve(process.cwd(), certPath)
      if (existsSync(fullPath)) {
        console.log(`${g('✔')}  MPESA_CERTIFICATE_PATH ${dim(`(${fullPath})`)}`)
      } else {
        console.log(
          `${r('✖')}  MPESA_CERTIFICATE_PATH — file not found: ${fullPath}`,
        )
        ok = false
      }
    } else {
      console.log(
        y(
          '⚠  MPESA_CERTIFICATE_PATH not set — download from Safaricom Daraja portal',
        ),
      )
    }
  }

  console.log(`\n${b('Async result URLs (optional but recommended):')}`)
  if (env['MPESA_RESULT_URL']) {
    console.log(`${g('✔')}  MPESA_RESULT_URL`)
  } else {
    console.log(dim('  — Not set'))
  }

  console.log('')
  if (ok) {
    console.log(`${g('✔  All checks passed!')} Your config looks good.\n`)
  } else {
    console.log(
      `${r('✖  Some checks failed.')} Fix the issues above, then re-run ${c('npx pesafy doctor')}.\n`,
    )
    process.exit(1)
  }
}

async function cmdToken() {
  const env = loadEnv()
  requireEnv(
    env,
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_ENVIRONMENT',
  )
  const baseUrl =
    env['MPESA_ENVIRONMENT'] === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

  process.stdout.write(dim('Fetching token…'))
  try {
    const token = await getToken(
      env['MPESA_CONSUMER_KEY']!,
      env['MPESA_CONSUMER_SECRET']!,
      baseUrl,
    )
    process.stdout.write('\r')
    console.log(`\n${b('Access Token:')}\n\n${c(token)}\n`)
    console.log(dim('Token is valid for 3600 seconds (1 hour).'))
  } catch (e) {
    process.stdout.write('\r')
    console.error(r(`✖  ${(e as Error).message}`))
    process.exit(1)
  }
}

async function cmdEncrypt(args: string[]) {
  const env = loadEnv()

  let password = args[0]
  let certPath = args[1] ?? env['MPESA_CERTIFICATE_PATH']

  if (!password) password = await prompt('Initiator password to encrypt')
  if (!certPath)
    certPath = await prompt('Certificate path', './SandboxCertificate.cer')

  if (!existsSync(resolve(process.cwd(), certPath))) {
    console.error(r(`✖  Certificate not found: ${certPath}`))
    process.exit(1)
  }

  try {
    const { encryptSecurityCredential } =
      await import('../core/encryption/index.js')
    const { readFile } = await import('node:fs/promises')
    const pem = await readFile(resolve(process.cwd(), certPath), 'utf-8')
    const credential = encryptSecurityCredential(password, pem)
    console.log(`\n${b('SecurityCredential (base64):')}\n\n${c(credential)}\n`)
    console.log(
      dim(
        'Copy this value into MPESA_SECURITY_CREDENTIAL in your .env or config.',
      ),
    )
  } catch (e) {
    console.error(r(`✖  Encryption failed: ${(e as Error).message}`))
    process.exit(1)
  }
}

async function cmdValidatePhone(args: string[]) {
  let phone = args[0]
  if (!phone) phone = await prompt('Phone number to validate')

  try {
    const { formatSafaricomPhone } = await import('../utils/phone/index.js')
    const normalised = formatSafaricomPhone(phone)
    console.log(`\n${g('✔')}  ${b(phone)} → ${c(normalised)}\n`)
  } catch (e) {
    console.error(`\n${r('✖')}  Invalid: ${(e as Error).message}\n`)
    process.exit(1)
  }
}

async function cmdStkPush(args: string[]) {
  const env = loadEnv()
  requireEnv(
    env,
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_ENVIRONMENT',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL',
  )

  // Parse --amount and --phone from args
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? args[idx + 1] : undefined
  }

  let amount = Number(getArg('--amount') ?? 0)
  let phone = getArg('--phone') ?? ''
  let accountRef = getArg('--ref') ?? ''
  let desc = getArg('--desc') ?? 'Payment'

  if (!amount) amount = Number(await prompt('Amount (KES)'))
  if (!phone) phone = await prompt('Phone number (e.g. 0712345678)')
  if (!accountRef)
    accountRef = await prompt(
      'Account reference',
      `CLI-${Date.now().toString(36).toUpperCase()}`,
    )

  const baseUrl =
    env['MPESA_ENVIRONMENT'] === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

  console.log(dim('\nFetching token…'))
  const token = await getToken(
    env['MPESA_CONSUMER_KEY']!,
    env['MPESA_CONSUMER_SECRET']!,
    baseUrl,
  )

  // Format phone
  const { formatSafaricomPhone } = await import('../utils/phone/index.js')
  const msisdn = formatSafaricomPhone(phone)

  // Build password
  const { getStkPushPassword, getTimestamp } =
    await import('../mpesa/stk-push/utils.js')
  const timestamp = getTimestamp()
  const password = getStkPushPassword(
    env['MPESA_SHORTCODE']!,
    env['MPESA_PASSKEY']!,
    timestamp,
  )

  console.log(dim('Sending STK Push…\n'))

  try {
    const result = (await fetchJson(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      'POST',
      { Authorization: `Bearer ${token}` },
      {
        BusinessShortCode: env['MPESA_SHORTCODE'],
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: msisdn,
        PartyB: env['MPESA_SHORTCODE'],
        PhoneNumber: msisdn,
        CallBackURL: env['MPESA_CALLBACK_URL'],
        AccountReference: accountRef.slice(0, 12),
        TransactionDesc: desc.slice(0, 13),
      },
    )) as Record<string, string>

    if (result['ResponseCode'] === '0') {
      console.log(`${g('✔  STK Push sent successfully!')}\n`)
      console.log(
        `  ${b('CheckoutRequestID:')} ${c(result['CheckoutRequestID'] ?? '')}`,
      )
      console.log(
        `  ${b('MerchantRequestID:')} ${result['MerchantRequestID'] ?? ''}`,
      )
      console.log(
        `  ${b('CustomerMessage:')}   ${result['CustomerMessage'] ?? ''}`,
      )
      console.log(
        `\n${dim('  Use `npx pesafy stk-query <CheckoutRequestID>` to check status.')}\n`,
      )
    } else {
      console.log(`${r('✖  STK Push failed:')}\n`)
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (e) {
    console.error(r(`✖  ${(e as Error).message}`))
    process.exit(1)
  }
}

async function cmdStkQuery(args: string[]) {
  const env = loadEnv()
  requireEnv(
    env,
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_ENVIRONMENT',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY',
  )

  let checkoutId = args[0]
  if (!checkoutId) checkoutId = await prompt('CheckoutRequestID')

  const baseUrl =
    env['MPESA_ENVIRONMENT'] === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

  const token = await getToken(
    env['MPESA_CONSUMER_KEY']!,
    env['MPESA_CONSUMER_SECRET']!,
    baseUrl,
  )
  const { getStkPushPassword, getTimestamp } =
    await import('../mpesa/stk-push/utils.js')
  const timestamp = getTimestamp()
  const password = getStkPushPassword(
    env['MPESA_SHORTCODE']!,
    env['MPESA_PASSKEY']!,
    timestamp,
  )

  try {
    const result = (await fetchJson(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      'POST',
      { Authorization: `Bearer ${token}` },
      {
        BusinessShortCode: env['MPESA_SHORTCODE'],
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutId,
      },
    )) as Record<string, unknown>

    const code = result['ResultCode'] as number
    const desc = result['ResultDesc'] as string

    if (code === 0) {
      console.log(`\n${g('✔  Payment confirmed!')} — ${desc}\n`)
    } else {
      console.log(
        `\n${y('⚠  Payment not complete')} (code ${code}) — ${desc}\n`,
      )
    }
    console.log(JSON.stringify(result, null, 2))
  } catch (e) {
    console.error(r(`✖  ${(e as Error).message}`))
    process.exit(1)
  }
}

async function cmdBalance(args: string[]) {
  const env = loadEnv()
  requireEnv(
    env,
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_ENVIRONMENT',
    'MPESA_INITIATOR_NAME',
    'MPESA_INITIATOR_PASSWORD',
  )

  const partyA =
    args[0] ?? env['MPESA_SHORTCODE'] ?? (await prompt('Shortcode to query'))
  const resultUrl = env['MPESA_RESULT_URL'] ?? (await prompt('Result URL'))
  const queueTimeoutUrl =
    env['MPESA_QUEUE_TIMEOUT_URL'] ?? (await prompt('Queue Timeout URL'))

  const baseUrl =
    env['MPESA_ENVIRONMENT'] === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

  console.log(dim('\nFetching token…'))
  const token = await getToken(
    env['MPESA_CONSUMER_KEY']!,
    env['MPESA_CONSUMER_SECRET']!,
    baseUrl,
  )

  const { encryptSecurityCredential } =
    await import('../core/encryption/index.js')
  const { readFile } = await import('node:fs/promises')
  const certPath = env['MPESA_CERTIFICATE_PATH'] ?? './SandboxCertificate.cer'
  const pem = await readFile(resolve(process.cwd(), certPath), 'utf-8')
  const cred = encryptSecurityCredential(env['MPESA_INITIATOR_PASSWORD']!, pem)

  console.log(dim('Sending balance query…\n'))

  try {
    const result = (await fetchJson(
      `${baseUrl}/mpesa/accountbalance/v1/query`,
      'POST',
      { Authorization: `Bearer ${token}` },
      {
        Initiator: env['MPESA_INITIATOR_NAME'],
        SecurityCredential: cred,
        CommandID: 'AccountBalance',
        PartyA: partyA,
        IdentifierType: '4',
        ResultURL: resultUrl,
        QueueTimeOutURL: queueTimeoutUrl,
        Remarks: 'Balance query via pesafy CLI',
      },
    )) as Record<string, string>

    if (result['ResponseCode'] === '0') {
      console.log(
        `${g('✔  Balance query submitted!')} Result will be POSTed to:\n  ${c(resultUrl)}\n`,
      )
    } else {
      console.log(r('✖  Request failed:'))
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (e) {
    console.error(r(`✖  ${(e as Error).message}`))
    process.exit(1)
  }
}

async function cmdRegisterC2BUrls(args: string[]) {
  const env = loadEnv()
  requireEnv(
    env,
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_ENVIRONMENT',
  )

  const shortCode =
    args[0] ?? env['MPESA_SHORTCODE'] ?? (await prompt('Shortcode'))
  const confirmationUrl = args[1] ?? (await prompt('Confirmation URL'))
  const validationUrl = args[2] ?? (await prompt('Validation URL'))
  const responseType = (args[3] ??
    (await prompt('Response type (Completed/Cancelled)', 'Completed'))) as
    | 'Completed'
    | 'Cancelled'

  const baseUrl =
    env['MPESA_ENVIRONMENT'] === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

  const token = await getToken(
    env['MPESA_CONSUMER_KEY']!,
    env['MPESA_CONSUMER_SECRET']!,
    baseUrl,
  )

  try {
    const result = (await fetchJson(
      `${baseUrl}/mpesa/c2b/v2/registerurl`,
      'POST',
      { Authorization: `Bearer ${token}` },
      {
        ShortCode: shortCode,
        ResponseType: responseType,
        ConfirmationURL: confirmationUrl,
        ValidationURL: validationUrl,
      },
    )) as Record<string, string>

    if (result['ResponseCode'] === '0') {
      console.log(`\n${g('✔  C2B URLs registered successfully!')}\n`)
    } else {
      console.log(r('✖  Registration failed:'))
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (e) {
    console.error(r(`✖  ${(e as Error).message}`))
    process.exit(1)
  }
}

async function cmdSimulateC2B(args: string[]) {
  const env = loadEnv()
  requireEnv(env, 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET')
  if (env['MPESA_ENVIRONMENT'] === 'production') {
    console.error(r('✖  C2B simulate is only available in sandbox.'))
    process.exit(1)
  }

  const shortCode =
    args[0] ?? env['MPESA_SHORTCODE'] ?? (await prompt('Shortcode'))
  const amount = Number(args[1] ?? (await prompt('Amount (KES)')))
  const msisdn = args[2] ?? (await prompt('MSISDN', '254708374149'))
  const commandId = (args[3] ??
    (await prompt(
      'CommandID (CustomerPayBillOnline/CustomerBuyGoodsOnline)',
      'CustomerPayBillOnline',
    ))) as string
  const billRef =
    commandId === 'CustomerBuyGoodsOnline'
      ? undefined
      : (args[4] ?? (await prompt('BillRefNumber (account ref)', '')))

  const baseUrl = 'https://sandbox.safaricom.co.ke'
  const token = await getToken(
    env['MPESA_CONSUMER_KEY']!,
    env['MPESA_CONSUMER_SECRET']!,
    baseUrl,
  )

  const payload: Record<string, unknown> = {
    ShortCode: Number(shortCode),
    CommandID: commandId,
    Amount: Math.round(amount),
    Msisdn: Number(msisdn),
  }
  if (commandId !== 'CustomerBuyGoodsOnline')
    payload['BillRefNumber'] = billRef ?? ''

  try {
    const result = (await fetchJson(
      `${baseUrl}/mpesa/c2b/v2/simulate`,
      'POST',
      { Authorization: `Bearer ${token}` },
      payload,
    )) as Record<string, string>
    if (result['ResponseCode'] === '0') {
      console.log(`\n${g('✔  C2B simulation submitted!')}\n`)
    } else {
      console.log(r('✖  Simulation failed:'))
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (e) {
    console.error(r(`✖  ${(e as Error).message}`))
    process.exit(1)
  }
}

async function cmdReversal(args: string[]) {
  const env = loadEnv()
  requireEnv(
    env,
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_ENVIRONMENT',
    'MPESA_INITIATOR_NAME',
    'MPESA_INITIATOR_PASSWORD',
  )

  const transactionId = args[0] ?? (await prompt('Transaction ID to reverse'))
  const receiverParty =
    args[1] ??
    env['MPESA_SHORTCODE'] ??
    (await prompt('Receiver Party (shortcode)'))
  const amount = Number(args[2] ?? (await prompt('Amount to reverse')))
  const resultUrl = env['MPESA_RESULT_URL'] ?? (await prompt('Result URL'))
  const queueTimeoutUrl =
    env['MPESA_QUEUE_TIMEOUT_URL'] ?? (await prompt('Queue Timeout URL'))

  const baseUrl =
    env['MPESA_ENVIRONMENT'] === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke'

  const token = await getToken(
    env['MPESA_CONSUMER_KEY']!,
    env['MPESA_CONSUMER_SECRET']!,
    baseUrl,
  )

  const { encryptSecurityCredential } =
    await import('../core/encryption/index.js')
  const { readFile } = await import('node:fs/promises')
  const certPath = env['MPESA_CERTIFICATE_PATH'] ?? './SandboxCertificate.cer'
  const pem = await readFile(resolve(process.cwd(), certPath), 'utf-8')
  const cred = encryptSecurityCredential(env['MPESA_INITIATOR_PASSWORD']!, pem)

  try {
    const result = (await fetchJson(
      `${baseUrl}/mpesa/reversal/v1/request`,
      'POST',
      { Authorization: `Bearer ${token}` },
      {
        Initiator: env['MPESA_INITIATOR_NAME'],
        SecurityCredential: cred,
        CommandID: 'TransactionReversal',
        TransactionID: transactionId,
        Amount: String(Math.round(amount)),
        ReceiverParty: receiverParty,
        RecieverIdentifierType: '4',
        ResultURL: resultUrl,
        QueueTimeOutURL: queueTimeoutUrl,
        Remarks: 'Reversal via pesafy CLI',
        Occasion: '',
      },
    )) as Record<string, string>

    if (result['ResponseCode'] === '0') {
      console.log(
        `\n${g('✔  Reversal submitted!')} Result will be POSTed to:\n  ${c(resultUrl)}\n`,
      )
    } else {
      console.log(r('✖  Reversal failed:'))
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (e) {
    console.error(r(`✖  ${(e as Error).message}`))
    process.exit(1)
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

async function main() {
  const [, , command = 'help', ...args] = process.argv

  const banner = `${C.cyan}${C.bold}  pesafy${C.reset} ${C.dim}v${getPkgVersion()}${C.reset}`
  process.stdout.write(`\n${banner}\n`)

  const cmds: Record<string, () => Promise<void>> = {
    init: cmdInit,
    doctor: cmdDoctor,
    token: cmdToken,
    encrypt: () => cmdEncrypt(args),
    'validate-phone': () => cmdValidatePhone(args),
    'stk-push': () => cmdStkPush(args),
    'stk-query': () => cmdStkQuery(args),
    balance: () => cmdBalance(args),
    'register-c2b-urls': () => cmdRegisterC2BUrls(args),
    'simulate-c2b': () => cmdSimulateC2B(args),
    reversal: () => cmdReversal(args),
    version: cmdVersion,
    help: cmdHelp,
    '--help': cmdHelp,
    '-h': cmdHelp,
    '--version': cmdVersion,
    '-v': cmdVersion,
  }

  const handler = cmds[command]
  if (!handler) {
    console.error(r(`✖  Unknown command: "${command}"`))
    console.error(dim('  Run: npx pesafy help'))
    process.exit(1)
  }

  try {
    await handler()
  } catch (e) {
    console.error(r(`\n✖  Unhandled error: ${(e as Error).message}\n`))
    if (process.env['PESAFY_DEBUG']) console.error(e)
    process.exit(1)
  }
}

void main()
