/**
 * Pesafy Dashboard - Payment monitoring and webhook management
 * Built with Bun.serve() and HTML imports
 */

import indexHtml from "./index.html";

interface DashboardConfig {
  port?: number;
  mpesaConfig?: {
    consumerKey: string;
    consumerSecret: string;
    environment: "sandbox" | "production";
  };
}

const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;

export function startDashboard(config: DashboardConfig = {}) {
  const requestedPort =
    config.port ?? (process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT);

  const routes = {
    "/": indexHtml,
    "/api/payments": {
      GET: async () => {
        return Response.json({ payments: [] });
      },
    },
    "/api/webhooks": {
      GET: async () => Response.json({ webhooks: [] }),
      POST: async (req: Request) => {
        const body = await req.json();
        return Response.json({ success: true, webhook: body });
      },
    },
  };

  for (let i = 0; i < MAX_PORT_ATTEMPTS; i++) {
    const port = requestedPort + i;
    try {
      Bun.serve({
        port,
        routes,
        development: { hmr: true, console: true },
      });
      console.log(`🚀 Pesafy Dashboard running on http://localhost:${port}`);
      return;
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : "";
      if (code === "EADDRINUSE" && i < MAX_PORT_ATTEMPTS - 1) {
        continue;
      }
      throw err;
    }
  }
}

// Run when executed directly
startDashboard();
