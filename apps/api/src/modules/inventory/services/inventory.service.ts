import { Types } from "mongoose";
import {
    AuditActor,
    InventoryResponse,
    PublicVariantAvailabilityResponse,
    StockMovementResponse,
    ReservationResponse,
    CreateReservationInput,
    AdjustInventoryInput,
    UpdateInventoryThresholdsInput,
    InventoryQueryOptions,
    StockMovementType,
} from "@shopsphere/types";
import { AppError } from "../../../utils/app-error.js";
import { InventoryDocument } from "../types/inventory.types.js";
import {
    inventoryRepository,
    InventoryRepository,
} from "../repositories/inventory.repository.js";
import {
    stockMovementService,
    StockMovementService,
} from "./stock-movement.service.js";
import {
    reservationService,
    ReservationService,
} from "./reservation.service.js";

export class InventoryService {
    constructor(
        private readonly repo: InventoryRepository = inventoryRepository,
        private readonly movementService: StockMovementService = stockMovementService,
        private readonly resService: ReservationService = reservationService
    ) {}

    mapInventoryToResponse(doc: InventoryDocument): InventoryResponse {
        const available = Math.max(0, doc.onHand - doc.reserved - doc.safetyStock);
        const isLowStock = (doc.onHand - doc.reserved) <= doc.reorderThreshold;

        return {
            id: doc._id.toString(),
            productId: doc.productId.toString(),
            variantId: doc.variantId.toString(),
            warehouseId: doc.warehouseId.toString(),
            onHand: doc.onHand,
            reserved: doc.reserved,
            backordered: doc.backordered,
            safetyStock: doc.safetyStock,
            reorderThreshold: doc.reorderThreshold,
            allowBackorder: doc.allowBackorder,
            available,
            isLowStock,
            version: doc.version,
            ...(doc.updatedBy ? { updatedBy: doc.updatedBy } : {}),
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    /* -------------------------------------------------------------------------- */
    /* Public Availability Endpoint                                               */
    /* -------------------------------------------------------------------------- */

    async getPublicVariantAvailability(
        productId: string,
        variantId: string
    ): Promise<PublicVariantAvailabilityResponse> {
        const inventories = await this.repo.findByVariant(variantId);

        if (!inventories || inventories.length === 0) {
            return {
                productId,
                variantId,
                isInStock: false,
                isLowStock: false,
                allowBackorder: false,
            };
        }

        let totalOnHand = 0;
        let totalReserved = 0;
        let totalSafetyStock = 0;
        let minReorderThreshold = Number.MAX_SAFE_INTEGER;
        let allowBackorder = false;

        for (const inv of inventories) {
            totalOnHand += inv.onHand;
            totalReserved += inv.reserved;
            totalSafetyStock += inv.safetyStock;
            minReorderThreshold = Math.min(minReorderThreshold, inv.reorderThreshold);
            if (inv.allowBackorder) {
                allowBackorder = true;
            }
        }

        const available = Math.max(0, totalOnHand - totalReserved - totalSafetyStock);
        const isInStock = available > 0 || allowBackorder;
        const isLowStock = (totalOnHand - totalReserved) <= minReorderThreshold;

        return {
            productId,
            variantId,
            isInStock,
            isLowStock,
            allowBackorder,
        };
    }

    /* -------------------------------------------------------------------------- */
    /* Admin Inventory Management                                                 */
    /* -------------------------------------------------------------------------- */

    async getInventoryById(id: string): Promise<InventoryResponse> {
        const doc = await this.repo.findById(id);
        if (!doc) {
            throw new AppError("Inventory record not found", 404, "INVENTORY_NOT_FOUND");
        }
        return this.mapInventoryToResponse(doc);
    }

    async listInventory(
        options: InventoryQueryOptions = {}
    ): Promise<{ items: InventoryResponse[]; total: number; page: number; limit: number }> {
        const page = Math.max(1, options.page || 1);
        const limit = Math.min(100, Math.max(1, options.limit || 20));

        const filter: {
            productId?: string;
            variantId?: string;
            warehouseId?: string;
            lowStock?: boolean;
        } = {};
        if (options.productId) filter.productId = options.productId;
        if (options.variantId) filter.variantId = options.variantId;
        if (options.warehouseId) filter.warehouseId = options.warehouseId;
        if (options.lowStock !== undefined) filter.lowStock = options.lowStock;

        const result = await this.repo.query(filter, { page, limit });

        return {
            items: result.items.map((i) => this.mapInventoryToResponse(i)),
            total: result.total,
            page,
            limit,
        };
    }

    async adjustStock(
        input: AdjustInventoryInput,
        actor?: AuditActor
    ): Promise<{ inventory: InventoryResponse; movement: StockMovementResponse }> {
        const result = await this.movementService.adjustStock(input, actor);
        const inv = await this.getInventoryById(input.inventoryId);

        return {
            inventory: inv,
            movement: result.movement,
        };
    }

    async updateThresholds(
        id: string,
        input: UpdateInventoryThresholdsInput,
        actor?: AuditActor
    ): Promise<InventoryResponse> {
        const inventoryId = new Types.ObjectId(id);
        const updated = await this.repo.updateThresholdsWithOCC({
            inventoryId,
            expectedVersion: input.expectedVersion,
            ...(input.safetyStock !== undefined ? { safetyStock: input.safetyStock } : {}),
            ...(input.reorderThreshold !== undefined ? { reorderThreshold: input.reorderThreshold } : {}),
            ...(input.allowBackorder !== undefined ? { allowBackorder: input.allowBackorder } : {}),
            ...(actor ? { actor } : {}),
        });

        return this.mapInventoryToResponse(updated);
    }

    /* -------------------------------------------------------------------------- */
    /* Reservation Delegations                                                    */
    /* -------------------------------------------------------------------------- */

    async reserveStock(input: CreateReservationInput, actor?: AuditActor): Promise<ReservationResponse> {
        return await this.resService.reserveStock(input, actor);
    }

    async releaseReservation(reservationIdOrCheckoutId: string, actor?: AuditActor): Promise<ReservationResponse> {
        return await this.resService.releaseReservation(reservationIdOrCheckoutId, actor);
    }

    async commitReservation(reservationIdOrCheckoutId: string, actor?: AuditActor): Promise<ReservationResponse> {
        return await this.resService.commitReservation(reservationIdOrCheckoutId, actor);
    }

    async expireStaleReservations(batchSize = 50): Promise<number> {
        return await this.resService.expireStaleReservations(batchSize);
    }

    /* -------------------------------------------------------------------------- */
    /* Movement Delegations                                                       */
    /* -------------------------------------------------------------------------- */

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
        return await this.movementService.listMovements(filter, options);
    }

    async getMovementById(id: string): Promise<StockMovementResponse> {
        return await this.movementService.getMovementById(id);
    }
}

export const inventoryService = new InventoryService();
