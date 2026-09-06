import { Router } from "express";
import { wishlistController } from "../controllers/wishlist.controller.js";
import { validate } from "../../../middleware/validate.js";
import { asyncHandler } from "../../../utils/async-handler.js";
import { requireAuth } from "../../auth/auth.middleware.js";
import {
    getWishlistQuerySchema,
    addToWishlistSchema,
    wishlistVariantParamSchema,
    moveWishlistItemToCartSchema,
} from "../validation/wishlist.validation.js";

const router = Router();

// All wishlist endpoints require authentication
router.use(requireAuth);

router.get(
    "/",
    validate(getWishlistQuerySchema, "query"),
    asyncHandler(wishlistController.getWishlist)
);

router.post(
    "/items",
    validate(addToWishlistSchema, "body"),
    asyncHandler(wishlistController.addItem)
);

router.delete(
    "/items/:variantId",
    validate(wishlistVariantParamSchema, "params"),
    asyncHandler(wishlistController.removeItem)
);

router.post(
    "/items/:variantId/move-to-cart",
    validate(wishlistVariantParamSchema, "params"),
    validate(moveWishlistItemToCartSchema, "body"),
    asyncHandler(wishlistController.moveItemToCart)
);

router.delete(
    "/",
    asyncHandler(wishlistController.clearWishlist)
);

export const wishlistRoutes = router;
