import { Router } from "express";
import { queueJobController } from "./queue-job.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/authorize.middleware.js";

const adminJobsRouter = Router();

// Protect all job inspection routes for SUPER_ADMIN & ADMIN
adminJobsRouter.use(requireAuth);
adminJobsRouter.use(requireRole("SUPER_ADMIN", "ADMIN"));

adminJobsRouter.get("/", queueJobController.listJobs.bind(queueJobController));
adminJobsRouter.get("/:jobId", queueJobController.getJob.bind(queueJobController));

export { adminJobsRouter };
