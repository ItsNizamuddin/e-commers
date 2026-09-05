import { ClientSession, Types } from "mongoose";
import { StockMovementType, MovementReferenceType, AuditActor } from "@shopsphere/types";
import { StockMovementModel } from "../models/stock-movement.model.js";
import { StockMovementDocument } from "../types/stock-movement.types.js";

export class StockMovementRepository {
    async create(
        data: {
            inventoryId: Types.ObjectId;
            productId: Types.ObjectId;
            variantId: Types.ObjectId;
            warehouseId: Types.ObjectId;
            type: StockMovementType;
            quantityDelta: number;
            previousOnHand: number;
            newOnHand: number;
            previousReserved: number;
            newReserved: number;
            previousBackordered?: number;
            newBackordered?: number;
            referenceType: MovementReferenceType;
            referenceId: string;
            reason?: string;
            actor?: AuditActor;
        },
        session?: ClientSession
    ): Promise<StockMovementDocument> {
        const movement = new StockMovementModel({
            inventoryId: data.inventoryId,
            productId: data.productId,
            variantId: data.variantId,
            warehouseId: data.warehouseId,
            type: data.type,
            quantityDelta: data.quantityDelta,
            previousOnHand: data.previousOnHand,
            newOnHand: data.newOnHand,
            previousReserved: data.previousReserved,
            newReserved: data.newReserved,
            previousBackordered: data.previousBackordered ?? 0,
            newBackordered: data.newBackordered ?? 0,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            ...(data.reason ? { reason: data.reason } : {}),
            ...(data.actor ? { actor: data.actor } : {}),
        });

        await movement.save(session ? { session } : undefined);
        return movement;
    }

    async findById(id: string | Types.ObjectId): Promise<StockMovementDocument | null> {
        return await StockMovementModel.findById(id).exec();
    }

    async query(
        filter: {
            inventoryId?: string | Types.ObjectId;
            productId?: string | Types.ObjectId;
            variantId?: string | Types.ObjectId;
            type?: StockMovementType;
            referenceId?: string;
        },
        options: { page?: number; limit?: number } = {}
    ): Promise<{ items: StockMovementDocument[]; total: number }> {
        const query: Record<string, unknown> = {};

        if (filter.inventoryId) query.inventoryId = new Types.ObjectId(filter.inventoryId);
        if (filter.productId) query.productId = new Types.ObjectId(filter.productId);
        if (filter.variantId) query.variantId = new Types.ObjectId(filter.variantId);
        if (filter.type) query.type = filter.type;
        if (filter.referenceId) query.referenceId = filter.referenceId;

        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            StockMovementModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            StockMovementModel.countDocuments(query).exec(),
        ]);

        return { items, total };
    }
}

export const stockMovementRepository = new StockMovementRepository();
