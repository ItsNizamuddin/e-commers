import { Router } from "express";
import { seoController } from "./seo.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const seoRouter = Router();

// Public / Storefront SEO lookup
seoRouter.get("/:entityType/:entityId", seoController.getSeo.bind(seoController));

// Admin SEO Operations
export const adminSeoRouter = Router();
adminSeoRouter.use(requireAuth);

adminSeoRouter.get("/export", seoController.exportCsv.bind(seoController));
adminSeoRouter.post("/import", seoController.importCsv.bind(seoController));
adminSeoRouter.post("/auto-fill", seoController.autoFillLocations.bind(seoController));
adminSeoRouter.get("/entities", seoController.listEntities.bind(seoController));
adminSeoRouter.get("/metadata-rows", seoController.getMetadataRows.bind(seoController));
adminSeoRouter.patch("/row/:entityType/:entityId/:locationKey", seoController.updateIndividualRow.bind(seoController));
adminSeoRouter.get("/:entityType/:entityId", seoController.getSeo.bind(seoController));
adminSeoRouter.put("/:entityType/:entityId", seoController.upsertSeo.bind(seoController));
