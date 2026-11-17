import "./lib/load-env";
import express, { type ErrorRequestHandler, type Express } from "express";
import app from "./app";
import { logger } from "./lib/logger";
import { seedPrimeFleetDefaults } from "./lib/prime-fleet-bootstrap";

let ready: Promise<void> | null = null;

const server: Express = express();

server.use(async (_req, _res, next) => {
  try {
    ready ??= seedPrimeFleetDefaults();
    await ready;
    next();
  } catch (error) {
    ready = null;
    next(error);
  }
});

server.use(app);

const startupError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  logger.error({ err: error }, "Prime Fleet failed to start");
  res.status(500).json({ error: "The service could not start. Please try again." });
};

server.use(startupError);

export default server;
