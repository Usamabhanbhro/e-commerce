import "./env";
import express, { type Request } from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateEnvironment, environmentSummary, port } from "./env";
import { pingDatabase, closeDatabase } from "./db";
import { badRequest, corsAllowlist, requestId, sanitizedErrors, scopedRateLimit, securityHeaders, unauthorized, validStorageKey, verifyHmac } from "./security";
import { clearSession, currentUser, oauthError, optionalSession, requireSession, setSession } from "./auth";
import { CommerceService } from "./commerce";
import type { DemoOutcome, PaymentMethod, PaymentStatus } from "./paymentProviders";
import { products, collections, journals } from "../client/src/lib/catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(requestId);
app.use(securityHeaders);
app.use(corsAllowlist);
app.use((req, _res, next) => {
  const cookies: Record<string, string> = {};
  for (const part of (req.headers.cookie ?? "").split(";")) { const [key, ...rest] = part.trim().split("="); if (key) cookies[key] = decodeURIComponent(rest.join("=")); }
  (req as Request & { cookies: Record<string, string> }).cookies = cookies;
  next();
});
app.use((req, _res, next) => { if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path.startsWith("/storage/")) return scopedRateLimit(60_000, 120)(req, _res, next); next(); });
app.use(express.json({ limit: "64kb", verify: (req, _res, buffer) => { (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer); } }));

app.get("/health", (_req, res) => res.status(200).json({ status: "ok", environment: environmentSummary(), timestamp: new Date().toISOString() }));
app.get("/ready", async (_req, res) => { try { const database = process.env.DATABASE_URL ? await pingDatabase() : false; if (!database && (process.env.APP_ENV === "staging" || process.env.APP_ENV === "production")) return res.status(503).json({ status: "not_ready", database: false }); return res.status(200).json({ status: "ready", database }); } catch { return res.status(503).json({ status: "not_ready", database: false }); } });

app.get("/api/catalog", (_req, res) => res.json({ products, collections, journals }));
app.get("/api/auth/me", optionalSession, (req, res) => res.json({ user: currentUser(req) }));
app.post("/api/auth/logout", (req, res) => { clearSession(res); res.json({ ok: true }); });
app.get("/api/oauth/callback", (req, res) => oauthError(res, typeof req.query.error === "string" ? req.query.error : "oauth_error"));
app.get("/api/account", requireSession, (req, res) => res.json({ user: currentUser(req) }));

app.post("/api/orders", requireSession, async (req, res, next) => { try { const user = currentUser(req); if (!user) return unauthorized(res); const { email, lines, address } = req.body ?? {}; if (typeof email !== "string" || !Array.isArray(lines) || !address) return badRequest(res, "A valid email, cart lines, and shipping address are required."); const order = await CommerceService.createOrder(user.id, email, lines, address); return res.status(201).json(order); } catch (error) { return next(error); } });
app.get("/api/orders/:orderId", requireSession, async (req, res, next) => { try { const user = currentUser(req); if (!user) return unauthorized(res); const order = await CommerceService.getOrder(user.id, String(req.params.orderId)); if (!order) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Order was not found." } }); return res.json(order); } catch (error) { return next(error); } });
app.post("/api/payments", requireSession, async (req, res, next) => { try { const user = currentUser(req); if (!user) return unauthorized(res); const key = req.header("x-idempotency-key") ?? req.body?.idempotencyKey; const { orderId, method, demoOutcome } = req.body ?? {}; if (typeof orderId !== "string" || typeof method !== "string" || !key) return badRequest(res, "orderId, method, and X-Idempotency-Key are required."); const payment = await CommerceService.createPayment(user.id, orderId, method as PaymentMethod, key, demoOutcome as DemoOutcome | undefined); return res.status(201).json(payment); } catch (error) { return next(error); } });
app.post("/api/webhooks/payment", async (req, res, next) => { try { const raw = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {})); if (!verifyHmac(raw, req.header("x-webhook-signature") ?? req.header("x-payment-signature"))) return res.status(401).json({ error: { code: "INVALID_WEBHOOK_SIGNATURE", message: "Webhook signature could not be verified." } }); const { eventId, orderId, referenceId, provider, status, amountPkr } = req.body ?? {}; if (!["pending", "initiated", "successful", "failed", "cancelled"].includes(status)) return badRequest(res, "Invalid payment status."); const result = await CommerceService.processWebhook({ eventId, orderId, referenceId, provider, status: status as PaymentStatus, amountPkr }); return res.json(result); } catch (error) { return next(error); } });

app.get("/storage/{*key}", (req, res) => { const key = String(req.params.key ?? ""); if (!validStorageKey(key)) return badRequest(res, "Invalid storage key."); return res.status(404).json({ error: { code: "STORAGE_NOT_FOUND", message: "Storage object was not found." } }); });

const staticPath = process.env.NODE_ENV === "production" ? path.resolve(__dirname, "public") : path.resolve(process.cwd(), "dist", "public");
app.use(express.static(staticPath, { index: "index.html", maxAge: process.env.APP_ENV === "production" ? "1d" : 0 }));
app.use((req, res, next) => { if (req.method === "GET" && req.get("accept")?.includes("text/html") && !req.path.startsWith("/api/") && !req.path.startsWith("/storage/")) return res.sendFile(path.join(staticPath, "index.html")); next(); });
app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } }));
app.use(sanitizedErrors);

export async function startServer() {
  validateEnvironment();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(port, () => { console.log(JSON.stringify({ event: "server_started", port, environment: environmentSummary() })); resolve(); }));
  const close = async () => { await new Promise<void>((resolve) => server.close(() => resolve())); await closeDatabase(); };
  process.once("SIGTERM", () => void close().finally(() => process.exit(0)));
  process.once("SIGINT", () => void close().finally(() => process.exit(0)));
  return { server, close };
}

if (process.env.VITEST !== "true") startServer().catch((error) => { console.error(JSON.stringify({ event: "server_start_failed", message: error instanceof Error ? error.message : "unknown" })); process.exit(1); });
