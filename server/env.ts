import "dotenv/config";

export type AppEnvironment = "development" | "test" | "staging" | "production";

const asEnvironment = (value: string | undefined): AppEnvironment => {
  if (value === "production" || value === "staging" || value === "test") return value;
  return "development";
};

export const appEnvironment = asEnvironment(process.env.APP_ENV ?? process.env.NODE_ENV);
export const isProductionLike = appEnvironment === "staging" || appEnvironment === "production" || process.env.NODE_ENV === "production";
export const paymentMode = process.env.PAYMENT_MODE === "sandbox" || process.env.PAYMENT_MODE === "production" ? process.env.PAYMENT_MODE : "mock";
export const port = Number(process.env.PORT ?? 3000);

const requiredInProduction = ["DATABASE_URL", "JWT_SECRET", "PAYMENT_WEBHOOK_SECRET", "FRONTEND_ORIGIN"] as const;
const requiredStorageInProduction = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export function validateEnvironment(): void {
  if (!isProductionLike) return;
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  const missingStorage = requiredStorageInProduction.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  if (missingStorage.length) throw new Error(`Missing required staging/production storage configuration: ${missingStorage.join(", ")}`);
  if ((process.env.JWT_SECRET ?? "").length < 32) throw new Error("JWT_SECRET must be at least 32 characters in production-like environments.");
  if ((process.env.PAYMENT_WEBHOOK_SECRET ?? "").length < 32) throw new Error("PAYMENT_WEBHOOK_SECRET must be at least 32 characters in production-like environments.");
  if (paymentMode === "production" && process.env.PAYMENT_PROVIDER_ADAPTER !== "official") {
    throw new Error("PAYMENT_MODE=production requires PAYMENT_PROVIDER_ADAPTER=official.");
  }
  if (process.env.APP_ENV === "staging" && process.env.ALLOW_DEMO_LOGIN === "true") {
    throw new Error("ALLOW_DEMO_LOGIN must remain disabled in staging.");
  }
}

export function environmentSummary() {
  return { appEnvironment, isProductionLike, paymentMode, hasDatabase: Boolean(process.env.DATABASE_URL), hasOAuth: Boolean(process.env.OAUTH_SERVER_URL), hasPaymentAdapter: process.env.PAYMENT_PROVIDER_ADAPTER === "official" };
}
