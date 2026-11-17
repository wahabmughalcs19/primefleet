import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import authRouter from "./auth";
import adminCmsRouter from "./admin-cms";
import adminFleetRouter from "./admin-fleet";
import adminWorkRouter from "./admin-work";
import adminCustomersRouter from "./admin-customers";
import customerRouter from "./customer";
import { requireAdmin } from "../lib/prime-fleet-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publicRouter);
router.use("/customer", customerRouter);

const adminRouter: IRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.use(adminCmsRouter);
adminRouter.use(adminFleetRouter);
adminRouter.use(adminWorkRouter);
adminRouter.use(adminCustomersRouter);
router.use("/admin", adminRouter);

router.use((_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

export default router;
