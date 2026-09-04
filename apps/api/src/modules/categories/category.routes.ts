import { Router } from "express";
import { categoryController } from "./category.controller.js";
import { authenticate, optionalAuth } from "../auth/auth.middleware.js";
import { requirePermission } from "../../middleware/authorize.middleware.js";
import { validate } from "../../middleware/validate.js";
import { createCategorySchema, updateCategorySchema, categoryQuerySchema } from "./category.validation.js";

const router = Router();

router.post(
    "/",
    authenticate,
    requirePermission("category.create"),
    validate(createCategorySchema, "body"),
    categoryController.createCategory
);

router.get(
    "/",
    optionalAuth,
    validate(categoryQuerySchema, "query"),
    categoryController.getCategories
);

router.get(
    "/slug/:slug",
    optionalAuth,
    categoryController.getCategoryBySlug
);

router.get(
    "/:id",
    optionalAuth,
    categoryController.getCategoryById
);

router.patch(
    "/:id",
    authenticate,
    requirePermission("category.update"),
    validate(updateCategorySchema, "body"),
    categoryController.updateCategory
);

router.delete(
    "/:id",
    authenticate,
    requirePermission("category.delete"),
    categoryController.deleteCategory
);

export default router;
