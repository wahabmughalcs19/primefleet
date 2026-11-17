import "./lib/load-env";
import app from "./app";
import { logger } from "./lib/logger";
import { seedPrimeFleetDefaults } from "./lib/prime-fleet-bootstrap";

const rawPort = process.env.PORT ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  await seedPrimeFleetDefaults();
  app.listen(port, () => {
    logger.info({ port }, "Prime Fleet API listening");
    logger.info("Website http://localhost:5173  Admin http://localhost:5174  API http://localhost:" + port);
  });
}

start().catch((err: unknown) => {
  logger.error({ err }, "Unable to start Prime Fleet Solutions");
  process.exit(1);
});
