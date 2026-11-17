import { Router, type IRouter } from "express";
import { asc, count, eq } from "drizzle-orm";
import {
  CreateBrandBody,
  CreateBrandResponse,
  CreateServiceBody,
  CreateServiceResponse,
  CreateVehicleCategoryBody,
  CreateVehicleCategoryResponse,
  DeleteBrandParams,
  DeleteBrandResponse,
  DeleteServiceParams,
  DeleteServiceResponse,
  DeleteVehicleCategoryParams,
  DeleteVehicleCategoryResponse,
  ListAdminBrandsResponse,
  ListAdminServicesResponse,
  ListAdminVehicleCategoriesResponse,
  UpdateBrandBody,
  UpdateBrandParams,
  UpdateBrandResponse,
  UpdateServiceBody,
  UpdateServiceParams,
  UpdateServiceResponse,
  UpdateSiteContentBody,
  UpdateSiteContentResponse,
  UpdateVehicleCategoryBody,
  UpdateVehicleCategoryParams,
  UpdateVehicleCategoryResponse,
} from "@workspace/api-zod";
import {
  brandsTable,
  db,
  servicesTable,
  siteSettingsTable,
  vehicleCategoriesTable,
  vehiclesTable,
} from "@workspace/db";

const router: IRouter = Router();

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505",
  );
}

router.put("/content", async (req, res): Promise<void> => {
  const parsed = UpdateSiteContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [settings] = await db
    .insert(siteSettingsTable)
    .values({ id: "main", ...parsed.data })
    .onConflictDoUpdate({
      target: siteSettingsTable.id,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  res.json(UpdateSiteContentResponse.parse(settings));
});

router.get("/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .orderBy(asc(servicesTable.sortOrder), asc(servicesTable.id));
  res.json(ListAdminServicesResponse.parse(services));
});

router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [service] = await db
      .insert(servicesTable)
      .values({
        ...parsed.data,
        title: parsed.data.title.trim(),
        slug: slugify(parsed.data.title),
        summary: parsed.data.summary.trim(),
        description: parsed.data.description.trim(),
        imageUrl: parsed.data.imageUrl ?? null,
      })
      .returning();
    res.status(201).json(CreateServiceResponse.parse(service));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "A service with this title already exists." });
      return;
    }
    throw error;
  }
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse(req.params);
  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  const update = {
    ...parsed.data,
    ...(parsed.data.title !== undefined
      ? { title: parsed.data.title.trim(), slug: slugify(parsed.data.title) }
      : {}),
    ...(parsed.data.summary !== undefined
      ? { summary: parsed.data.summary.trim() }
      : {}),
    ...(parsed.data.description !== undefined
      ? { description: parsed.data.description.trim() }
      : {}),
    updatedAt: new Date(),
  };
  try {
    const [service] = await db
      .update(servicesTable)
      .set(update)
      .where(eq(servicesTable.id, params.data.id))
      .returning();
    if (!service) {
      res.status(404).json({ error: "Service not found." });
      return;
    }
    res.json(UpdateServiceResponse.parse(service));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "A service with this title already exists." });
      return;
    }
    throw error;
  }
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db
    .delete(servicesTable)
    .where(eq(servicesTable.id, params.data.id))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Service not found." });
    return;
  }
  res.status(204).json(DeleteServiceResponse.parse(undefined));
});

router.get("/vehicle-categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(vehicleCategoriesTable)
    .orderBy(asc(vehicleCategoriesTable.sortOrder), asc(vehicleCategoriesTable.id));
  res.json(ListAdminVehicleCategoriesResponse.parse(categories));
});

router.post("/vehicle-categories", async (req, res): Promise<void> => {
  const parsed = CreateVehicleCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [category] = await db
      .insert(vehicleCategoriesTable)
      .values({ ...parsed.data, name: parsed.data.name.trim() })
      .returning();
    res.status(201).json(CreateVehicleCategoryResponse.parse(category));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "This vehicle category already exists." });
      return;
    }
    throw error;
  }
});

router.patch("/vehicle-categories/:id", async (req, res): Promise<void> => {
  const params = UpdateVehicleCategoryParams.safeParse(req.params);
  const parsed = UpdateVehicleCategoryBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  try {
    const [category] = await db
      .update(vehicleCategoriesTable)
      .set({
        ...parsed.data,
        ...(parsed.data.name !== undefined
          ? { name: parsed.data.name.trim() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(vehicleCategoriesTable.id, params.data.id))
      .returning();
    if (!category) {
      res.status(404).json({ error: "Vehicle category not found." });
      return;
    }
    res.json(UpdateVehicleCategoryResponse.parse(category));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "This vehicle category already exists." });
      return;
    }
    throw error;
  }
});

router.delete("/vehicle-categories/:id", async (req, res): Promise<void> => {
  const params = DeleteVehicleCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [usage] = await db
    .select({ total: count() })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.categoryId, params.data.id));
  if (usage.total > 0) {
    res.status(409).json({
      error: "This category is used by saved vehicles. Deactivate it instead.",
    });
    return;
  }
  const [category] = await db
    .delete(vehicleCategoriesTable)
    .where(eq(vehicleCategoriesTable.id, params.data.id))
    .returning();
  if (!category) {
    res.status(404).json({ error: "Vehicle category not found." });
    return;
  }
  res.status(204).json(DeleteVehicleCategoryResponse.parse(undefined));
});

router.get("/brands", async (_req, res): Promise<void> => {
  const brands = await db.select().from(brandsTable).orderBy(asc(brandsTable.name));
  res.json(ListAdminBrandsResponse.parse(brands));
});

router.post("/brands", async (req, res): Promise<void> => {
  const parsed = CreateBrandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [brand] = await db
      .insert(brandsTable)
      .values({ ...parsed.data, name: parsed.data.name.trim() })
      .returning();
    res.status(201).json(CreateBrandResponse.parse(brand));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "This brand already exists." });
      return;
    }
    throw error;
  }
});

router.patch("/brands/:id", async (req, res): Promise<void> => {
  const params = UpdateBrandParams.safeParse(req.params);
  const parsed = UpdateBrandBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({
      error: params.error?.message ?? parsed.error?.message ?? "Invalid request.",
    });
    return;
  }
  try {
    const [brand] = await db
      .update(brandsTable)
      .set({
        ...parsed.data,
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(brandsTable.id, params.data.id))
      .returning();
    if (!brand) {
      res.status(404).json({ error: "Brand not found." });
      return;
    }
    res.json(UpdateBrandResponse.parse(brand));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: "This brand already exists." });
      return;
    }
    throw error;
  }
});

router.delete("/brands/:id", async (req, res): Promise<void> => {
  const params = DeleteBrandParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [usage] = await db
    .select({ total: count() })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.brandId, params.data.id));
  if (usage.total > 0) {
    res.status(409).json({
      error: "This brand is used by saved vehicles. Deactivate it instead.",
    });
    return;
  }
  const [brand] = await db
    .delete(brandsTable)
    .where(eq(brandsTable.id, params.data.id))
    .returning();
  if (!brand) {
    res.status(404).json({ error: "Brand not found." });
    return;
  }
  res.status(204).json(DeleteBrandResponse.parse(undefined));
});

export default router;
