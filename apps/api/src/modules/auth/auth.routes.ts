import { Router } from "express";

import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
    register,
    loginCustomer,
    loginAdmin,
    refreshCustomer,
    refreshAdmin,
    logoutCustomer,
    logoutAdmin,
} from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.validation.js";

const router = Router();

// Storefront Customer Endpoints
router.post(
    "/register",
    validate(registerSchema, "body"),
    asyncHandler(register),
);

router.post(
    "/login",
    validate(loginSchema, "body"),
    asyncHandler(loginCustomer),
);

router.post(
    "/refresh",
    asyncHandler(refreshCustomer),
);

router.post(
    "/logout",
    asyncHandler(logoutCustomer),
);

// Admin & Staff Portal Endpoints
router.post(
    "/admin/login",
    validate(loginSchema, "body"),
    asyncHandler(loginAdmin),
);

router.post(
    "/admin/refresh",
    asyncHandler(refreshAdmin),
);

router.post(
    "/admin/logout",
    asyncHandler(logoutAdmin),
);

export default router;