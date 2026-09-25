import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { getWallet, getTransactions, createTopUpIntent } from "./wallet.controller.js";
import { topUpIntentSchema } from "./wallet.validation.js";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(getWallet));
router.get("/transactions", asyncHandler(getTransactions));
router.post("/topup/intent", validate(topUpIntentSchema, "body"), asyncHandler(createTopUpIntent));

export default router;
