import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getUserById } from "./user.controller.js";
import { validate } from "../../middleware/validate.js";
import { userIdParamsSchema } from "./user.validation.js";

const router = Router();

router.get(
    "/:id",
    validate(userIdParamsSchema, "params"),
    asyncHandler(getUserById),
);

export default router;