import { Router } from "express";
import { optionalAuth, requireAuth } from "../../auth/auth.middleware.js";
import { cartController } from "../controllers/cart.controller.js";

const router = Router();

// Apply optionalAuth to all cart routes so authenticated users are recognized automatically
router.use(optionalAuth);

// Read active cart
router.get("/", cartController.getCart);

// Clear entire cart
router.delete("/", cartController.clearCart);

// Merge guest cart into customer cart (Authenticated customer only)
router.post("/merge", requireAuth, cartController.mergeCart);

// Add item to cart
router.post("/items", cartController.addItem);

// Update item quantity
router.patch("/items/:variantId", cartController.updateItemQuantity);

// Remove item from cart
router.delete("/items/:variantId", cartController.removeItem);

export const cartRoutes = router;
