import crypto from "node:crypto";
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const supplied = req.header("x-request-id");
  const id = supplied && /^[A-Za-z0-9._-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
  res.setHeader("X-Request-Id", id);
  res.locals.requestId = id;
  next();
};

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "staging" || process.env.APP_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
};

const origins = () => new Set((process.env.ALLOWED_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? "").split(",").map((value) => value.trim()).filter(Boolean));
export const corsAllowlist: RequestHandler = (req, res, next) => {
  const origin = req.header("origin");
  if (origin && origins().has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Request-Id, X-Idempotency-Key, X-Webhook-Signature");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(origin && origins().has(origin) ? 204 : 403).end();
  next();
};

const buckets = new Map<string, { count: number; resetAt: number }>();
export function scopedRateLimit(windowMs = 60_000, max = 120): RequestHandler {
  return (req, res, next) => {
    const key = `${req.ip ?? "unknown"}:${req.path.split("/").slice(0, 3).join("/")}`;
    const now = Date.now();
    const current = buckets.get(key);
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count += 1;
    buckets.set(key, entry);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    if (entry.count > max) return res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests.", requestId: res.locals.requestId } });
    next();
  };
}

export function verifyHmac(payload: string | Buffer, signature: string | undefined, secret = process.env.PAYMENT_WEBHOOK_SECRET): boolean {
  if (!secret || !signature) return false;
  const normalized = signature.replace(/^sha256=/, "");
  if (!/^[a-f0-9]{64}$/i.test(normalized)) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(normalized, "hex"));
}

export function validStorageKey(key: string): boolean {
  return key.length > 0 && key.length <= 512 && !key.includes("..") && !key.startsWith("/") && /^[A-Za-z0-9_./-]+$/.test(key);
}

export const sanitizedErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const message = process.env.NODE_ENV === "production" || process.env.APP_ENV === "staging" || process.env.APP_ENV === "production" ? "Request failed." : error instanceof Error ? error.message : "Request failed.";
  res.status(Number((error as { status?: number })?.status) || 500).json({ error: { code: "INTERNAL_ERROR", message, requestId: res.locals.requestId } });
};

export function unauthorized(res: Response, message = "Authentication required.") {
  return res.status(401).json({ error: { code: "UNAUTHORIZED", message, requestId: res.locals.requestId } });
}

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: { code: "BAD_REQUEST", message, requestId: res.locals.requestId } });
}
