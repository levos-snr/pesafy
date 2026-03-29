# Contributing to pesafy

Thank you for your interest in contributing! This guide will get you up and running.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting Changes](#submitting-changes)
- [Commit Convention](#commit-convention)
- [Versioning & Releases](#versioning--releases)
- [Project Structure](#project-structure)

---

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We expect all contributors to abide by it.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 10 — install via `npm i -g pnpm`
- A [Safaricom Daraja](https://developer.safaricom.co.ke) sandbox account for integration testing

### Setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/pesafy.git
cd pesafy

# 2. Install dependencies
pnpm install

# 3. Build the library
pnpm build

# 4. Run tests
pnpm test

# 5. Type check
pnpm typecheck
```

---

## Development Workflow

```bash
pnpm build          # Full build (all entries)
pnpm build:watch    # Watch mode
pnpm test           # Run tests
pnpm test:watch     # Watch mode tests
pnpm lint           # Lint with oxlint
pnpm lint:fix       # Lint and auto-fix
pnpm format         # Format with prettier
pnpm typecheck      # tsc --noEmit
pnpm check          # Lint + format check combined
```

### Adding a new feature

1. Create a branch: `git checkout -b feat/my-feature`
2. Make your changes in `src/`
3. Add/update tests in `src/**/*.test.ts`
4. Run `pnpm test` and `pnpm typecheck`
5. Add a changeset (see below)
6. Open a Pull Request

---

## Submitting Changes

- **Bug fixes** → target `main`
- **New features** → target `main`
- **Breaking changes** → must include migration notes in the changeset

### Pull Request checklist

- [ ] Tests pass (`pnpm test`)
- [ ] Types check (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] A changeset has been added (`pnpm changeset`)
- [ ] The PR description explains _what_ and _why_

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add B2B bulk payment support
fix: correct phone number normalisation for Telkom numbers
docs: update STK Push callback examples
chore: bump vite-plus to 0.2.0
test: add coverage for reversal edge cases
```

---

## Versioning & Releases

We use [Changesets](https://github.com/changesets/changesets) for versioning.

### Adding a changeset

After making changes, run:

```bash
pnpm changeset
```

Follow the prompts to:

1. Select the packages affected (just `pesafy` for this mono-package)
2. Choose the bump type: `patch` | `minor` | `major`
3. Write a short description of your change

Commit the generated `.changeset/*.md` file alongside your code changes.

### Release process (maintainers only)

Releases are automated via the GitHub Actions `publish.yml` workflow. On every push to `main`, the workflow either:

- Opens a **Version Packages** PR (if there are pending changesets), or
- Publishes to npm automatically (when the Version Packages PR is merged)

---

## Project Structure

```
pesafy/
├── src/
│   ├── adapters/        # Framework adapters (Hono, Next.js, Fastify)
│   ├── cli/             # npx pesafy CLI
│   ├── components/      # React + Vue UI components
│   ├── core/            # Shared internals (encryption, HTTP)
│   ├── express/         # Express adapter
│   ├── mpesa/           # All Daraja API modules
│   │   ├── stk-push.ts
│   │   ├── c2b.ts
│   │   ├── b2c.ts
│   │   ├── b2b-express-checkout.ts
│   │   ├── account-balance.ts
│   │   ├── reversal.ts
│   │   ├── tax-remittance.ts
│   │   ├── transaction-status.ts
│   │   ├── dynamic-qr.ts
│   │   ├── bill-manager.ts
│   │   └── webhooks.ts
│   ├── types/           # Branded types and Result type
│   ├── utils/           # Shared utilities (phone, errors, http)
│   └── index.ts         # Public API surface
├── .changeset/          # Pending release changesets
├── .github/
│   ├── workflows/
│   │   ├── ci.yml       # PR checks
│   │   └── publish.yml  # npm release
│   └── ISSUE_TEMPLATE/
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Reporting Issues

- **Bug reports** — use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) template
- **Feature requests** — use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) template
- **Security vulnerabilities** — see [SECURITY.md](SECURITY.md) — **do not open a public issue**
