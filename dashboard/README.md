# Pesafy Dashboard

A modern, production-ready dashboard for managing M-Pesa payments, webhooks, and monitoring transactions. Built with React, Vite, Convex, and Better Auth.

## Features

- 🔐 **Authentication**: Secure login/signup with Better Auth
- 💳 **Payment Management**: Initiate and monitor STK Push, B2C, B2B payments
- 🔔 **Webhook Management**: Configure and monitor webhook endpoints
- 📊 **Analytics**: Real-time dashboard with transaction statistics
- 🎨 **Component Showcase**: Preview and test Pesafy React components
- ⚙️ **Settings**: Manage business credentials and configuration

## Prerequisites

- Node.js 18+ or Bun 1.0+
- Convex account (sign up at [convex.dev](https://convex.dev))

## Setup

1. **Install dependencies:**

```bash
cd dashboard
bun install
```

2. **Set up Convex:**

```bash
# From the project root
npx convex dev
```

This will:

- Create a Convex project (if not already created)
- Generate `convex/_generated` files
- Set up environment variables

3. **Configure environment variables:**

Create a `.env` file in the `dashboard/` directory:

```env
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_CONVEX_SITE_URL=https://your-project.convex.site
VITE_SITE_URL=http://localhost:5173
```

Set Convex environment variables:

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL=http://localhost:5173
```

4. **Start the development server:**

```bash
bun run dev
```

The dashboard will be available at `http://localhost:5173`.

## Building for Production

```bash
bun run build
```

The built files will be in `dist/` and can be deployed to any static hosting service (Vercel, Netlify, etc.).

## Project Structure

```
dashboard/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── Layout.tsx   # Main layout with sidebar
│   │   └── ui/          # shadcn-style UI components
│   ├── pages/           # Page components
│   │   ├── HomePage.tsx
│   │   ├── PaymentsPage.tsx
│   │   ├── WebhooksPage.tsx
│   │   ├── ComponentsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── AccountPage.tsx
│   ├── lib/             # Utilities and auth client
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── convex/              # Convex backend (shared with root)
└── package.json
```

## Authentication

The dashboard uses Better Auth with Convex for authentication. Users can:

- Sign up with email/password
- Sign in with existing credentials
- Manage their account settings

## Database Schema

The dashboard uses Convex for data storage:

- **businesses**: User businesses/organizations
- **credentials**: Encrypted M-Pesa API credentials
- **transactions**: Payment transaction history
- **webhooks**: Webhook configurations
- **webhookDeliveries**: Webhook delivery logs

See `convex/schema.ts` for the complete schema definition.

## Deployment

### Deploy Convex Backend

```bash
npx convex deploy
```

### Deploy Dashboard Frontend

The dashboard is a static Vite app. Deploy the `dist/` folder to:

- **Vercel**: `vercel --prod`
- **Netlify**: Drag and drop `dist/` folder
- **Cloudflare Pages**: Connect your repo and set build command to `bun run build`

Remember to update `VITE_SITE_URL` and Convex `SITE_URL` environment variables to your production URL.

## Development

- **Convex Dev**: `npx convex dev` (from project root)
- **Dashboard Dev**: `bun run dev` (from dashboard directory)
- **Type Checking**: `bun run typecheck`

## Troubleshooting

### Convex not connecting

- Ensure `VITE_CONVEX_URL` matches your Convex deployment URL
- Check that `npx convex dev` is running

### Authentication not working

- Verify `BETTER_AUTH_SECRET` is set in Convex environment
- Ensure `SITE_URL` matches your local/production URL
- Check browser console for CORS errors

### Components not loading

- Ensure `pesafy` package is installed: `bun add pesafy`
- Check that component styles are imported: `import "pesafy/components/react/styles.css"`

## License

MIT
