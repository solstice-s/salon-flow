import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import staffRouter from "./staff";
import bookingsRouter from "./bookings";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(staffRouter);
router.use(bookingsRouter);
router.use(adminRouter);

export default router;
