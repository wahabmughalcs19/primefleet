import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import {
  CreateCompanyBody,
  CreateCompanyResponse,
  CreateVehicleBody,
  CreateVehicleResponse,
  DeleteCompanyParams,
  DeleteCompanyResponse,
  DeleteVehicleParams,
  DeleteVehicleResponse,
  GetCompanyParams,
  GetCompanyResponse,
  ListCompaniesQueryParams,
  ListCompaniesResponse,
  ListVehiclesQueryParams,
  ListVehiclesResponse,
  SearchVehiclesQueryParams,
  SearchVehiclesResponse,
  UpdateCompanyBody,
  UpdateCompanyParams,
  UpdateCompanyResponse,
  UpdateVehicleBody,
  UpdateVehicleParams,
  UpdateVehicleResponse,
} from "@workspace/api-zod";
import {
  brandsTable,
  companiesTable,
  db,
  maintenanceRequestsTable,
  vehicleCategoriesTable,
  vehiclesTable,
} from "@workspace/db";

const router: IRouter = Router();

function registrationNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505",
  );
}

async function loadVehicle(id: number) {
  const [vehicle] = await db
    .select({
      id: vehiclesTable.id,
      registrationNumber: vehiclesTable.registrationNumber,
      companyId: vehiclesTable.companyId,
      companyName: companiesTable.name,
      brandId: vehiclesTable.brandId,
      brandName: brandsTable.name,
      categoryId: vehiclesTable.categoryId,
      categoryName: vehicleCategoriesTable.name,
      model: vehiclesTable.model,
      year: vehiclesTable.year,
      notes: vehiclesTable.notes,
      createdAt: vehiclesTable.createdAt,
    })
    .from(vehiclesTable)
    .innerJoin(companiesTable, eq(vehiclesTable.companyId, companiesTable.id))
    .leftJoin(brandsTable, eq(vehiclesTable.brandId, brandsTable.id))
    .leftJoin(
      vehicleCategoriesTable,
      eq(vehiclesTable.categoryId, vehicleCategoriesTable.id),
    )
    .where(eq(vehiclesTable.id, id))
    .limit(1);
  return vehicle;
}

function vehicleSelect() {
  return db
    .select({
      id: vehiclesTable.id,
      registrationNumber: vehiclesTable.registrationNumber,
      companyId: vehiclesTable.companyId,
      companyName: companiesTable.name,
      brandId: vehiclesTable.brandId,
      brandName: brandsTable.name,
      categoryId: vehiclesTable.categoryId,
      categoryName: vehicleCategoriesTable.name,
      model: vehiclesTable.model,
      year: vehiclesTable.year,
      notes: vehiclesTable.notes,
      createdAt: vehiclesTable.createdAt,
    })
    .from(vehiclesTable)
    .innerJoin(companiesTable, eq(vehiclesTable.companyId, companiesTable.id))
    .leftJoin(brandsTable, eq(vehiclesTable.brandId, brandsTable.id))
    .leftJoin(
      vehicleCategoriesTable,
      eq(vehiclesTable.categoryId, vehicleCategoriesTable.id),
    );
}

async function checkVehicleOptions(brandId?: number | null, categoryId?: number | null) {
  if (brandId != null) {
    const [brand] = await db
      .select({ id: brandsTable.id })
      .from(brandsTable)
      .where(and(eq(brandsTable.id, brandId), eq(brandsTable.isActive, true)))
      .limit(1);
    if (!brand) return "Select an active vehicle brand.";
  }
  if (categoryId != null) {
    const [category] = await db
      .select({ id: vehicleCategoriesTable.id })
      .from(vehicleCategoriesTable)
      .where(
        and(
          eq(vehicleCategoriesTable.id, categoryId),
          eq(vehicleCategoriesTable.isActive, true),
        ),
      )
      .limit(1);
    if (!category) return "Select an active vehicle category.";
  }
  return null;
}

router.get("/companies", async (req, res): Promise<void> => {
  const parsed = ListCompaniesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search = "", limit = 25, offset = 0 } = parsed.data;
  const term = search.trim();
  const rows = await db
    .select()
    .from(companiesTable)
    .where(
      term
        ? or(
            like(companiesTable.name, `%${escapeLike(term)}%`),
            like(companiesTable.contactPerson, `%${escapeLike(term)}%`),
            like(companiesTable.phone, `%${escapeLike(term)}%`),
          )
        : undefined,
    )
    .orderBy(desc(companiesTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(ListCompaniesResponse.parse(rows));
});

router.post("/companies", async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [company] = await db
    .insert(companiesTable)
    .values({
      ...parsed.data,
      name: parsed.data.name.trim(),
      contactPerson: parsed.data.contactPerson.trim(),
      phone: parsed.data.phone.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      address: parsed.data.address.trim(),
      notes: parsed.data.notes.trim(),
    })
    .returning();
  res.status(201).json(CreateCompanyResponse.parse(company));
});

router.get("/companies/:id", async (req, res): Promise<void> => {
  const params = GetCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, params.data.id))
    .limit(1);
  if (!company) {
    res.status(404).json({ error: "Company not found." });
    return;
  }
  const vehicles = await vehicleSelect()
    .where(eq(vehiclesTable.companyId, company.id))
    .orderBy(asc(vehiclesTable.registrationNumber));
  res.json(GetCompanyResponse.parse({ ...company, vehicles }));
});

router.patch("/companies/:id", async (req, res): Promise<void> => {
  const params = UpdateCompanyParams.safeParse(req.params);
  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  const [company] = await db
    .update(companiesTable)
    .set({
      ...parsed.data,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.contactPerson !== undefined
        ? { contactPerson: parsed.data.contactPerson.trim() }
        : {}),
      ...(parsed.data.phone !== undefined
        ? { phone: parsed.data.phone.trim() }
        : {}),
      ...(parsed.data.email !== undefined
        ? { email: parsed.data.email.trim().toLowerCase() }
        : {}),
      ...(parsed.data.address !== undefined
        ? { address: parsed.data.address.trim() }
        : {}),
      ...(parsed.data.notes !== undefined
        ? { notes: parsed.data.notes.trim() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(companiesTable.id, params.data.id))
    .returning();
  if (!company) {
    res.status(404).json({ error: "Company not found." });
    return;
  }
  res.json(UpdateCompanyResponse.parse(company));
});

router.delete("/companies/:id", async (req, res): Promise<void> => {
  const params = DeleteCompanyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vehicleCount] = await db
    .select({ total: count() })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.companyId, params.data.id));
  const [requestCount] = await db
    .select({ total: count() })
    .from(maintenanceRequestsTable)
    .where(eq(maintenanceRequestsTable.companyId, params.data.id));
  if (vehicleCount.total > 0 || requestCount.total > 0) {
    res.status(409).json({
      error: "This company has saved vehicles or maintenance records and cannot be deleted.",
    });
    return;
  }
  const [company] = await db
    .delete(companiesTable)
    .where(eq(companiesTable.id, params.data.id))
    .returning();
  if (!company) {
    res.status(404).json({ error: "Company not found." });
    return;
  }
  res.status(204).json(DeleteCompanyResponse.parse(undefined));
});

router.get("/vehicles", async (req, res): Promise<void> => {
  const parsed = ListVehiclesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search = "", companyId, limit = 25, offset = 0 } = parsed.data;
  const conditions = [];
  if (search.trim()) {
    const pattern = `%${escapeLike(search.trim())}%`;
    conditions.push(
      or(
        like(vehiclesTable.registrationNumber, pattern),
        like(companiesTable.name, pattern),
        like(vehiclesTable.model, pattern),
      ),
    );
  }
  if (companyId !== undefined) {
    conditions.push(eq(vehiclesTable.companyId, companyId));
  }
  const rows = await vehicleSelect()
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(vehiclesTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json(ListVehiclesResponse.parse(rows));
});

router.get("/vehicles/search", async (req, res): Promise<void> => {
  const parsed = SearchVehiclesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const pattern = `%${escapeLike(parsed.data.query.trim())}%`;
  const rows = await vehicleSelect()
    .where(like(vehiclesTable.registrationNumber, pattern))
    .orderBy(asc(vehiclesTable.registrationNumber))
    .limit(12);
  res.json(SearchVehiclesResponse.parse(rows));
});

router.post("/vehicles", async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [company] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.id, parsed.data.companyId))
    .limit(1);
  if (!company) {
    res.status(400).json({ error: "Select a saved company before registering a vehicle." });
    return;
  }
  const optionError = await checkVehicleOptions(
    parsed.data.brandId,
    parsed.data.categoryId,
  );
  if (optionError) {
    res.status(400).json({ error: optionError });
    return;
  }
  try {
    const [created] = await db
      .insert(vehiclesTable)
      .values({
        ...parsed.data,
        registrationNumber: registrationNumber(parsed.data.registrationNumber),
        model: parsed.data.model.trim(),
        notes: parsed.data.notes.trim(),
      })
      .returning();
    const vehicle = await loadVehicle(created.id);
    res.status(201).json(CreateVehicleResponse.parse(vehicle));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "That vehicle registration number is already saved." });
      return;
    }
    throw error;
  }
});

router.patch("/vehicles/:id", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  if (parsed.data.companyId !== undefined) {
    const [company] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.id, parsed.data.companyId))
      .limit(1);
    if (!company) {
      res.status(400).json({ error: "Select a saved company before updating a vehicle." });
      return;
    }
  }
  const optionError = await checkVehicleOptions(
    parsed.data.brandId,
    parsed.data.categoryId,
  );
  if (optionError) {
    res.status(400).json({ error: optionError });
    return;
  }
  try {
    const [updated] = await db
      .update(vehiclesTable)
      .set({
        ...parsed.data,
        ...(parsed.data.registrationNumber !== undefined
          ? { registrationNumber: registrationNumber(parsed.data.registrationNumber) }
          : {}),
        ...(parsed.data.model !== undefined
          ? { model: parsed.data.model.trim() }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes.trim() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(vehiclesTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Vehicle not found." });
      return;
    }
    const vehicle = await loadVehicle(updated.id);
    res.json(UpdateVehicleResponse.parse(vehicle));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "That vehicle registration number is already saved." });
      return;
    }
    throw error;
  }
});

router.delete("/vehicles/:id", async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [requestCount] = await db
    .select({ total: count() })
    .from(maintenanceRequestsTable)
    .where(eq(maintenanceRequestsTable.vehicleId, params.data.id));
  if (requestCount.total > 0) {
    res.status(409).json({
      error: "This vehicle has maintenance history and cannot be deleted.",
    });
    return;
  }
  const [vehicle] = await db
    .delete(vehiclesTable)
    .where(eq(vehiclesTable.id, params.data.id))
    .returning();
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found." });
    return;
  }
  res.status(204).json(DeleteVehicleResponse.parse(undefined));
});

export default router;
