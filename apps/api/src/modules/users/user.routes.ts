import { Router } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { getUserById } from "./user.controller.js";

const router = Router();

router.get(
    "/:id",
    asyncHandler(getUserById),
);

export default router;