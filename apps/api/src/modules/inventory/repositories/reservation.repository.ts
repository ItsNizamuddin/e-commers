import { ClientSession, Types } from "mongoose";
import { ReservationModel } from "../models/reservation.model.js";
import { ReservationDocument, IReservationItem } from "../types/reservation.types.js";

export class ReservationRepository {
    async findById(
        id: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<ReservationDocument | null> {
        return await ReservationModel.findById(id).session(session ?? null).exec();
    }

    async findByCheckoutId(
        checkoutId: string,
        session?: ClientSession
    ): Promise<ReservationDocument | null> {
        return await ReservationModel.findOne({ checkoutId })
            .session(session ?? null)
            .exec();
    }

    async findByIdempotencyKey(
        key: string,
        session?: ClientSession
    ): Promise<ReservationDocument | null> {
        return await ReservationModel.findOne({ idempotencyKey: key })
            .session(session ?? null)
            .exec();
    }

    async create(
        data: {
            checkoutId: string;
            idempotencyKey?: string;
            items: IReservationItem[];
            expiresAt: Date;
        },
        session?: ClientSession
    ): Promise<ReservationDocument> {
        const reservation = new ReservationModel({
            checkoutId: data.checkoutId,
            ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
            status: "PENDING",
            items: data.items,
            expiresAt: data.expiresAt,
        });

        await reservation.save(session ? { session } : undefined);
        return reservation;
    }

    async findExpiredPending(
        limit = 50,
        session?: ClientSession
    ): Promise<ReservationDocument[]> {
        return await ReservationModel.find({
            status: "PENDING",
            expiresAt: { $lt: new Date() },
        })
            .limit(limit)
            .session(session ?? null)
            .exec();
    }
}

export const reservationRepository = new ReservationRepository();
