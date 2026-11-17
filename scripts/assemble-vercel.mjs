import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(path.join(root, "frontend", "dist"), output, { recursive: true });
cpSync(path.join(root, "admin", "dist"), path.join(output, "admin"), { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, "backend", "src", "vercel.ts")],
  outfile: path.join(root, "vercel-api", "server.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  legalComments: "none",
  external: [
    "express",
    "cors",
    "cookie-parser",
    "pino",
    "pino-http",
    "express-rate-limit",
    "drizzle-orm",
    "@libsql/client",
    "zod",
  ],
});
