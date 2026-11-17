import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { ensureSchema } from "./ensure-schema";

function sqliteFilePath(): string {
  if (process.env.SQLITE_PATH) return path.resolve(process.env.SQLITE_PATH);
  // Vercel's function filesystem is read-only except /tmp, and that disk is wiped
  // between cold starts. Set TURSO_DATABASE_URL so customer data survives.
  if (process.env.VERCEL) return path.join("/tmp", "prime-fleet.db");
  const here = path.dirname(fileURLToPath(import.meta.url));
  // Source file lives in lib/db/src. The Vercel bundle lives in vercel-api/.
  if (here.endsWith(`${path.sep}src`)) {
    return path.resolve(here, "../../../data/prime-fleet.db");
  }
  return path.resolve(here, "../data/prime-fleet.db");
}

// Hosted SQLite (Turso) when TURSO_DATABASE_URL is set; otherwise a local file.
function clientConfig(): { url: string; authToken?: string } {
  if (process.env.TURSO_DATABASE_URL) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  if (process.env.VERCEL) {
    console.warn(
      "TURSO_DATABASE_URL is not set. This deployment is using a temporary database that is erased when the server sleeps.",
    );
  }
  const filePath = sqliteFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return { url: `file:${filePath.replace(/\\/g, "/")}` };
}

export const client: Client = createClient(clientConfig());
export const db = drizzle(client, { schema });

let ready: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  ready ??= ensureSchema(client);
  return ready;
}

export * from "./schema";
