import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const siteSettingsTable = sqliteTable("prime_fleet_site_settings", {
  id: text("id").primaryKey().default("main"),
  businessName: text("business_name").notNull(),
  contactPerson: text("contact_person").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  heroTitle: text("hero_title").notNull(),
  heroSubtitle: text("hero_subtitle").notNull(),
  heroDescription: text("hero_description").notNull(),
  aboutTitle: text("about_title").notNull(),
  aboutBody: text("about_body").notNull(),
  servicesTitle: text("services_title").notNull(),
  servicesDescription: text("services_description").notNull(),
  vehiclesTitle: text("vehicles_title").notNull(),
  contactTitle: text("contact_title").notNull(),
  contactDescription: text("contact_description").notNull(),
  footerText: text("footer_text").notNull(),
  copyrightText: text("copyright_text").notNull(),
  seoTitle: text("seo_title").notNull(),
  seoDescription: text("seo_description").notNull(),
  primaryButtonLabel: text("primary_button_label").notNull(),
  primaryButtonLink: text("primary_button_link").notNull(),
  secondaryButtonLabel: text("secondary_button_label").notNull(),
  secondaryButtonLink: text("secondary_button_link").notNull(),
  showServices: integer("show_services", { mode: "boolean" }).notNull().default(true),
  showVehicles: integer("show_vehicles", { mode: "boolean" }).notNull().default(true),
  logoUrl: text("logo_url"),
  updatedAt: updatedAt(),
});

export const servicesTable = sqliteTable(
  "prime_fleet_services",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("prime_fleet_services_slug_idx").on(table.slug)],
);

export const vehicleCategoriesTable = sqliteTable(
  "prime_fleet_vehicle_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("prime_fleet_vehicle_categories_name_idx").on(table.name)],
);

export const brandsTable = sqliteTable(
  "prime_fleet_brands",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("prime_fleet_brands_name_idx").on(table.name)],
);

export const adminsTable = sqliteTable("prime_fleet_admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: createdAt(),
});

export const sessionsTable = sqliteTable("prime_fleet_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id")
    .notNull()
    .references(() => adminsTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
});

export const companiesTable = sqliteTable(
  "prime_fleet_companies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    contactPerson: text("contact_person").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("prime_fleet_companies_name_search_idx").on(table.name),
    index("prime_fleet_companies_phone_search_idx").on(table.phone),
  ],
);

export const customersTable = sqliteTable("prime_fleet_customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull().default(""),
  companyId: integer("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
});

export const customerSessionsTable = sqliteTable("prime_fleet_customer_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
});

export const vehiclesTable = sqliteTable(
  "prime_fleet_vehicles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    registrationNumber: text("registration_number").notNull().unique(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),
    brandId: integer("brand_id").references(() => brandsTable.id, {
      onDelete: "set null",
    }),
    categoryId: integer("category_id").references(() => vehicleCategoriesTable.id, {
      onDelete: "set null",
    }),
    model: text("model").notNull().default(""),
    year: integer("year"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("prime_fleet_vehicles_registration_search_idx").on(table.registrationNumber),
    index("prime_fleet_vehicles_company_search_idx").on(table.companyId),
  ],
);

export const maintenanceRequestsTable = sqliteTable(
  "prime_fleet_maintenance_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "restrict" }),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "restrict" }),
    issueDescription: text("issue_description").notNull(),
    status: text("status").notNull().default("New"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("prime_fleet_requests_company_idx").on(table.companyId),
    index("prime_fleet_requests_vehicle_idx").on(table.vehicleId),
    index("prime_fleet_requests_status_idx").on(table.status),
  ],
);

export const contactInquiriesTable = sqliteTable("prime_fleet_contact_inquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  subject: text("subject").notNull().default(""),
  message: text("message").notNull(),
  status: text("status").notNull().default("New"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const quotationsTable = sqliteTable(
  "prime_fleet_quotations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    requestId: integer("request_id")
      .notNull()
      .references(() => maintenanceRequestsTable.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("Draft"),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("prime_fleet_quotations_request_idx").on(table.requestId)],
);

export const quotationItemsTable = sqliteTable("prime_fleet_quotation_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quotationId: integer("quotation_id")
    .notNull()
    .references(() => quotationsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
export type Service = typeof servicesTable.$inferSelect;
export type VehicleCategory = typeof vehicleCategoriesTable.$inferSelect;
export type Brand = typeof brandsTable.$inferSelect;
export type Admin = typeof adminsTable.$inferSelect;
export type Company = typeof companiesTable.$inferSelect;
export type Vehicle = typeof vehiclesTable.$inferSelect;
export type MaintenanceRequest = typeof maintenanceRequestsTable.$inferSelect;
export type ContactInquiry = typeof contactInquiriesTable.$inferSelect;
export type Quotation = typeof quotationsTable.$inferSelect;
export type QuotationItem = typeof quotationItemsTable.$inferSelect;
