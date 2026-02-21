# Pesafy Setup Guide

This guide will help you set up both the Pesafy library and dashboard.

## Library Setup

The Pesafy library is ready to use. Install it via npm, bun, or any package manager:

```bash
npm install pesafy
# or
bun add pesafy
```

See [README.md](./README.md) and [docs/guides/getting-started.md](./docs/guides/getting-started.md) for usage.

## Dashboard Setup

The dashboard requires Convex and Better Auth setup.

### 1. Install Dependencies

```bash
# Root dependencies (for Convex)
bun install

# Dashboard dependencies
cd dashboard
bun install
```

### 2. Set Up Convex

From the project root:

```bash
npx convex dev
```

This will:

- Create a Convex project (if not already created)
- Generate `convex/_generated` files
- Start the Convex dev server

### 3. Install Pesafy in Convex

Since Convex actions use the Pesafy library, you need to ensure it's available:

```bash
# From project root
cd convex
bun add ../pesafy
# or if using npm workspace
npm install pesafy
```

Alternatively, if using a monorepo setup, ensure `pesafy` is installed in the Convex project's `package.json`.

### 4. Configure Environment Variables

**Convex Environment Variables** (set via `npx convex env set`):

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL=http://localhost:5173
```

**Dashboard Environment Variables** (create `dashboard/.env`):

```env
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CONVEX_SITE_URL=https://your-project.convex.site
VITE_SITE_URL=http://localhost:5173
```

Get the Convex URLs from the `npx convex dev` output.

### 5. Start Development Servers

**Terminal 1 - Convex:**

```bash
npx convex dev
```

**Terminal 2 - Dashboard:**

```bash
cd dashboard
bun run dev
```

The dashboard will be available at `http://localhost:5173`.

### 6. First Time Setup

1. Sign up for an account in the dashboard
2. Create a business in Settings
3. Add your M-Pesa API credentials
4. Start making payments!

## Troubleshooting

### Convex can't find Pesafy

If Convex actions fail with "Cannot find module 'pesafy'", ensure:

1. Pesafy is installed in the Convex project: `cd convex && bun add ../pesafy`
2. Or use a workspace setup in the root `package.json`

### Authentication not working

- Verify `BETTER_AUTH_SECRET` is set in Convex
- Ensure `SITE_URL` matches your local URL
- Check browser console for errors

### Components not loading

- Ensure `pesafy` is installed in dashboard: `cd dashboard && bun add pesafy`
- Import styles: `import "pesafy/components/react/styles.css"`

## Production Deployment

### Deploy Convex

```bash
npx convex deploy
```

Update `SITE_URL` to your production URL:

```bash
npx convex env set SITE_URL=https://your-production-url.com
```

### Deploy Dashboard

Build the dashboard:

```bash
cd dashboard
bun run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

Update `VITE_SITE_URL` in your deployment environment variables.

## Architecture

- **Library**: `src/` - NPM package, can be used independently
- **Dashboard Frontend**: `dashboard/src/` - Vite + React app
- **Dashboard Backend**: `convex/` - Convex functions, schema, HTTP routes
- **Components**: `src/components/` - React/Vue components exported from library

All data is stored in Convex. The dashboard frontend connects to Convex via the Convex React client.
