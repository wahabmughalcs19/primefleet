import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { asc, eq } from "drizzle-orm";
import {
  brandsTable,
  contactInquiriesTable,
  db,
  servicesTable,
  siteSettingsTable,
  vehicleCategoriesTable,
} from "@workspace/db";
import {
  CreateContactInquiryBody,
  CreateContactInquiryResponse,
  GetCurrentAccessResponse,
  GetPublicContentResponse,
  ListPublicBrandsResponse,
  ListPublicServicesResponse,
  ListPublicVehicleCategoriesResponse,
} from "@workspace/api-zod";
import { getAccessState } from "../lib/prime-fleet-auth";

const router: IRouter = Router();

const inquiryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Please wait before sending another inquiry." },
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const access = await getAccessState(req);
  res.json(GetCurrentAccessResponse.parse(access));
});

router.get("/content", async (_req, res): Promise<void> => {
  const [settings] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.id, "main"))
    .limit(1);
  if (!settings) {
    res.status(503).json({ error: "Website content is not available yet." });
    return;
  }
  res.json(GetPublicContentResponse.parse(settings));
});

router.get("/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.isPublished, true))
    .orderBy(asc(servicesTable.sortOrder), asc(servicesTable.id));
  res.json(ListPublicServicesResponse.parse(services));
});

router.get("/vehicle-categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(vehicleCategoriesTable)
    .where(eq(vehicleCategoriesTable.isActive, true))
    .orderBy(asc(vehicleCategoriesTable.sortOrder), asc(vehicleCategoriesTable.id));
  res.json(ListPublicVehicleCategoriesResponse.parse(categories));
});

router.get("/brands", async (_req, res): Promise<void> => {
  const brands = await db
    .select()
    .from(brandsTable)
    .where(eq(brandsTable.isActive, true))
    .orderBy(asc(brandsTable.name));
  res.json(ListPublicBrandsResponse.parse(brands));
});

router.post(
  "/contact-inquiries",
  inquiryRateLimit,
  async (req, res): Promise<void> => {
    const parsed = CreateContactInquiryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [inquiry] = await db
      .insert(contactInquiriesTable)
      .values({
        ...parsed.data,
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim().toLowerCase(),
        phone: parsed.data.phone.trim(),
        subject: parsed.data.subject.trim(),
        message: parsed.data.message.trim(),
      })
      .returning();

    res
      .status(201)
      .json(CreateContactInquiryResponse.parse(inquiry));
  },
);

export default router;
