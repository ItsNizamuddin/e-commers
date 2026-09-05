import { ClientSession, Types } from "mongoose";
import {
    AuditActor,
    StockMovementType,
    MovementReferenceType,
} from "@shopsphere/types";
import { AppError } from "../../../utils/app-error.js";
import { InventoryModel } from "../models/inventory.model.js";
import { InventoryDocument } from "../types/inventory.types.js";
import { StockMovementDocument } from "../types/stock-movement.types.js";
import { ReservationDocument, IReservationItem } from "../types/reservation.types.js";
import {
    stockMovementRepository,
    StockMovementRepository,
} from "./stock-movement.repository.js";
import {
    reservationRepository,
    ReservationRepository,
} from "./reservation.repository.js";

export interface AtomicReserveResult {
    inventory: InventoryDocument;
    movement: StockMovementDocument;
    reservedPhysical: number;
    backordered: number;
}

export class InventoryRepository {
    constructor(
        private readonly movementRepo: StockMovementRepository = stockMovementRepository,
        private readonly resRepo: ReservationRepository = reservationRepository
    ) {}

    /* -------------------------------------------------------------------------- */
    /* Read Operations                                                            */
    /* -------------------------------------------------------------------------- */

    async findById(id: string | Types.ObjectId, session?: ClientSession): Promise<InventoryDocument | null> {
        return await InventoryModel.findById(id).session(session ?? null).exec();
    }

    async findByVariantAndWarehouse(
        variantId: string | Types.ObjectId,
        warehouseId: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<InventoryDocument | null> {
        return await InventoryModel.findOne({
            variantId: new Types.ObjectId(variantId),
            warehouseId: new Types.ObjectId(warehouseId),
        })
            .session(session ?? null)
            .exec();
    }

    async findByVariant(
        variantId: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<InventoryDocument[]> {
        return await InventoryModel.find({
            variantId: new Types.ObjectId(variantId),
        })
            .session(session ?? null)
            .exec();
    }

    async findByProduct(
        productId: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<InventoryDocument[]> {
        return await InventoryModel.find({
            productId: new Types.ObjectId(productId),
        })
            .session(session ?? null)
            .exec();
    }

    async query(
        filter: {
            productId?: string | Types.ObjectId;
            variantId?: string | Types.ObjectId;
            warehouseId?: string | Types.ObjectId;
            lowStock?: boolean;
        },
        options: { page?: number; limit?: number } = {}
    ): Promise<{ items: InventoryDocument[]; total: number }> {
        const query: Record<string, unknown> = {};

        if (filter.productId) query.productId = new Types.ObjectId(filter.productId);
        if (filter.variantId) query.variantId = new Types.ObjectId(filter.variantId);
        if (filter.warehouseId) query.warehouseId = new Types.ObjectId(filter.warehouseId);
        if (filter.lowStock) {
            query.$expr = {
                $lte: [{ $subtract: ["$onHand", "$reserved"] }, "$reorderThreshold"],
            };
        }

        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            InventoryModel.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            InventoryModel.countDocuments(query).exec(),
        ]);

        return { items, total };
    }

    /* -------------------------------------------------------------------------- */
    /* Creation / Initialization                                                  */
    /* -------------------------------------------------------------------------- */

    async create(
        data: {
            productId: string | Types.ObjectId;
            variantId: string | Types.ObjectId;
            warehouseId: string | Types.ObjectId;
            onHand?: number;
            safetyStock?: number;
            reorderThreshold?: number;
            allowBackorder?: boolean;
            updatedBy?: AuditActor;
        },
        session?: ClientSession
    ): Promise<InventoryDocument> {
        const inventory = new InventoryModel({
            productId: new Types.ObjectId(data.productId),
            variantId: new Types.ObjectId(data.variantId),
            warehouseId: new Types.ObjectId(data.warehouseId),
            onHand: data.onHand ?? 0,
            reserved: 0,
            backordered: 0,
            safetyStock: data.safetyStock ?? 0,
            reorderThreshold: data.reorderThreshold ?? 10,
            allowBackorder: data.allowBackorder ?? false,
            version: 1,
            ...(data.updatedBy ? { updatedBy: data.updatedBy } : {}),
        });

        await inventory.save(session ? { session } : undefined);

        if (data.onHand && data.onHand > 0) {
            await this.movementRepo.create(
                {
                    inventoryId: inventory._id,
                    productId: inventory.productId,
                    variantId: inventory.variantId,
                    warehouseId: inventory.warehouseId,
                    type: "STOCK_RECEIPT",
                    quantityDelta: data.onHand,
                    previousOnHand: 0,
                    newOnHand: data.onHand,
                    previousReserved: 0,
                    newReserved: 0,
                    previousBackordered: 0,
                    newBackordered: 0,
                    referenceType: "PURCHASE_ORDER",
                    referenceId: "INITIAL_SEED",
                    reason: "Initial inventory provisioning",
                    ...(data.updatedBy ? { actor: data.updatedBy } : {}),
                },
                session
            );
        }

        return inventory;
    }

    /* -------------------------------------------------------------------------- */
    /* Atomic Stock Operations (Must be executed within ClientSession)            */
    /* -------------------------------------------------------------------------- */

    async atomicReserveWithMovement(
        params: {
            inventoryId: Types.ObjectId;
            quantity: number;
            referenceId: string;
            actor?: AuditActor;
        },
        session: ClientSession
    ): Promise<AtomicReserveResult> {
        const { inventoryId, quantity, referenceId, actor } = params;

        const current = await InventoryModel.findById(inventoryId).session(session).exec();
        if (!current) {
            throw new AppError("Inventory record not found", 404, "INVENTORY_NOT_FOUND");
        }

        const effectiveAvailable = Math.max(0, current.onHand - current.reserved - current.safetyStock);

        let reservedPhysical = 0;
        let backorderedUnits = 0;

        if (effectiveAvailable >= quantity) {
            reservedPhysical = quantity;
            backorderedUnits = 0;
        } else if (current.allowBackorder) {
            reservedPhysical = effectiveAvailable;
            backorderedUnits = quantity - reservedPhysical;
        } else {
            throw new AppError(
                `Insufficient stock for variant ${current.variantId.toString()}. Available: ${effectiveAvailable}, Requested: ${quantity}`,
                400,
                "INSUFFICIENT_STOCK"
            );
        }

        const prevDoc = await InventoryModel.findOneAndUpdate(
            {
                _id: inventoryId,
                ...(reservedPhysical > 0
                    ? {
                          $expr: {
                              $gte: [
                                  { $subtract: ["$onHand", { $add: ["$reserved", "$safetyStock"] }] },
                                  reservedPhysical,
                              ],
                          },
                      }
                    : {}),
            },
            {
                $inc: {
                    reserved: reservedPhysical,
                    backordered: backorderedUnits,
                    version: 1,
                },
                ...(actor ? { updatedBy: actor } : {}),
            },
            { new: false, session }
        );

        if (!prevDoc) {
            throw new AppError(
                `Concurrent reservation conflict or stock depleted for variant ${current.variantId.toString()}`,
                409,
                "STOCK_CONCURRENCY_CONFLICT"
            );
        }

        const newReserved = prevDoc.reserved + reservedPhysical;
        const newBackordered = prevDoc.backordered + backorderedUnits;

        const movement = await this.movementRepo.create(
            {
                inventoryId: prevDoc._id,
                productId: prevDoc.productId,
                variantId: prevDoc.variantId,
                warehouseId: prevDoc.warehouseId,
                type: "RESERVATION_HOLD",
                quantityDelta: 0,
                previousOnHand: prevDoc.onHand,
                newOnHand: prevDoc.onHand,
                previousReserved: prevDoc.reserved,
                newReserved,
                previousBackordered: prevDoc.backordered,
                newBackordered,
                referenceType: "CHECKOUT",
                referenceId,
                reason:
                    backorderedUnits > 0
                        ? `Physical reservation (${reservedPhysical}) + Backorder (${backorderedUnits})`
                        : `Physical reservation (${reservedPhysical})`,
                ...(actor ? { actor } : {}),
            },
            session
        );

        const updatedDoc = await InventoryModel.findById(inventoryId).session(session).exec();

        return {
            inventory: updatedDoc!,
            movement,
            reservedPhysical,
            backordered: backorderedUnits,
        };
    }

    async atomicReleaseWithMovement(
        params: {
            inventoryId: Types.ObjectId;
            reservedPhysical: number;
            backordered: number;
            referenceType: MovementReferenceType;
            referenceId: string;
            reason?: string;
            actor?: AuditActor;
        },
        session: ClientSession
    ): Promise<{ inventory: InventoryDocument; movement: StockMovementDocument }> {
        const {
            inventoryId,
            reservedPhysical,
            backordered,
            referenceType,
            referenceId,
            reason,
            actor,
        } = params;

        const prevDoc = await InventoryModel.findOneAndUpdate(
            {
                _id: inventoryId,
                reserved: { $gte: reservedPhysical },
                backordered: { $gte: backordered },
            },
            {
                $inc: {
                    reserved: -reservedPhysical,
                    backordered: -backordered,
                    version: 1,
                },
                ...(actor ? { updatedBy: actor } : {}),
            },
            { new: false, session }
        );

        if (!prevDoc) {
            throw new AppError(
                "Invalid reservation release: reserved or backordered quantity cannot become negative",
                400,
                "INVALID_RELEASE_QUANTITY"
            );
        }

        const movement = await this.movementRepo.create(
            {
                inventoryId: prevDoc._id,
                productId: prevDoc.productId,
                variantId: prevDoc.variantId,
                warehouseId: prevDoc.warehouseId,
                type: "RESERVATION_RELEASE",
                quantityDelta: 0,
                previousOnHand: prevDoc.onHand,
                newOnHand: prevDoc.onHand,
                previousReserved: prevDoc.reserved,
                newReserved: prevDoc.reserved - reservedPhysical,
                previousBackordered: prevDoc.backordered,
                newBackordered: prevDoc.backordered - backordered,
                referenceType,
                referenceId,
                reason: reason || "Released unconfirmed reservation",
                ...(actor ? { actor } : {}),
            },
            session
        );

        const updatedDoc = await InventoryModel.findById(inventoryId).session(session).exec();
        return { inventory: updatedDoc!, movement };
    }

    async atomicCommitWithMovement(
        params: {
            inventoryId: Types.ObjectId;
            reservedPhysical: number;
            referenceId: string;
            actor?: AuditActor;
        },
        session: ClientSession
    ): Promise<{ inventory: InventoryDocument; movement: StockMovementDocument }> {
        const { inventoryId, reservedPhysical, referenceId, actor } = params;

        const prevDoc = await InventoryModel.findOneAndUpdate(
            {
                _id: inventoryId,
                onHand: { $gte: reservedPhysical },
                reserved: { $gte: reservedPhysical },
            },
            {
                $inc: {
                    onHand: -reservedPhysical,
                    reserved: -reservedPhysical,
                    version: 1,
                },
                ...(actor ? { updatedBy: actor } : {}),
            },
            { new: false, session }
        );

        if (!prevDoc) {
            throw new AppError(
                "Invalid stock commit: onHand or reserved quantity cannot become negative",
                400,
                "INVALID_COMMIT_QUANTITY"
            );
        }

        const movement = await this.movementRepo.create(
            {
                inventoryId: prevDoc._id,
                productId: prevDoc.productId,
                variantId: prevDoc.variantId,
                warehouseId: prevDoc.warehouseId,
                type: "RESERVATION_COMMIT",
                quantityDelta: -reservedPhysical,
                previousOnHand: prevDoc.onHand,
                newOnHand: prevDoc.onHand - reservedPhysical,
                previousReserved: prevDoc.reserved,
                newReserved: prevDoc.reserved - reservedPhysical,
                previousBackordered: prevDoc.backordered,
                newBackordered: prevDoc.backordered,
                referenceType: "ORDER",
                referenceId,
                reason: `Order fulfillment commitment for ${reservedPhysical} units`,
                ...(actor ? { actor } : {}),
            },
            session
        );

        const updatedDoc = await InventoryModel.findById(inventoryId).session(session).exec();
        return { inventory: updatedDoc!, movement };
    }

    async atomicAdjustWithMovement(
        params: {
            inventoryId: Types.ObjectId;
            delta: number;
            reason: string;
            referenceType?: MovementReferenceType;
            referenceId?: string;
            actor?: AuditActor;
        },
        session: ClientSession
    ): Promise<{ inventory: InventoryDocument; movement: StockMovementDocument }> {
        const { inventoryId, delta, reason, referenceType, referenceId, actor } = params;

        const query: Record<string, unknown> = { _id: inventoryId };

        if (delta < 0) {
            query.$expr = {
                $and: [
                    { $gte: [{ $add: ["$onHand", delta] }, 0] },
                    { $gte: [{ $add: ["$onHand", delta] }, "$reserved"] },
                ],
            };
        }

        const prevDoc = await InventoryModel.findOneAndUpdate(
            query,
            {
                $inc: { onHand: delta, version: 1 },
                ...(actor ? { updatedBy: actor } : {}),
            },
            { new: false, session }
        );

        if (!prevDoc) {
            throw new AppError(
                "Cannot reduce stock below active reservations or below zero",
                400,
                "INVALID_STOCK_ADJUSTMENT"
            );
        }

        const movementType: StockMovementType =
            delta > 0 ? "STOCK_RECEIPT" : "INVENTORY_ADJUSTMENT";

        const movement = await this.movementRepo.create(
            {
                inventoryId: prevDoc._id,
                productId: prevDoc.productId,
                variantId: prevDoc.variantId,
                warehouseId: prevDoc.warehouseId,
                type: movementType,
                quantityDelta: delta,
                previousOnHand: prevDoc.onHand,
                newOnHand: prevDoc.onHand + delta,
                previousReserved: prevDoc.reserved,
                newReserved: prevDoc.reserved,
                previousBackordered: prevDoc.backordered,
                newBackordered: prevDoc.backordered,
                referenceType: referenceType || "MANUAL_ADJUSTMENT",
                referenceId: referenceId || new Types.ObjectId().toString(),
                reason,
                ...(actor ? { actor } : {}),
            },
            session
        );

        const updatedDoc = await InventoryModel.findById(inventoryId).session(session).exec();
        return { inventory: updatedDoc!, movement };
    }

    /* -------------------------------------------------------------------------- */
    /* Optimistic Concurrency Control (OCC) for Administrative Thresholds        */
    /* -------------------------------------------------------------------------- */

    async updateThresholdsWithOCC(
        params: {
            inventoryId: Types.ObjectId;
            expectedVersion: number;
            safetyStock?: number;
            reorderThreshold?: number;
            allowBackorder?: boolean;
            actor?: AuditActor;
        },
        session?: ClientSession
    ): Promise<InventoryDocument> {
        const {
            inventoryId,
            expectedVersion,
            safetyStock,
            reorderThreshold,
            allowBackorder,
            actor,
        } = params;

        const updateSet: Record<string, unknown> = {};
        if (safetyStock !== undefined) updateSet.safetyStock = safetyStock;
        if (reorderThreshold !== undefined) updateSet.reorderThreshold = reorderThreshold;
        if (allowBackorder !== undefined) updateSet.allowBackorder = allowBackorder;
        if (actor) updateSet.updatedBy = actor;

        const updated = await InventoryModel.findOneAndUpdate(
            {
                _id: inventoryId,
                version: expectedVersion,
            },
            {
                $set: updateSet,
                $inc: { version: 1 },
            },
            { new: true, session: session ?? null }
        ).exec();

        if (!updated) {
            const existing = await InventoryModel.findById(inventoryId).session(session ?? null).exec();
            if (!existing) {
                throw new AppError("Inventory record not found", 404, "INVENTORY_NOT_FOUND");
            }
            throw new AppError(
                `OCC conflict on inventory ${inventoryId.toString()}. Expected version ${expectedVersion}, but current is ${existing.version}`,
                409,
                "OCC_CONFLICT"
            );
        }

        return updated;
    }

    /* -------------------------------------------------------------------------- */
    /* Stock Movement & Reservation Pass-throughs for Repository Backwards-Compat */
    /* -------------------------------------------------------------------------- */

    async findMovements(
        filter: {
            inventoryId?: string | Types.ObjectId;
            productId?: string | Types.ObjectId;
            variantId?: string | Types.ObjectId;
            type?: StockMovementType;
            referenceId?: string;
        },
        options: { page?: number; limit?: number } = {}
    ): Promise<{ items: StockMovementDocument[]; total: number }> {
        return await this.movementRepo.query(filter, options);
    }

    async findMovementById(id: string | Types.ObjectId): Promise<StockMovementDocument | null> {
        return await this.movementRepo.findById(id);
    }

    async findReservationById(id: string | Types.ObjectId, session?: ClientSession): Promise<ReservationDocument | null> {
        return await this.resRepo.findById(id, session);
    }

    async findReservationByCheckoutId(checkoutId: string, session?: ClientSession): Promise<ReservationDocument | null> {
        return await this.resRepo.findByCheckoutId(checkoutId, session);
    }

    async findReservationByIdempotencyKey(key: string, session?: ClientSession): Promise<ReservationDocument | null> {
        return await this.resRepo.findByIdempotencyKey(key, session);
    }

    async createReservation(
        data: {
            checkoutId: string;
            idempotencyKey?: string;
            items: IReservationItem[];
            expiresAt: Date;
        },
        session?: ClientSession
    ): Promise<ReservationDocument> {
        return await this.resRepo.create(data, session);
    }

    async findExpiredPendingReservations(limit = 50, session?: ClientSession): Promise<ReservationDocument[]> {
        return await this.resRepo.findExpiredPending(limit, session);
    }
}

export const inventoryRepository = new InventoryRepository();
