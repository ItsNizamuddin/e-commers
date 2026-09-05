import { Request, Response, NextFunction } from "express";
import { resolveActor } from "../../../utils/audit.js";
import { reservationService, ReservationService } from "../services/reservation.service.js";

export class ReservationController {
    constructor(private readonly service: ReservationService = reservationService) {}

    createReservation = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const actor = await resolveActor(req.user?.id);
            const idempotencyKey =
                (req.headers["x-idempotency-key"] as string) || req.body.idempotencyKey;

            const reservation = await this.service.reserveStock(
                {
                    ...req.body,
                    idempotencyKey,
                },
                actor
            );

            res.status(201).json({
                success: true,
                message: "Stock reserved successfully",
                data: reservation,
            });
        } catch (error) {
            next(error);
        }
    };

    releaseReservation = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const actor = await resolveActor(req.user?.id);
            const id = req.params.id as string;
            const reservation = await this.service.releaseReservation(
                id,
                actor
            );
            res.status(200).json({
                success: true,
                message: "Reservation released successfully",
                data: reservation,
            });
        } catch (error) {
            next(error);
        }
    };

    commitReservation = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const actor = await resolveActor(req.user?.id);
            const id = req.params.id as string;
            const reservation = await this.service.commitReservation(
                id,
                actor
            );
            res.status(200).json({
                success: true,
                message: "Reservation fulfilled and committed successfully",
                data: reservation,
            });
        } catch (error) {
            next(error);
        }
    };
}

export const reservationController = new ReservationController();
