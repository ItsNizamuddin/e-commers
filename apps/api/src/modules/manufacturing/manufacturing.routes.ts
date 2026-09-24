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
    createPackagingSpecificationSchema,
    updatePackagingSpecificationSchema,
    syncPackagingMatrixSchema,
    executeLotRecallSchema,
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
    ["/feasibility", "/runs/check-feasibility", "/production-runs/check-feasibility"],
    manufacturingController.checkFeasibility.bind(manufacturingController)
);
adminManufacturingRouter.post(
    ["/production-runs", "/runs"],
    idempotency(),
    validate(executeProductionSchema, "body"),
    manufacturingController.executeProductionRun.bind(manufacturingController)
);
adminManufacturingRouter.post(
    ["/production-runs/:id/reverse", "/runs/:id/reverse"],
    idempotency(),
    validate(reverseProductionSchema, "body"),
    manufacturingController.reverseProductionRun.bind(manufacturingController)
);
adminManufacturingRouter.get(
    ["/production-runs", "/runs"],
    manufacturingController.listProductionRuns.bind(manufacturingController)
);
adminManufacturingRouter.get(
    ["/production-runs/:id", "/runs/:id"],
    manufacturingController.getProductionRunById.bind(manufacturingController)
);
adminManufacturingRouter.post(
    ["/production-runs/:id/complete", "/runs/:id/complete"],
    manufacturingController.completeProductionRun.bind(manufacturingController)
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

// Stock Packaging & Repackaging (Bulk to Retail transformation)
adminManufacturingRouter.get(
    ["/repackaging", "/packaging-runs"],
    manufacturingController.listPackagingRuns.bind(manufacturingController)
);
adminManufacturingRouter.post(
    ["/repackaging", "/packaging-runs"],
    idempotency(),
    validate(createRepackagingRunSchema, "body"),
    manufacturingController.createPackagingRun.bind(manufacturingController)
);
adminManufacturingRouter.get(
    ["/repackaging/:id", "/packaging-runs/:id"],
    manufacturingController.getPackagingRunById.bind(manufacturingController)
);
adminManufacturingRouter.post(
    ["/repackaging/:id/complete", "/packaging-runs/:id/complete"],
    manufacturingController.completePackagingRun.bind(manufacturingController)
);
adminManufacturingRouter.post(
    ["/repackaging/:id/reverse", "/packaging-runs/:id/reverse"],
    idempotency(),
    validate(reverseRepackagingRunSchema, "body"),
    manufacturingController.reversePackagingRun.bind(manufacturingController)
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

// Packaging Specifications (BOM for Finished Packs)
adminManufacturingRouter.get(
    "/packaging-specifications",
    manufacturingController.listPackagingSpecifications.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/packaging-specifications",
    validate(createPackagingSpecificationSchema, "body"),
    manufacturingController.createPackagingSpecification.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/packaging-specifications/:id",
    manufacturingController.getPackagingSpecificationById.bind(manufacturingController)
);
adminManufacturingRouter.patch(
    "/packaging-specifications/:id",
    validate(updatePackagingSpecificationSchema, "body"),
    manufacturingController.updatePackagingSpecification.bind(manufacturingController)
);
adminManufacturingRouter.delete(
    "/packaging-specifications/:id",
    manufacturingController.deletePackagingSpecification.bind(manufacturingController)
);

// Packaging & Pricing Matrix (Hub)
adminManufacturingRouter.get(
    "/products/:id/packaging-matrix",
    manufacturingController.getPackagingMatrix.bind(manufacturingController)
);
adminManufacturingRouter.post(
    "/products/:id/packaging-matrix/sync",
    idempotency(),
    validate(syncPackagingMatrixSchema, "body"),
    manufacturingController.syncPackagingMatrix.bind(manufacturingController)
);

// Two-Way Lot Traceability & Rapid Recall
adminManufacturingRouter.get(
    "/traceability/:identifier",
    manufacturingController.getLotTraceability.bind(manufacturingController)
);
adminManufacturingRouter.get(
    "/traceability/:identifier/export",
    manufacturingController.exportRecallReport.bind(manufacturingController)
);
adminManufacturingRouter.post(
    ["/lots/:lotId/recall", "/traceability/:lotId/recall"],
    idempotency(),
    validate(executeLotRecallSchema, "body"),
    manufacturingController.executeLotRecall.bind(manufacturingController)
);

export const publicManufacturingRouter = Router();

// Public Batch Verification via opaque token
publicManufacturingRouter.get(
    ["/verify/:publicToken", "/public/verify/:publicToken"],
    manufacturingController.getPublicBatchVerification.bind(manufacturingController)
);

