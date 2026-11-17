import type { Client } from "@libsql/client";

const statements = [
  `CREATE TABLE IF NOT EXISTS prime_fleet_site_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    business_name TEXT NOT NULL,
    contact_person TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    hero_title TEXT NOT NULL,
    hero_subtitle TEXT NOT NULL,
    hero_description TEXT NOT NULL,
    about_title TEXT NOT NULL,
    about_body TEXT NOT NULL,
    services_title TEXT NOT NULL,
    services_description TEXT NOT NULL,
    vehicles_title TEXT NOT NULL,
    contact_title TEXT NOT NULL,
    contact_description TEXT NOT NULL,
    footer_text TEXT NOT NULL,
    copyright_text TEXT NOT NULL,
    seo_title TEXT NOT NULL,
    seo_description TEXT NOT NULL,
    primary_button_label TEXT NOT NULL,
    primary_button_link TEXT NOT NULL,
    secondary_button_label TEXT NOT NULL,
    secondary_button_link TEXT NOT NULL,
    show_services INTEGER NOT NULL DEFAULT 1,
    show_vehicles INTEGER NOT NULL DEFAULT 1,
    logo_url TEXT,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    is_published INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS prime_fleet_services_slug_idx ON prime_fleet_services (slug)`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_vehicle_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS prime_fleet_vehicle_categories_name_idx ON prime_fleet_vehicle_categories (name)`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS prime_fleet_brands_name_idx ON prime_fleet_brands (name)`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL REFERENCES prime_fleet_admins(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_companies_name_search_idx ON prime_fleet_companies (name)`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_companies_phone_search_idx ON prime_fleet_companies (phone)`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_number TEXT NOT NULL UNIQUE,
    company_id INTEGER NOT NULL REFERENCES prime_fleet_companies(id) ON DELETE RESTRICT,
    brand_id INTEGER REFERENCES prime_fleet_brands(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES prime_fleet_vehicle_categories(id) ON DELETE SET NULL,
    model TEXT NOT NULL DEFAULT '',
    year INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_vehicles_registration_search_idx ON prime_fleet_vehicles (registration_number)`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_vehicles_company_search_idx ON prime_fleet_vehicles (company_id)`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_maintenance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL REFERENCES prime_fleet_companies(id) ON DELETE RESTRICT,
    vehicle_id INTEGER NOT NULL REFERENCES prime_fleet_vehicles(id) ON DELETE RESTRICT,
    issue_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_requests_company_idx ON prime_fleet_maintenance_requests (company_id)`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_requests_vehicle_idx ON prime_fleet_maintenance_requests (vehicle_id)`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_requests_status_idx ON prime_fleet_maintenance_requests (status)`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_contact_inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES prime_fleet_maintenance_requests(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'Draft',
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS prime_fleet_quotations_request_idx ON prime_fleet_quotations (request_id)`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL REFERENCES prime_fleet_quotations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    company_id INTEGER REFERENCES prime_fleet_companies(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prime_fleet_customer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES prime_fleet_customers(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
];

export async function ensureSchema(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON");
  for (const statement of statements) {
    await client.execute(statement);
  }
}
