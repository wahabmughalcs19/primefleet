import { Router, type IRouter } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  like,
  inArray,
  or,
} from "drizzle-orm";
import {
  CreateMaintenanceRequestBody,
  CreateMaintenanceRequestResponse,
  CreateQuotationBody,
  CreateQuotationResponse,
  GetDashboardSummaryResponse,
  ListContactInquiriesResponse,
  ListMaintenanceRequestsQueryParams,
  ListMaintenanceRequestsResponse,
  ListQuotationsResponse,
  UpdateContactInquiryBody,
  UpdateContactInquiryParams,
  UpdateContactInquiryResponse,
  UpdateMaintenanceRequestBody,
  UpdateMaintenanceRequestParams,
  UpdateMaintenanceRequestResponse,
  UpdateQuotationBody,
  UpdateQuotationParams,
  UpdateQuotationResponse,
} from "@workspace/api-zod";
import {
  companiesTable,
  contactInquiriesTable,
  db,
  maintenanceRequestsTable,
  quotationItemsTable,
  quotationsTable,
  vehiclesTable,
} from "@workspace/db";

const router: IRouter = Router();

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function maintenanceSelect() {
  return db
    .select({
      id: maintenanceRequestsTable.id,
      companyId: maintenanceRequestsTable.companyId,
      companyName: companiesTable.name,
      vehicleId: maintenanceRequestsTable.vehicleId,
      registrationNumber: vehiclesTable.registrationNumber,
      issueDescription: maintenanceRequestsTable.issueDescription,
      status: maintenanceRequestsTable.status,
      createdAt: maintenanceRequestsTable.createdAt,
    })
    .from(maintenanceRequestsTable)
    .innerJoin(
      companiesTable,
      eq(maintenanceRequestsTable.companyId, companiesTable.id),
    )
    .innerJoin(
      vehiclesTable,
      eq(maintenanceRequestsTable.vehicleId, vehiclesTable.id),
    );
}

async function getQuotation(id: number) {
  const [quotation] = await db
    .select({
      id: quotationsTable.id,
      requestId: quotationsTable.requestId,
      companyName: companiesTable.name,
      registrationNumber: vehiclesTable.registrationNumber,
      status: quotationsTable.status,
      notes: quotationsTable.notes,
      createdAt: quotationsTable.createdAt,
    })
    .from(quotationsTable)
    .innerJoin(
      maintenanceRequestsTable,
      eq(quotationsTable.requestId, maintenanceRequestsTable.id),
    )
    .innerJoin(
      companiesTable,
      eq(maintenanceRequestsTable.companyId, companiesTable.id),
    )
    .innerJoin(
      vehiclesTable,
      eq(maintenanceRequestsTable.vehicleId, vehiclesTable.id),
    )
    .where(eq(quotationsTable.id, id))
    .limit(1);
  if (!quotation) return undefined;
  const items = await db
    .select()
    .from(quotationItemsTable)
    .where(eq(quotationItemsTable.quotationId, id))
    .orderBy(asc(quotationItemsTable.id));
  const mappedItems = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    return {
      description: item.description,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
    };
  });
  return {
    ...quotation,
    items: mappedItems,
    total: mappedItems.reduce((total, item) => total + item.lineTotal, 0),
  };
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [companyTotal] = await db
    .select({ total: count() })
    .from(companiesTable);
  const [vehicleTotal] = await db
    .select({ total: count() })
    .from(vehiclesTable);
  const [openRequestTotal] = await db
    .select({ total: count() })
    .from(maintenanceRequestsTable)
    .where(
      inArray(maintenanceRequestsTable.status, ["New", "In Progress"]),
    );
  const [pendingInquiryTotal] = await db
    .select({ total: count() })
    .from(contactInquiriesTable)
    .where(inArray(contactInquiriesTable.status, ["New", "Read"]));
  const [quotationTotal] = await db
    .select({ total: count() })
    .from(quotationsTable);
  const recentRequests = await maintenanceSelect()
    .orderBy(desc(maintenanceRequestsTable.createdAt))
    .limit(5);
  const summary = {
    companies: companyTotal.total,
    vehicles: vehicleTotal.total,
    openRequests: openRequestTotal.total,
    pendingInquiries: pendingInquiryTotal.total,
    quotations: quotationTotal.total,
    recentRequests,
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/maintenance-requests", async (req, res): Promise<void> => {
  const parsed = ListMaintenanceRequestsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const {
    search = "",
    status,
    limit = 25,
    offset = 0,
  } = parsed.data;
  const conditions = [];
  if (search.trim()) {
    const pattern = `%${escapeLike(search.trim())}%`;
    conditions.push(
      or(
        like(vehiclesTable.registrationNumber, pattern),
        like(companiesTable.name, pattern),
        like(maintenanceRequestsTable.issueDescription, pattern),
      ),
    );
  }
  if (status) {
    conditions.push(eq(maintenanceRequestsTable.status, status));
  }
  const requests = await maintenanceSelect()
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(maintenanceRequestsTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(ListMaintenanceRequestsResponse.parse(requests));
});

router.post("/maintenance-requests", async (req, res): Promise<void> => {
  const parsed = CreateMaintenanceRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vehicle] = await db
    .select({
      id: vehiclesTable.id,
      companyId: vehiclesTable.companyId,
    })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.id, parsed.data.vehicleId))
    .limit(1);
  if (!vehicle || vehicle.companyId !== parsed.data.companyId) {
    res.status(400).json({
      error: "Choose a vehicle that belongs to the selected company.",
    });
    return;
  }
  const [request] = await db
    .insert(maintenanceRequestsTable)
    .values({
      ...parsed.data,
      issueDescription: parsed.data.issueDescription.trim(),
      status: "New",
    })
    .returning();
  const [hydrated] = await maintenanceSelect().where(
    eq(maintenanceRequestsTable.id, request.id),
  );
  res
    .status(201)
    .json(CreateMaintenanceRequestResponse.parse(hydrated));
});

router.patch("/maintenance-requests/:id", async (req, res): Promise<void> => {
  const params = UpdateMaintenanceRequestParams.safeParse(req.params);
  const parsed = UpdateMaintenanceRequestBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  if (
    parsed.data.issueDescription === undefined &&
    parsed.data.status === undefined
  ) {
    res.status(400).json({ error: "Provide a status or issue description to update." });
    return;
  }
  const [request] = await db
    .update(maintenanceRequestsTable)
    .set({
      ...parsed.data,
      ...(parsed.data.issueDescription !== undefined
        ? { issueDescription: parsed.data.issueDescription.trim() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(maintenanceRequestsTable.id, params.data.id))
    .returning();
  if (!request) {
    res.status(404).json({ error: "Maintenance request not found." });
    return;
  }
  const [hydrated] = await maintenanceSelect().where(
    eq(maintenanceRequestsTable.id, request.id),
  );
  res.json(UpdateMaintenanceRequestResponse.parse(hydrated));
});

router.get("/contact-inquiries", async (_req, res): Promise<void> => {
  const inquiries = await db
    .select()
    .from(contactInquiriesTable)
    .orderBy(desc(contactInquiriesTable.createdAt));
  res.json(ListContactInquiriesResponse.parse(inquiries));
});

router.patch("/contact-inquiries/:id", async (req, res): Promise<void> => {
  const params = UpdateContactInquiryParams.safeParse(req.params);
  const parsed = UpdateContactInquiryBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  const [inquiry] = await db
    .update(contactInquiriesTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(contactInquiriesTable.id, params.data.id))
    .returning();
  if (!inquiry) {
    res.status(404).json({ error: "Contact inquiry not found." });
    return;
  }
  res.json(UpdateContactInquiryResponse.parse(inquiry));
});

router.get("/quotations", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ id: quotationsTable.id })
    .from(quotationsTable)
    .orderBy(desc(quotationsTable.createdAt));
  const quotations = await Promise.all(
    rows.map((row) => getQuotation(row.id)),
  );
  res.json(ListQuotationsResponse.parse(quotations.filter(Boolean)));
});

router.post("/quotations", async (req, res): Promise<void> => {
  const parsed = CreateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [request] = await db
    .select({ id: maintenanceRequestsTable.id })
    .from(maintenanceRequestsTable)
    .where(eq(maintenanceRequestsTable.id, parsed.data.requestId))
    .limit(1);
  if (!request) {
    res.status(400).json({ error: "Select an existing maintenance request." });
    return;
  }
  const quotationId = await db.transaction(async (tx) => {
    const [quotation] = await tx
      .insert(quotationsTable)
      .values({ requestId: parsed.data.requestId, notes: parsed.data.notes.trim() })
      .returning({ id: quotationsTable.id });
    await tx.insert(quotationItemsTable).values(
      parsed.data.items.map((item) => ({
        quotationId: quotation.id,
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    );
    return quotation.id;
  });
  const quotation = await getQuotation(quotationId);
  res.status(201).json(CreateQuotationResponse.parse(quotation));
});

router.patch("/quotations/:id", async (req, res): Promise<void> => {
  const params = UpdateQuotationParams.safeParse(req.params);
  const parsed = UpdateQuotationBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  if (
    parsed.data.status === undefined &&
    parsed.data.notes === undefined &&
    parsed.data.items === undefined
  ) {
    res.status(400).json({ error: "Provide quotation details to update." });
    return;
  }
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: quotationsTable.id })
      .from(quotationsTable)
      .where(eq(quotationsTable.id, params.data.id))
      .limit(1);
    if (!existing) return false;

    await tx
      .update(quotationsTable)
      .set({
        ...(parsed.data.status !== undefined
          ? { status: parsed.data.status }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes.trim() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(quotationsTable.id, params.data.id));

    if (parsed.data.items !== undefined) {
      await tx
        .delete(quotationItemsTable)
        .where(eq(quotationItemsTable.quotationId, params.data.id));
      await tx.insert(quotationItemsTable).values(
        parsed.data.items.map((item) => ({
          quotationId: params.data.id,
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );
    }
    return true;
  });
  if (!updated) {
    res.status(404).json({ error: "Quotation not found." });
    return;
  }
  const quotation = await getQuotation(params.data.id);
  res.json(UpdateQuotationResponse.parse(quotation));
});

export default router;
