import { eq } from "drizzle-orm";
import {
  adminsTable,
  brandsTable,
  db,
  initDatabase,
  servicesTable,
  siteSettingsTable,
  vehicleCategoriesTable,
} from "@workspace/db";
import { hashPassword } from "./passwords";
import { logger } from "./logger";

export async function seedPrimeFleetDefaults(): Promise<void> {
  await initDatabase();
  await seedAdmin();
  await db
    .insert(siteSettingsTable)
    .values({
      id: "main",
      businessName: "Prime Fleet Solutions",
      contactPerson: "Muhammad Sajid Ali",
      phone: "0305-7088171",
      email: "msajidali7088@gmail.com",
      address: "Muslim Chowk, Rahim Yar Khan, Pakistan",
      heroTitle: "Keep your fleet moving.",
      heroSubtitle: "Heavy-vehicle maintenance, made dependable.",
      heroDescription:
        "Practical maintenance support for the trucks and commercial vehicles that keep your business moving.",
      aboutTitle: "A local partner for hard-working fleets",
      aboutBody:
        "Based at Muslim Chowk in Rahim Yar Khan, Prime Fleet Solutions supports commercial transport operators with practical heavy-vehicle maintenance. Get in touch to discuss your fleet's needs.",
      servicesTitle: "Support for your working fleet",
      servicesDescription:
        "Contact our team to discuss maintenance and repair needs for your heavy vehicles.",
      vehiclesTitle: "Built around heavy vehicles",
      contactTitle: "Talk to our team",
      contactDescription:
        "Tell us what your vehicle or fleet needs. Our team will follow up using the contact details you provide.",
      footerText:
        "Heavy-vehicle maintenance for the businesses that keep Pakistan moving.",
      copyrightText: "Prime Fleet Solutions. All rights reserved.",
      seoTitle: "Prime Fleet Solutions | Heavy Vehicle Maintenance",
      seoDescription:
        "Heavy vehicle maintenance and fleet support in Rahim Yar Khan, Pakistan.",
      primaryButtonLabel: "Request maintenance",
      primaryButtonLink: "/contact",
      secondaryButtonLabel: "Explore services",
      secondaryButtonLink: "/services",
      showServices: true,
      showVehicles: true,
      logoUrl: null,
    })
    .onConflictDoNothing();

  const categories = [
    "10-wheeler",
    "14-wheeler",
    "18-wheeler",
    "22-wheeler",
    "Prime mover",
    "Container truck",
    "Other heavy vehicles",
  ];
  for (const [sortOrder, name] of categories.entries()) {
    await db
      .insert(vehicleCategoriesTable)
      .values({ name, description: "", sortOrder, isActive: true })
      .onConflictDoNothing();
  }

  for (const name of ["Isuzu", "Hino", "Nissan", "Foton", "FAW"]) {
    await db
      .insert(brandsTable)
      .values({ name, isActive: true })
      .onConflictDoNothing();
  }

  const starterServices = [
    {
      title: "Preventive fleet maintenance",
      summary: "Planned care for the vehicles your business depends on.",
      description:
        "Discuss a practical maintenance schedule for your heavy vehicles with the Prime Fleet Solutions team.",
      sortOrder: 10,
    },
    {
      title: "Heavy vehicle diagnostics",
      summary: "Find the source of vehicle issues before they grow.",
      description:
        "Share the symptoms your vehicle is experiencing so the team can advise on the next step.",
      sortOrder: 20,
    },
    {
      title: "Brake and suspension service",
      summary: "Maintenance support for essential vehicle systems.",
      description:
        "Contact us to discuss inspection and service needs for heavy-vehicle brake and suspension systems.",
      sortOrder: 30,
    },
    {
      title: "Fleet inspection",
      summary: "A clear view of maintenance needs across your fleet.",
      description:
        "Talk with our team about inspection requirements for your commercial vehicles.",
      sortOrder: 40,
    },
  ];

  for (const service of starterServices) {
    const slug = service.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    await db
      .insert(servicesTable)
      .values({ ...service, slug, imageUrl: null, isPublished: false })
      .onConflictDoNothing();
  }
  await repairHomeButtons();
}

async function repairHomeButtons(): Promise<void> {
  const [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, "main")).limit(1);
  if (!settings) return;
  const usable = (link: string) => {
    const value = link.trim();
    return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
  };
  const placeholder = (label: string) => /voluptat|aliquip|lorem|ipsum|quisquam|necessit/i.test(label);
  const patch: Partial<typeof settings> = {};
  if (!usable(settings.primaryButtonLink) || placeholder(settings.primaryButtonLabel)) {
    patch.primaryButtonLabel = "Request maintenance";
    patch.primaryButtonLink = "/contact";
  }
  if (!usable(settings.secondaryButtonLink) || placeholder(settings.secondaryButtonLabel)) {
    patch.secondaryButtonLabel = "See our services";
    patch.secondaryButtonLink = "/services";
  }
  if (Object.keys(patch).length > 0) {
    await db.update(siteSettingsTable).set(patch).where(eq(siteSettingsTable.id, "main"));
  }
}

async function seedAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "msajidali7088@gmail.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "PrimeFleet123";
  const [existing] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.email, email))
    .limit(1);
  if (existing) return;

  await db.insert(adminsTable).values({
    email,
    passwordHash: hashPassword(password),
    role: "admin",
  });
  logger.info({ email }, "Created the administrator account");
  if (!process.env.ADMIN_PASSWORD) {
    logger.warn(
      "ADMIN_PASSWORD is not set. The new administrator can sign in with the local default password PrimeFleet123. Set ADMIN_PASSWORD in .env before sharing this app.",
    );
  }
}
