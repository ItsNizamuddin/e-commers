import { Router } from "express";
import { manufacturingController } from "./manufacturing.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { idempotency } from "../../middlewares/idempotency.middleware.js";
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
    batchSyncVariantPricingSchema,
    autoGenerateVariantRecipesSchema,
    createVendorSchema,
    updateVendorSchema,
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
    "/raw-materials/check-code",
    manufacturingController.checkCodeAvailability.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/raw-materials/suggest-code",
    manufacturingController.suggestCode.bind(manufacturingController)
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

// Purchase Intakes
adminManufacturingRouter.post(
    "/purchases",
    idempotency(),
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
    idempotency(),
    validate(executeProductionSchema, "body"),
    manufacturingController.executeProductionRun.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/production-runs/:id/reverse",
    idempotency(),
    validate(reverseProductionSchema, "body"),
    manufacturingController.reverseProductionRun.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/production-runs",
    manufacturingController.listProductionRuns.bind(manufacturingController)
);

// Sync Variant Cost & Multi-Variant Pricing
adminManufacturingRouter.post(
    "/sync-variant-cost",
    validate(syncVariantCostSchema, "body"),
    manufacturingController.syncVariantCost.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/sync-variant-pricing-batch",
    validate(batchSyncVariantPricingSchema, "body"),
    manufacturingController.batchSyncVariantPricing.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/recipes/:id/auto-generate-variants",
    validate(autoGenerateVariantRecipesSchema, "body"),
    manufacturingController.autoGenerateVariantRecipes.bind(manufacturingController)
);

// Stock Repackaging (Bulk to Retail transformation)
adminManufacturingRouter.get(
    "/repackaging",
    manufacturingController.listRepackagingRuns.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/repackaging",
    idempotency(),
    validate(createRepackagingRunSchema, "body"),
    manufacturingController.createRepackagingRun.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/repackaging/:id/reverse",
    idempotency(),
    validate(reverseRepackagingRunSchema, "body"),
    manufacturingController.reverseRepackagingRun.bind(manufacturingController)
);

// Vendors & Suppliers Master
adminManufacturingRouter.get(
    "/vendors",
    manufacturingController.listVendors.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/vendors",
    validate(createVendorSchema, "body"),
    manufacturingController.createVendor.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/vendors/:id",
    manufacturingController.getVendorById.bind(manufacturingController)
);
adminManufacturingRouter.patch(
    "/vendors/:id",
    validate(updateVendorSchema, "body"),
    manufacturingController.updateVendor.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/vendors/:id/purchases",
    manufacturingController.getVendorPurchases.bind(manufacturingController)
);

