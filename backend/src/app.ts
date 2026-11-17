import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const frontendDist = path.join(repoRoot, "frontend", "dist");
const adminDist = path.join(repoRoot, "admin", "dist");

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"];
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function allowedOrigin(origin: string): boolean {
  if (defaultOrigins.includes(origin) || corsOrigins.includes(origin)) return true;
  const hosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
  ];
  return hosts.some((host) => Boolean(host) && origin === `https://${host}`);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz",
});

app.use("/api", apiRateLimit, router);

const apiErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  req.log.error({ err: error }, "Unhandled API error");
  const status =
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
      ? error.status
      : 500;
  res.status(status).json({
    error:
      status < 500 && error instanceof Error
        ? error.message
        : "The request could not be completed. Please try again.",
  });
};

app.use("/api", apiErrorHandler);

if (fs.existsSync(adminDist)) {
  app.use("/admin", express.static(adminDist));
}
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  if (req.path === "/admin" || req.path.startsWith("/admin/")) {
    const file = path.join(adminDist, "index.html");
    if (fs.existsSync(file)) {
      res.sendFile(file);
      return;
    }
  }
  const file = path.join(frontendDist, "index.html");
  if (fs.existsSync(file)) {
    res.sendFile(file);
    return;
  }
  next();
});

export default app;
