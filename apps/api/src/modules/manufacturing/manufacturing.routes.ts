import { Router } from "express";
import { manufacturingController } from "./manufacturing.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
    createRawMaterialSchema,
    updateRawMaterialSchema,
    recordPurchaseIntakeSchema,
    createRecipeSchema,
    updateRecipeSchema,
    executeProductionSchema,
    reverseProductionSchema,
    createRepackagingRunSchema,
    reverseRepackagingRunSchema,
    syncVariantCostSchema,
} from "./manufacturing.validation.js";

export const adminManufacturingRouter = Router();
adminManufacturingRouter.use(requireAuth);

// Raw Materials Master
adminManufacturingRouter.get(
    "/raw-materials",
    manufacturingController.listRawMaterials.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/raw-materials",
    validate(createRawMaterialSchema, "body"),
    manufacturingController.createRawMaterial.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/raw-materials/:id",
    manufacturingController.getRawMaterialById.bind(manufacturingController)
);
adminManufacturingRouter.patch(
    "/raw-materials/:id",
    validate(updateRawMaterialSchema, "body"),
    manufacturingController.updateRawMaterial.bind(manufacturingController)
);

// Purchases & Inward Intakes
adminManufacturingRouter.post(
    "/purchases",
    validate(recordPurchaseIntakeSchema, "body"),
    manufacturingController.recordPurchaseIntake.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/intakes",
    validate(recordPurchaseIntakeSchema, "body"),
    manufacturingController.recordPurchaseIntake.bind(manufacturingController)
);

// Lots & Stock Movement Ledger
adminManufacturingRouter.get(
    "/lots",
    manufacturingController.listLots.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/ledger",
    manufacturingController.listLedger.bind(manufacturingController)
);

// Recipes (Bill of Materials)
adminManufacturingRouter.get(
    "/recipes",
    manufacturingController.listRecipes.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/recipes",
    validate(createRecipeSchema, "body"),
    manufacturingController.createRecipe.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/recipes/:id",
    manufacturingController.getRecipeById.bind(manufacturingController)
);
adminManufacturingRouter.patch(
    "/recipes/:id",
    validate(updateRecipeSchema, "body"),
    manufacturingController.updateRecipe.bind(manufacturingController)
);

// Feasibility Pre-flight & Production Runs
adminManufacturingRouter.get(
    "/feasibility",
    manufacturingController.checkFeasibility.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/production-runs",
    validate(executeProductionSchema, "body"),
    manufacturingController.executeProductionRun.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/production-runs/:id/reverse",
    validate(reverseProductionSchema, "body"),
    manufacturingController.reverseProductionRun.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/production-runs",
    manufacturingController.listProductionRuns.bind(manufacturingController)
);

// Sync Variant Cost
adminManufacturingRouter.post(
    "/sync-variant-cost",
    validate(syncVariantCostSchema, "body"),
    manufacturingController.syncVariantCost.bind(manufacturingController)
);

// Stock Repackaging (Bulk to Retail transformation)
adminManufacturingRouter.get(
    "/repackaging",
    manufacturingController.listRepackagingRuns.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/repackaging",
    validate(createRepackagingRunSchema, "body"),
    manufacturingController.createRepackagingRun.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/repackaging/:id/reverse",
    validate(reverseRepackagingRunSchema, "body"),
    manufacturingController.reverseRepackagingRun.bind(manufacturingController)
);
