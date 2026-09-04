import { Router } from "express";
import { Permissions } from "@shopsphere/types";
import { productController } from "./product.controller.js";
import { authenticate, optionalAuth } from "../auth/auth.middleware.js";
import { requirePermission } from "../../middleware/authorize.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
    createProductSchema,
    updateProductSchema,
    productQuerySchema,
} from "./product.validation.js";

const router = Router();

router.post(
    "/",
    authenticate,
    requirePermission(Permissions.PRODUCT_CREATE),
    validate(createProductSchema, "body"),
    productController.createProduct
);

router.get(
    "/",
    optionalAuth,
    validate(productQuerySchema, "query"),
    productController.getProducts
);

router.get(
    "/slug/:slug",
    optionalAuth,
    productController.getProductBySlug
);

router.get(
    "/:id",
    optionalAuth,
    productController.getProductById
);

router.patch(
    "/:id",
    authenticate,
    requirePermission(Permissions.PRODUCT_UPDATE),
    validate(updateProductSchema, "body"),
    productController.updateProduct
);

router.patch(
    "/:id/publish",
    authenticate,
    requirePermission(Permissions.PRODUCT_PUBLISH),
    productController.publishProduct
);

router.delete(
    "/:id",
    authenticate,
    requirePermission(Permissions.PRODUCT_DELETE),
    productController.deleteProduct
);

export default router;
