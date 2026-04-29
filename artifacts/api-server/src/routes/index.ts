import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import meterRouter from "./meter.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meterRouter);

export default router;
