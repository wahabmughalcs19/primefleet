import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { adminsTable, customerSessionsTable, customersTable, db, sessionsTable } from "@workspace/db";
import { hashToken, newSessionToken, verifyPassword } from "../lib/passwords";
import { CUSTOMER_COOKIE, customerCookieOptions } from "../lib/customer-auth";
import { SESSION_COOKIE, sessionCookieOptions } from "../lib/prime-fleet-auth";

const router: IRouter = Router();

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait and try again." },
});

router.post("/auth/login", loginLimit, async (req, res): Promise<void> => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.email, email))
    .limit(1);

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    res.status(401).json({ error: "Those sign-in details are not correct." });
    return;
  }

  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + sessionCookieOptions().maxAge);
  await db.insert(sessionsTable).values({
    adminId: admin.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  res.json({ authenticated: true, isAdmin: admin.role === "admin", email: admin.email });
});

router.post("/auth/customer/login", loginLimit, async (req, res): Promise<void> => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.email, email)).limit(1);
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    res.status(401).json({ error: "Those sign-in details are not correct." });
    return;
  }
  const token = newSessionToken();
  await db.insert(customerSessionsTable).values({
    customerId: customer.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + customerCookieOptions().maxAge),
  });
  res.cookie(CUSTOMER_COOKIE, token, customerCookieOptions());
  res.json({ name: customer.name, email: customer.email });
});

router.post("/auth/customer/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (typeof token === "string" && token) {
    await db.delete(customerSessionsTable).where(eq(customerSessionsTable.tokenHash, hashToken(token)));
  }
  res.clearCookie(CUSTOMER_COOKIE, { path: "/" });
  res.json({ authenticated: false });
});

router.get("/auth/customer/me", async (req, res): Promise<void> => {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (typeof token !== "string" || !token) {
    res.json({ authenticated: false });
    return;
  }
  const [row] = await db
    .select({ name: customersTable.name, email: customersTable.email })
    .from(customerSessionsTable)
    .innerJoin(customersTable, eq(customerSessionsTable.customerId, customersTable.id))
    .where(eq(customerSessionsTable.tokenHash, hashToken(token)))
    .limit(1);
  res.json(row ? { authenticated: true, name: row.name, email: row.email } : { authenticated: false });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token)));
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ authenticated: false });
});

export default router;
