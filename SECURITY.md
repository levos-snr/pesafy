# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.5.x   | ✅        |
| < 0.5   | ❌        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in pesafy, please report it by emailing:

📧 **lewisodero27@gmail.com**

Include as much of the following as possible:

- Type of issue (e.g., credential leak, prototype pollution, injection)
- Full paths of source files related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

You will receive a response within **48 hours**. If the issue is confirmed, a patch will be released as soon as possible depending on severity.

## Scope

The following are **in scope**:

- The `pesafy` npm package source code
- Framework adapters (Express, Hono, Next.js, Fastify)
- The CLI (`npx pesafy`)

The following are **out of scope**:

- The Safaricom Daraja API itself — report those to [Safaricom](https://developer.safaricom.co.ke)
- Your own application code that _uses_ pesafy

## Disclosure Policy

We follow [Responsible Disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). Once a fix is available, we will publish a GitHub Security Advisory and credit the reporter (unless anonymity is requested).
