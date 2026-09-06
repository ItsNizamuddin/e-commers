import { Router } from "express";
import { reviewController } from "../controllers/review.controller.js";
import { validate } from "../../../middleware/validate.js";
import { asyncHandler } from "../../../utils/async-handler.js";
import { requireAuth, optionalAuth } from "../../auth/auth.middleware.js";
import {
    productIdParamsSchema,
    reviewIdParamsSchema,
    createReviewSchema,
    updateReviewSchema,
    reviewQuerySchema,
} from "../validation/review.validation.js";

const router = Router();

// Sub-resource routes on /reviews/product/:productId (also mounted under /products/:productId/reviews)
router.get(
    "/product/:productId",
    optionalAuth,
    validate(productIdParamsSchema, "params"),
    validate(reviewQuerySchema, "query"),
    asyncHandler(reviewController.getProductReviews)
);

router.post(
    "/product/:productId",
    requireAuth,
    validate(productIdParamsSchema, "params"),
    validate(createReviewSchema, "body"),
    asyncHandler(reviewController.createReview)
);

// Individual review operations
router.patch(
    "/:id",
    requireAuth,
    validate(reviewIdParamsSchema, "params"),
    validate(updateReviewSchema, "body"),
    asyncHandler(reviewController.updateReview)
);

router.delete(
    "/:id",
    requireAuth,
    validate(reviewIdParamsSchema, "params"),
    asyncHandler(reviewController.deleteReview)
);

router.post(
    "/:id/vote",
    requireAuth,
    validate(reviewIdParamsSchema, "params"),
    asyncHandler(reviewController.toggleHelpfulVote)
);

export const reviewRoutes = router;
export default router;
