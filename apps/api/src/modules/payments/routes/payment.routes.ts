import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { validate } from "../../../middleware/validate.js";
import {
    createPaymentIntentSchema,
    paymentParamsSchema,
} from "../validation/payment.validation.js";
import { cartIdentityMiddleware } from "../../cart/middleware/cart-identity.middleware.js";

import { optionalAuth } from "../../auth/auth.middleware.js";

const router = Router();

// Apply optionalAuth so authenticated users are recognized automatically
router.use(optionalAuth);

// Public Webhook (Secured by HMAC / Gateway Signature)
router.post("/webhook", paymentController.handleWebhook);

// Intent creation (Authenticated user or Guest session) - supports both /intent and /intents
router.post(
    ["/intent", "/intents"],
    cartIdentityMiddleware,
    validate(createPaymentIntentSchema, "body"),
    paymentController.createIntent
);

// Payment details lookup
router.get(
    "/:id",
    cartIdentityMiddleware,
    validate(paymentParamsSchema, "params"),
    paymentController.getPaymentById
);

export const paymentRoutes = router;
export default router;
