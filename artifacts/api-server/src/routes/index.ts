import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meterRouter from "./meter";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meterRouter);

export default router;
