import { Document, Types } from "mongoose";
import { ReservationStatus } from "@shopsphere/types";

export interface IReservationItem {
    variantId: Types.ObjectId;
    warehouseId: Types.ObjectId;
    quantity: number;
    reservedPhysical: number;
    backordered: number;
}

export interface IReservation {
    _id: Types.ObjectId;
    checkoutId: string;
    idempotencyKey?: string;
    status: ReservationStatus;
    items: IReservationItem[];
    expiresAt: Date;
    confirmedAt?: Date;
    releasedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReservationDocument extends IReservation, Document<Types.ObjectId> {}
