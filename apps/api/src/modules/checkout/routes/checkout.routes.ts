import { Router } from "express";
import { optionalAuth } from "../../auth/auth.middleware.js";
import { checkoutController } from "../controllers/checkout.controller.js";

const router = Router();

// Apply optionalAuth so authenticated users are recognized automatically
router.use(optionalAuth);

// Initiate checkout from active cart
router.post("/", checkoutController.initiateCheckout);

// Payment Gateway Webhook handler
router.post("/webhook", checkoutController.handlePaymentWebhook);

// Get checkout details by ID
router.get("/:id", checkoutController.getCheckoutById);

// Update shipping and billing addresses with OCC & recalculation
router.patch("/:id/addresses", checkoutController.updateAddresses);

// Customer explicitly cancels checkout (releases stock, unlocks cart)
router.post("/:id/cancel", checkoutController.cancelCheckout);

export const checkoutRoutes = router;
