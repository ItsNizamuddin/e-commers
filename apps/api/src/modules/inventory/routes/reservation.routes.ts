import { Router } from "express";
import { optionalAuth } from "../../auth/auth.middleware.js";
import { validate } from "../../../middleware/validate.js";
import { reservationController } from "../controllers/reservation.controller.js";
import {
    createReservationSchema,
    reservationIdParamSchema,
} from "../validation/reservation.validation.js";

export const reservationRouter = Router();

reservationRouter.post(
    "/",
    optionalAuth,
    validate(createReservationSchema, "body"),
    reservationController.createReservation
);

reservationRouter.post(
    "/:id/release",
    optionalAuth,
    validate(reservationIdParamSchema, "params"),
    reservationController.releaseReservation
);

reservationRouter.post(
    "/:id/commit",
    optionalAuth,
    validate(reservationIdParamSchema, "params"),
    reservationController.commitReservation
);
