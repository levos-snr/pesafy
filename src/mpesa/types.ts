export type Environment = "sandbox" | "production";

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  environment: Environment;
}
