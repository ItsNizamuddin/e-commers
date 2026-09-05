import { Types } from "mongoose";
import {
    AuditActor,
    StockMovementResponse,
    StockMovementType,
    AdjustInventoryInput,
} from "@shopsphere/types";
import { AppError } from "../../../utils/app-error.js";
import { withTransaction } from "../../../database/transaction.js";
import { StockMovementDocument } from "../types/stock-movement.types.js";
import {
    stockMovementRepository,
    StockMovementRepository,
} from "../repositories/stock-movement.repository.js";
import {
    inventoryRepository,
    InventoryRepository,
} from "../repositories/inventory.repository.js";

export class StockMovementService {
    constructor(
        private readonly movementRepo: StockMovementRepository = stockMovementRepository,
        private readonly invRepo: InventoryRepository = inventoryRepository
    ) {}

    mapMovementToResponse(doc: StockMovementDocument): StockMovementResponse {
        return {
            id: doc._id.toString(),
            inventoryId: doc.inventoryId.toString(),
            productId: doc.productId.toString(),
            variantId: doc.variantId.toString(),
            warehouseId: doc.warehouseId.toString(),
            type: doc.type,
            quantityDelta: doc.quantityDelta,
            previousOnHand: doc.previousOnHand,
            newOnHand: doc.newOnHand,
            previousReserved: doc.previousReserved,
            newReserved: doc.newReserved,
            previousBackordered: doc.previousBackordered,
            newBackordered: doc.newBackordered,
            referenceType: doc.referenceType,
            referenceId: doc.referenceId,
            ...(doc.reason ? { reason: doc.reason } : {}),
            ...(doc.actor ? { actor: doc.actor } : {}),
            createdAt: doc.createdAt.toISOString(),
        };
    }

    async adjustStock(
        input: AdjustInventoryInput,
        actor?: AuditActor
    ): Promise<{ movement: StockMovementResponse }> {
        return await withTransaction(async (session) => {
            const inventoryId = new Types.ObjectId(input.inventoryId);
            const { movement } = await this.invRepo.atomicAdjustWithMovement(
                {
                    inventoryId,
                    delta: input.delta,
                    reason: input.reason,
                    ...(input.referenceType ? { referenceType: input.referenceType } : {}),
                    ...(input.referenceId ? { referenceId: input.referenceId } : {}),
                    ...(actor ? { actor } : {}),
                },
                session
            );

            return {
                movement: this.mapMovementToResponse(movement),
            };
        });
    }

    async listMovements(
        filter: {
            inventoryId?: string;
            productId?: string;
            variantId?: string;
            type?: StockMovementType;
            referenceId?: string;
        },
        options: { page?: number; limit?: number } = {}
    ): Promise<{ items: StockMovementResponse[]; total: number; page: number; limit: number }> {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));

        const result = await this.movementRepo.query(filter, { page, limit });

        return {
            items: result.items.map((m) => this.mapMovementToResponse(m)),
            total: result.total,
            page,
            limit,
        };
    }

    async getMovementById(id: string): Promise<StockMovementResponse> {
        const doc = await this.movementRepo.findById(id);
        if (!doc) {
            throw new AppError("Stock movement record not found", 404, "MOVEMENT_NOT_FOUND");
        }
        return this.mapMovementToResponse(doc);
    }
}

export const stockMovementService = new StockMovementService();
