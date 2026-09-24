import { Router } from "express";
import { orderController } from "../controllers/order.controller.js";
import { validate } from "../../../middleware/validate.js";
import { requireAuth, optionalAuth } from "../../auth/auth.middleware.js";
import { requireRole } from "../../../middleware/authorize.middleware.js";
import {
    orderParamsSchema,
    orderListQuerySchema,
    updateFulfillmentSchema,
    cancelOrderSchema,
    startPackingSchema,
    packingScanSchema,
    resetPackingSchema,
    shipOrderSchema,
} from "../validation/order.validation.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Customer Endpoints                                                         */
/* -------------------------------------------------------------------------- */

// Authenticated Customer Order History
router.get(
    ["/me", "/my-orders"],
    requireAuth,
    validate(orderListQuerySchema, "query"),
    orderController.getMyOrders
);

// Get Order Details (Customer or verified guest with token)
router.get(
    "/:id",
    optionalAuth,
    validate(orderParamsSchema, "params"),
    orderController.getOrderById
);

// Customer / Guest Order Cancellation
router.post(
    "/:id/cancel",
    optionalAuth,
    validate(orderParamsSchema, "params"),
    validate(cancelOrderSchema, "body"),
    orderController.cancelOrder
);

/* -------------------------------------------------------------------------- */
/* Admin Endpoints                                                            */
/* -------------------------------------------------------------------------- */

// List All Orders (Admin with filters & search)
router.get(
    "/admin/all",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderListQuerySchema, "query"),
    orderController.getAdminOrders
);

// Get Admin Order By ID
router.get(
    "/admin/:id",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    orderController.getAdminOrderById
);

// Update Fulfillment (Tracking, Status, Carrier)
router.patch(
    "/admin/:id/fulfillment",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    validate(updateFulfillmentSchema, "body"),
    orderController.updateFulfillment
);

// Admin Order Cancellation
router.post(
    "/admin/:id/cancel",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    validate(cancelOrderSchema, "body"),
    orderController.cancelOrder
);

/* -------------------------------------------------------------------------- */
/* Packing Bench Endpoints                                                    */
/* -------------------------------------------------------------------------- */

// Start / Initialize Packing Session
router.post(
    "/admin/:id/packing/start",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    validate(startPackingSchema, "body"),
    orderController.startPackingSession
);

// Barcode / QR Scan Verification
router.post(
    ["/admin/:id/packing/scan", "/admin/:id/verify-packing-scan"],
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    validate(packingScanSchema, "body"),
    orderController.verifyPackingScan
);

// Get Active Packing Session
router.get(
    "/admin/:id/packing",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    orderController.getActivePackingSession
);

// Reset Packing Session
router.post(
    "/admin/:id/packing/reset",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    validate(resetPackingSchema, "body"),
    orderController.resetPackingSession
);

// Ship Order with Packing Verification and Lot Revalidation Guard
router.post(
    "/admin/:id/ship",
    requireAuth,
    requireRole("ADMIN", "SUPER_ADMIN"),
    validate(orderParamsSchema, "params"),
    validate(shipOrderSchema, "body"),
    orderController.shipOrder
);

export const orderRoutes = router;
export default router;
