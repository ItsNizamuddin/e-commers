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

export const orderRoutes = router;
export default router;
