import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import categoryRoutes from "./modules/categories/category.routes.js";
import productRoutes from "./modules/products/product.routes.js";
import { reservationRouter } from "./modules/inventory/inventory.routes.js";
import { cartRoutes } from "./modules/cart/index.js";
import { checkoutRoutes } from "./modules/checkout/index.js";
import { paymentRoutes } from "./modules/payments/index.js";
import { orderRoutes } from "./modules/orders/index.js";
import { reviewRoutes } from "./modules/reviews/index.js";
import { wishlistRoutes } from "./modules/wishlist/index.js";
import { searchRoutes } from "./modules/search/index.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/reservations", reservationRouter);
router.use("/cart", cartRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/payments", paymentRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/search", searchRoutes);

export default router;