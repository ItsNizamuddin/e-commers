import { ClientSession, Types } from "mongoose";
import {
    AuditActor,
    ReservationResponse,
    CreateReservationInput,
} from "@shopsphere/types";
import { AppError } from "../../../utils/app-error.js";
import { withTransaction } from "../../../database/transaction.js";
import { DEFAULT_WAREHOUSE_ID } from "../../../database/schemas/warehouse.schema.js";
import { ReservationDocument, IReservationItem } from "../types/reservation.types.js";
import {
    reservationRepository,
    ReservationRepository,
} from "../repositories/reservation.repository.js";
import {
    inventoryRepository,
    InventoryRepository,
} from "../repositories/inventory.repository.js";

export class ReservationService {
    constructor(
        private readonly resRepo: ReservationRepository = reservationRepository,
        private readonly invRepo: InventoryRepository = inventoryRepository
    ) {}

    mapReservationToResponse(doc: ReservationDocument): ReservationResponse {
        return {
            id: doc._id.toString(),
            checkoutId: doc.checkoutId,
            ...(doc.idempotencyKey ? { idempotencyKey: doc.idempotencyKey } : {}),
            status: doc.status,
            items: doc.items.map((i) => ({
                variantId: i.variantId.toString(),
                warehouseId: i.warehouseId.toString(),
                quantity: i.quantity,
                reservedPhysical: i.reservedPhysical,
                backordered: i.backordered,
            })),
            expiresAt: doc.expiresAt.toISOString(),
            ...(doc.confirmedAt ? { confirmedAt: doc.confirmedAt.toISOString() } : {}),
            ...(doc.releasedAt ? { releasedAt: doc.releasedAt.toISOString() } : {}),
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    async reserveStock(
        input: CreateReservationInput,
        actor?: AuditActor,
        externalSession?: ClientSession
    ): Promise<ReservationResponse> {
        // 1. Idempotency Check: Return existing reservation if already executed
        if (input.idempotencyKey) {
            const existing = await this.resRepo.findByIdempotencyKey(input.idempotencyKey, externalSession);
            if (existing) {
                return this.mapReservationToResponse(existing);
            }
        }

        const existingByCheckout = await this.resRepo.findByCheckoutId(input.checkoutId, externalSession);
        if (existingByCheckout) {
            return this.mapReservationToResponse(existingByCheckout);
        }

        const execute = async (session: ClientSession): Promise<ReservationResponse> => {
            const reservationItems: IReservationItem[] = [];
            const ttlMinutes = input.ttlMinutes && input.ttlMinutes > 0 ? input.ttlMinutes : 15;
            const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

            for (const item of input.items) {
                const variantId = new Types.ObjectId(item.variantId);
                const warehouseId = item.warehouseId
                    ? new Types.ObjectId(item.warehouseId)
                    : DEFAULT_WAREHOUSE_ID;

                let inv = await this.invRepo.findByVariantAndWarehouse(variantId, warehouseId, session);

                if (!inv) {
                    throw new AppError(
                        `Inventory record not found for variant ${item.variantId}`,
                        404,
                        "INVENTORY_NOT_FOUND"
                    );
                }

                const result = await this.invRepo.atomicReserveWithMovement(
                    {
                        inventoryId: inv._id,
                        quantity: item.quantity,
                        referenceId: input.checkoutId,
                        ...(actor ? { actor } : {}),
                    },
                    session
                );

                reservationItems.push({
                    variantId,
                    warehouseId,
                    quantity: item.quantity,
                    reservedPhysical: result.reservedPhysical,
                    backordered: result.backordered,
                });
            }

            const reservation = await this.resRepo.create(
                {
                    checkoutId: input.checkoutId,
                    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
                    items: reservationItems,
                    expiresAt,
                },
                session
            );

            return this.mapReservationToResponse(reservation);
        };

        if (externalSession) {
            return await execute(externalSession);
        }
        return await withTransaction(execute);
    }

    async releaseReservation(
        reservationIdOrCheckoutId: string,
        actor?: AuditActor,
        externalSession?: ClientSession
    ): Promise<ReservationResponse> {
        const execute = async (session: ClientSession): Promise<ReservationResponse> => {
            let reservation: ReservationDocument | null = null;
            if (Types.ObjectId.isValid(reservationIdOrCheckoutId)) {
                reservation = await this.resRepo.findById(reservationIdOrCheckoutId, session);
            }
            if (!reservation) {
                reservation = await this.resRepo.findByCheckoutId(reservationIdOrCheckoutId, session);
            }

            if (!reservation) {
                throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
            }

            if (reservation.status !== "PENDING") {
                return this.mapReservationToResponse(reservation);
            }

            for (const item of reservation.items) {
                const inv = await this.invRepo.findByVariantAndWarehouse(
                    item.variantId,
                    item.warehouseId,
                    session
                );

                if (inv) {
                    await this.invRepo.atomicReleaseWithMovement(
                        {
                            inventoryId: inv._id,
                            reservedPhysical: item.reservedPhysical,
                            backordered: item.backordered,
                            referenceType: "CHECKOUT",
                            referenceId: reservation.checkoutId,
                            reason: "Checkout reservation released or canceled",
                            ...(actor ? { actor } : {}),
                        },
                        session
                    );
                }
            }

            reservation.status = "RELEASED";
            reservation.releasedAt = new Date();
            await reservation.save({ session });

            return this.mapReservationToResponse(reservation);
        };

        if (externalSession) {
            return await execute(externalSession);
        }
        return await withTransaction(execute);
    }

    async commitReservation(
        reservationIdOrCheckoutId: string,
        actor?: AuditActor,
        externalSession?: ClientSession
    ): Promise<ReservationResponse> {
        const execute = async (session: ClientSession): Promise<ReservationResponse> => {
            let reservation: ReservationDocument | null = null;
            if (Types.ObjectId.isValid(reservationIdOrCheckoutId)) {
                reservation = await this.resRepo.findById(reservationIdOrCheckoutId, session);
            }
            if (!reservation) {
                reservation = await this.resRepo.findByCheckoutId(reservationIdOrCheckoutId, session);
            }

            if (!reservation) {
                throw new AppError("Reservation not found", 404, "RESERVATION_NOT_FOUND");
            }

            if (reservation.status !== "PENDING") {
                throw new AppError(
                    `Cannot commit reservation in '${reservation.status}' state`,
                    400,
                    "INVALID_RESERVATION_STATE"
                );
            }

            for (const item of reservation.items) {
                if (item.reservedPhysical > 0) {
                    const inv = await this.invRepo.findByVariantAndWarehouse(
                        item.variantId,
                        item.warehouseId,
                        session
                    );

                    if (!inv) {
                        throw new AppError(
                            `Inventory not found during fulfillment for variant ${item.variantId.toString()}`,
                            404,
                            "INVENTORY_NOT_FOUND"
                        );
                    }

                    await this.invRepo.atomicCommitWithMovement(
                        {
                            inventoryId: inv._id,
                            reservedPhysical: item.reservedPhysical,
                            referenceId: reservation.checkoutId,
                            ...(actor ? { actor } : {}),
                        },
                        session
                    );
                }
            }

            reservation.status = "CONFIRMED";
            reservation.confirmedAt = new Date();
            await reservation.save({ session });

            return this.mapReservationToResponse(reservation);
        };

        if (externalSession) {
            return await execute(externalSession);
        }
        return await withTransaction(execute);
    }

    async expireStaleReservations(batchSize = 50): Promise<number> {
        const expired = await this.resRepo.findExpiredPending(batchSize);
        let count = 0;

        for (const res of expired) {
            await withTransaction(async (session) => {
                for (const item of res.items) {
                    const inv = await this.invRepo.findByVariantAndWarehouse(
                        item.variantId,
                        item.warehouseId,
                        session
                    );

                    if (inv) {
                        await this.invRepo.atomicReleaseWithMovement(
                            {
                                inventoryId: inv._id,
                                reservedPhysical: item.reservedPhysical,
                                backordered: item.backordered,
                                referenceType: "EXPIRATION_WORKER",
                                referenceId: res.checkoutId,
                                reason: "TTL expired: automatic release by worker",
                            },
                            session
                        );
                    }
                }

                res.status = "EXPIRED";
                res.releasedAt = new Date();
                await res.save({ session });
            });
            count++;
        }

        return count;
    }
}

export const reservationService = new ReservationService();
