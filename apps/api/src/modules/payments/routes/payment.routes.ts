import { Router } from "express";
import { paymentController } from "../controllers/payment.controller.js";
import { validate } from "../../../middleware/validate.js";
import {
    createPaymentIntentSchema,
    paymentParamsSchema,
} from "../validation/payment.validation.js";
import { cartIdentityMiddleware } from "../../cart/middleware/cart-identity.middleware.js";

const router = Router();

// Public Webhook (Secured by HMAC / Gateway Signature)
router.post("/webhook", paymentController.handleWebhook);

// Intent creation (Authenticated user or Guest session)
router.post(
    "/intent",
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
