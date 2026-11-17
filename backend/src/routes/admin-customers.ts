import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { companiesTable, customerSessionsTable, customersTable, db } from "@workspace/db";
import { hashPassword } from "../lib/passwords";

const router: IRouter = Router();

router.get("/customers", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      email: customersTable.email,
      phone: customersTable.phone,
      companyId: customersTable.companyId,
      companyName: companiesTable.name,
      createdAt: customersTable.createdAt,
    })
    .from(customersTable)
    .leftJoin(companiesTable, eq(customersTable.companyId, companiesTable.id))
    .orderBy(desc(customersTable.createdAt));
  res.json(rows);
});

router.post("/customers", async (req, res): Promise<void> => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const phone = String(req.body?.phone ?? "").trim();
  const companyId = Number(req.body?.companyId) || null;
  if (!name || !email || password.length < 6) {
    res.status(400).json({ error: "Name, email, and a password of at least 6 characters are required." });
    return;
  }
  if (companyId) {
    const [company] = await db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
    if (!company) {
      res.status(400).json({ error: "Choose a company that already exists." });
      return;
    }
  }
  try {
    const [created] = await db
      .insert(customersTable)
      .values({ name, email, passwordHash: hashPassword(password), phone, companyId })
      .returning({ id: customersTable.id, name: customersTable.name, email: customersTable.email });
    res.status(201).json(created);
  } catch {
    res.status(409).json({ error: "A customer with this email already exists." });
  }
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Customer not found." });
    return;
  }
  const patch: { name?: string; phone?: string; companyId?: number | null; passwordHash?: string } = {};
  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim();
  if (req.body?.phone !== undefined) patch.phone = String(req.body.phone).trim();
  if (req.body?.companyId !== undefined) patch.companyId = Number(req.body.companyId) || null;
  if (req.body?.password) {
    const password = String(req.body.password);
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }
    patch.passwordHash = hashPassword(password);
  }
  const [updated] = await db.update(customersTable).set(patch).where(eq(customersTable.id, id)).returning({ id: customersTable.id });
  if (!updated) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  res.json({ id });
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(customerSessionsTable).where(eq(customerSessionsTable.customerId, id));
  const [deleted] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning({ id: customersTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  res.json({ id });
});

export default router;
