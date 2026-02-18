import type { MpesaConfig } from "./types";

export class Mpesa {
  private config: MpesaConfig;

  constructor(config: MpesaConfig) {
    this.config = config;
    console.log(`[Pesafy] Mpesa initialized in ${config.environment} mode`);
  }

  // STK Push coming soon
  async stkPush() {
    console.log("[Pesafy] stkPush() - not yet implemented");
  }

  // B2C coming soon
  async b2c() {
    console.log("[Pesafy] b2c() - not yet implemented");
  }
}
