import { and, eq, gt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { adminsTable, db, sessionsTable } from "@workspace/db";
import { hashToken } from "./passwords";

export const SESSION_COOKIE = "pf_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS,
  };
}

export async function getAccessState(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== "string") {
    return { authenticated: false, isAdmin: false, userId: null, email: null };
  }

  const [session] = await db
    .select({
      adminId: adminsTable.id,
      email: adminsTable.email,
      role: adminsTable.role,
      expiresAt: sessionsTable.expiresAt,
    })
    .from(sessionsTable)
    .innerJoin(adminsTable, eq(sessionsTable.adminId, adminsTable.id))
    .where(
      and(eq(sessionsTable.tokenHash, hashToken(token)), gt(sessionsTable.expiresAt, new Date())),
    )
    .limit(1);

  if (!session) {
    return { authenticated: false, isAdmin: false, userId: null, email: null };
  }

  return {
    authenticated: true,
    isAdmin: session.role === "admin",
    userId: String(session.adminId),
    email: session.email,
  };
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const access = await getAccessState(req);
    if (!access.authenticated) {
      res.status(401).json({ error: "Sign in to continue." });
      return;
    }
    if (!access.isAdmin) {
      res.status(403).json({ error: "This account does not have administrator access." });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Unable to verify administrator access");
    res.status(503).json({ error: "Administrator access could not be verified." });
  }
}
