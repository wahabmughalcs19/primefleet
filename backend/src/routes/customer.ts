import { Router, type IRouter } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import {
  companiesTable,
  contactInquiriesTable,
  db,
  maintenanceRequestsTable,
  quotationsTable,
  vehiclesTable,
} from "@workspace/db";
import { requireCustomer } from "../lib/customer-auth";

const router: IRouter = Router();
router.use(requireCustomer);

router.get("/overview", async (_req, res): Promise<void> => {
  const customer = res.locals.customer as {
    id: number;
    name: string;
    email: string;
    phone: string;
    companyId: number | null;
  };

  const requests = customer.companyId
    ? await db
        .select({
          id: maintenanceRequestsTable.id,
          registrationNumber: vehiclesTable.registrationNumber,
          model: vehiclesTable.model,
          issueDescription: maintenanceRequestsTable.issueDescription,
          status: maintenanceRequestsTable.status,
          createdAt: maintenanceRequestsTable.createdAt,
          updatedAt: maintenanceRequestsTable.updatedAt,
        })
        .from(maintenanceRequestsTable)
        .innerJoin(vehiclesTable, eq(maintenanceRequestsTable.vehicleId, vehiclesTable.id))
        .where(eq(maintenanceRequestsTable.companyId, customer.companyId))
        .orderBy(desc(maintenanceRequestsTable.createdAt))
        .limit(100)
    : [];

  const requestIds = requests.map((row) => row.id);
  const quotes = requestIds.length
    ? await db
        .select({
          requestId: quotationsTable.requestId,
          status: quotationsTable.status,
          notes: quotationsTable.notes,
        })
        .from(quotationsTable)
        .where(inArray(quotationsTable.requestId, requestIds))
    : [];
  const quoteByRequest = new Map(quotes.map((quote) => [quote.requestId, quote]));

  const inquiries = await db
    .select({
      id: contactInquiriesTable.id,
      subject: contactInquiriesTable.subject,
      message: contactInquiriesTable.message,
      status: contactInquiriesTable.status,
      createdAt: contactInquiriesTable.createdAt,
    })
    .from(contactInquiriesTable)
    .where(sql`lower(${contactInquiriesTable.email}) = ${customer.email}`)
    .orderBy(desc(contactInquiriesTable.createdAt))
    .limit(100);

  const [company] = customer.companyId
    ? await db
        .select({ name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, customer.companyId))
        .limit(1)
    : [];

  res.json({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    companyName: company?.name ?? "",
    requests: requests.map((row) => ({
      ...row,
      quotationStatus: quoteByRequest.get(row.id)?.status ?? null,
      quotationNotes: quoteByRequest.get(row.id)?.notes ?? "",
    })),
    inquiries,
  });
});

export default router;
