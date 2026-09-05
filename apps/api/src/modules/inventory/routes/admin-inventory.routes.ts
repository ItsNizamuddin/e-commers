import { Router } from "express";
import { Permissions } from "@shopsphere/types";
import { requireAuth } from "../../auth/auth.middleware.js";
import { requirePermission } from "../../../middleware/authorize.middleware.js";
import { validate } from "../../../middleware/validate.js";
import { adminInventoryController } from "../controllers/admin-inventory.controller.js";
import { stockMovementController } from "../controllers/stock-movement.controller.js";
import {
    inventoryQuerySchema,
    inventoryIdParamSchema,
    updateThresholdsSchema,
} from "../validation/inventory.validation.js";
import {
    adjustInventorySchema,
    movementsQuerySchema,
} from "../validation/stock-movement.validation.js";

export const adminInventoryRouter = Router();

// List inventory records with filtering & pagination
adminInventoryRouter.get(
    "/",
    requireAuth,
    requirePermission(Permissions.INVENTORY_READ),
    validate(inventoryQuerySchema, "query"),
    adminInventoryController.listInventory
);

// Query immutable stock movement ledger
adminInventoryRouter.get(
    "/movements",
    requireAuth,
    requirePermission(Permissions.INVENTORY_READ),
    validate(movementsQuerySchema, "query"),
    stockMovementController.listMovements
);

// Single movement record detail
adminInventoryRouter.get(
    "/movements/:id",
    requireAuth,
    requirePermission(Permissions.INVENTORY_READ),
    validate(inventoryIdParamSchema, "params"),
    stockMovementController.getMovementById
);

// Adjust inventory stock count (Requires INVENTORY_ADJUST)
adminInventoryRouter.post(
    "/adjust",
    requireAuth,
    requirePermission(Permissions.INVENTORY_ADJUST),
    validate(adjustInventorySchema, "body"),
    adminInventoryController.adjustInventory
);

// Get detailed inventory record by ID
adminInventoryRouter.get(
    "/:id",
    requireAuth,
    requirePermission(Permissions.INVENTORY_READ),
    validate(inventoryIdParamSchema, "params"),
    adminInventoryController.getInventoryById
);

// Update inventory thresholds with OCC (Requires INVENTORY_UPDATE)
adminInventoryRouter.patch(
    "/:id/thresholds",
    requireAuth,
    requirePermission(Permissions.INVENTORY_UPDATE),
    validate(inventoryIdParamSchema, "params"),
    validate(updateThresholdsSchema, "body"),
    adminInventoryController.updateThresholds
);
