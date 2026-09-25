import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireRole } from "../../middleware/authorize.middleware.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import {
    updateWalletConfigSchema,
    adminWalletAdjustSchema,
    customerIdParamSchema,
} from "./admin-wallet.validation.js";
import {
    getWalletConfigHandler,
    updateWalletConfigHandler,
    adjustWalletBalanceHandler,
    getCustomerWalletHandler,
} from "./admin-wallet.controller.js";

const router = Router();

// Strictly enforce ADMIN & SUPER_ADMIN access across all admin wallet operations
router.use(requireAuth);
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/config", asyncHandler(getWalletConfigHandler));
router.put(
    "/config",
    validate(updateWalletConfigSchema, "body"),
    asyncHandler(updateWalletConfigHandler)
);

router.post(
    "/adjust",
    validate(adminWalletAdjustSchema, "body"),
    asyncHandler(adjustWalletBalanceHandler)
);

router.get(
    "/customer/:userId",
    validate(customerIdParamSchema, "params"),
    asyncHandler(getCustomerWalletHandler)
);

export default router;
