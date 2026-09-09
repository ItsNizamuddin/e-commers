import { Router } from "express";
import { Permissions } from "@ecommers/types";
import { locationController } from "./location.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requirePermission } from "../../middleware/authorize.middleware.js";
import { validate } from "../../middleware/validate.js";
import {
    createLocationSchema,
    updateLocationSchema,
    checkPincodeSchema,
} from "./location.validation.js";

export const locationRouter = Router();
export const adminLocationRouter = Router();

/* -------------------------------------------------------------------------- */
/* Public Location Endpoints                                                  */
/* -------------------------------------------------------------------------- */
locationRouter.get("/", locationController.listLocations);
locationRouter.post("/check-pincode", validate(checkPincodeSchema, "body"), locationController.checkPincode);
locationRouter.get("/:idOrCode", locationController.getLocation);

/* -------------------------------------------------------------------------- */
/* Admin Location Endpoints                                                   */
/* -------------------------------------------------------------------------- */
adminLocationRouter.use(requireAuth);

adminLocationRouter.get(
    "/",
    requirePermission(Permissions.LOCATION_READ),
    locationController.adminListLocations
);

adminLocationRouter.post(
    "/",
    requirePermission(Permissions.LOCATION_CREATE),
    validate(createLocationSchema, "body"),
    locationController.createLocation
);

adminLocationRouter.patch(
    "/:id",
    requirePermission(Permissions.LOCATION_UPDATE),
    validate(updateLocationSchema, "body"),
    locationController.updateLocation
);

adminLocationRouter.delete(
    "/:id",
    requirePermission(Permissions.LOCATION_DELETE),
    locationController.deleteLocation
);

adminLocationRouter.post(
    "/bulk-upload",
    requirePermission(Permissions.LOCATION_CREATE),
    locationController.bulkUploadLocations
);
