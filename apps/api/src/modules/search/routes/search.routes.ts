import { Router } from "express";
import { searchController } from "../controllers/search.controller.js";
import { validate } from "../../../middleware/validate.js";
import { asyncHandler } from "../../../utils/async-handler.js";
import { searchQuerySchema } from "../validation/search.validation.js";

const router = Router();

router.get(
    "/",
    validate(searchQuerySchema, "query"),
    asyncHandler(searchController.search)
);

export const searchRoutes = router;
