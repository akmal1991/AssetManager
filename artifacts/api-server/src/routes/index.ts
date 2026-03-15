import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import submissionsRouter from "./submissions.js";
import reviewsRouter from "./reviews.js";
import usersRouter from "./users.js";
import departmentsRouter from "./departments.js";
import scientificDirectionsRouter from "./scientific-directions.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/submissions", submissionsRouter);
router.use("/reviews", reviewsRouter);
router.use("/users", usersRouter);
router.use("/departments", departmentsRouter);
router.use("/scientific-directions", scientificDirectionsRouter);
router.use("/admin", adminRouter);

export default router;
