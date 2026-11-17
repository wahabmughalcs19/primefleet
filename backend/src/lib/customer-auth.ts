import { and, eq, gt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { customerSessionsTable, customersTable, db } from "@workspace/db";
import { hashToken } from "./passwords";
import { sessionCookieOptions } from "./prime-fleet-auth";

export const CUSTOMER_COOKIE = "pf_customer";

export async function getCustomer(req: Request) {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token || typeof token !== "string") return null;

  const [row] = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      email: customersTable.email,
      phone: customersTable.phone,
      companyId: customersTable.companyId,
    })
    .from(customerSessionsTable)
    .innerJoin(customersTable, eq(customerSessionsTable.customerId, customersTable.id))
    .where(
      and(
        eq(customerSessionsTable.tokenHash, hashToken(token)),
        gt(customerSessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await getCustomer(req);
    if (!customer) {
      res.status(401).json({ error: "Sign in to see your jobs." });
      return;
    }
    res.locals.customer = customer;
    next();
  } catch (error) {
    req.log.error({ err: error }, "Unable to verify customer");
    res.status(503).json({ error: "Your account could not be checked." });
  }
}

export function customerCookieOptions() {
  return sessionCookieOptions();
}
