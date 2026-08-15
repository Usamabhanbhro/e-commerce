import { SignJWT, jwtVerify } from "jose";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { appEnvironment, isProductionLike } from "./env";
import { unauthorized } from "./security";

const cookieName = "ub_session";
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || (appEnvironment === "development" || appEnvironment === "test" ? "development-only-session-secret-change-me" : ""));

export type SessionUser = { id: string; email?: string; name?: string; owner?: boolean };

export async function createSession(user: SessionUser): Promise<string> {
  if (isProductionLike && secret().length < 32) throw new Error("Session secret is not configured.");
  return new SignJWT({ ...user }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function readSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token || (isProductionLike && !process.env.JWT_SECRET)) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.id !== "string") return null;
    return { id: payload.id, email: typeof payload.email === "string" ? payload.email : undefined, name: typeof payload.name === "string" ? payload.name : undefined, owner: payload.owner === true };
  } catch {
    return null;
  }
}

export async function setSession(res: Response, user: SessionUser) {
  const token = await createSession(user);
  res.cookie(cookieName, token, { httpOnly: true, sameSite: isProductionLike ? "none" : "lax", secure: isProductionLike, path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearSession(res: Response) {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: isProductionLike ? "none" : "lax", secure: isProductionLike, path: "/" });
}

export const optionalSession: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[cookieName] as string | undefined;
  res.locals.user = await readSession(token);
  next();
};

export const requireSession: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[cookieName] as string | undefined;
  const user = await readSession(token);
  if (!user) return unauthorized(res, "Please login.");
  res.locals.user = user;
  next();
};

export function currentUser(req: Request): SessionUser | null { return (req.res?.locals.user as SessionUser | null | undefined) ?? null; }

export function oauthError(res: Response, reason = "OAuth sign-in could not be completed.") {
  clearSession(res);
  return res.status(400).json({ error: { code: "OAUTH_FAILED", message: reason === "oauth_error" ? "Sign-in could not be completed." : "OAuth sign-in could not be completed." } });
}
