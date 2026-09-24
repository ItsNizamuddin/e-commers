import { Types } from "mongoose";
import { randomUUID } from "crypto";
import { AppError } from "../../../utils/app-error.js";
import { DEFAULT_WAREHOUSE_ID } from "../../../database/schemas/warehouse.schema.js";
import { OrderModel } from "../models/order.model.js";
import { PackingSessionModel, type PackingSessionDocument } from "../models/packing-session.model.js";
import { FinishedGoodsLotModel } from "../../manufacturing/finished-goods-lot.model.js";
import { manufacturingService } from "../../manufacturing/manufacturing.service.js";
import type {
    PackingSessionResponse,
    PackingScanResult,
    AuditActor,
    StartPackingInput,
    PackingScanInput,
    ResetPackingInput,
} from "@ecommers/types";

export function sanitizeStationId(stationId?: string): string {
    if (!stationId || typeof stationId !== "string") {
        return "PACK-BENCH-01";
    }
    const clean = stationId.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
    return clean || "PACK-BENCH-01";
}

export class PackingService {
    /**
     * Retrieves the current active packing session, or initializes a new one from the order's FEFO lots.
     */
    async getOrCreateActiveSession(
        orderId: string,
        input?: StartPackingInput,
        actor?: AuditActor
    ): Promise<PackingSessionDocument> {
        if (!Types.ObjectId.isValid(orderId)) {
            throw new AppError("Invalid order ID", 400, "INVALID_ID");
        }

        const stationId = sanitizeStationId(input?.stationId);

        const active = await PackingSessionModel.findOne({
            orderId: new Types.ObjectId(orderId),
            status: { $in: ["NOT_STARTED", "IN_PROGRESS", "VERIFIED"] },
        });

        if (active) {
            if (input?.stationId) {
                const requestedStation = sanitizeStationId(input.stationId);
                if (active.stationId !== requestedStation) {
                    active.stationId = requestedStation;
                    await active.save();
                }
            }
            return active;
        }

        // Fetch order to build fresh packing session items
        const order = await OrderModel.findById(orderId);
        if (!order) {
            throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
        }

        if (order.orderStatus === "CANCELLED") {
            throw new AppError("Cannot pack cancelled order", 400, "ORDER_CANCELLED");
        }

        // Ensure lots are allocated if missing
        if (!order.items.some((i) => i.allocatedLots && i.allocatedLots.length > 0)) {
            const warehouseId =
                (order as any).fulfillmentWarehouseId?.toString() ||
                (order as any).warehouseId?.toString() ||
                DEFAULT_WAREHOUSE_ID.toString();

            const lotAllocations = await manufacturingService.allocateLotsForOrder(
                orderId,
                warehouseId,
                order.items.map((i) => ({
                    variantId: i.variantId,
                    quantity: i.quantity,
                }))
            );

            if (lotAllocations.length > 0) {
                (order as any).items = order.items.map((item) => {
                    const alloc = lotAllocations.find((a) => a.variantId === item.variantId);
                    if (alloc && alloc.allocatedLots.length > 0) {
                        return {
                            ...item,
                            allocatedLots: alloc.allocatedLots.map((l) => ({
                                lotId: new Types.ObjectId(l.lotId),
                                lotNumber: l.lotNumber,
                                packagingRunId: l.packagingRunId ? new Types.ObjectId(l.packagingRunId) : undefined,
                                warehouseId: new Types.ObjectId(l.warehouseId),
                                quantity: l.quantity,
                                allocatedAt: new Date(l.allocatedAt),
                            })),
                        };
                    }
                    return item;
                });
                await order.save();
            }
        }

        // Build session items from allocated lots
        const sessionItems: any[] = [];
        for (const item of order.items) {
            const itemIdStr = (item as any)._id ? (item as any)._id.toString() : item.variantId;
            if (item.allocatedLots && item.allocatedLots.length > 0) {
                for (const lot of item.allocatedLots) {
                    sessionItems.push({
                        orderItemId: itemIdStr,
                        variantId: item.variantId,
                        productTitle: item.productTitle,
                        variantTitle: item.variantTitle,
                        lotId: lot.lotId,
                        lotNumber: lot.lotNumber,
                        requiredQty: lot.quantity,
                        verifiedQty: 0,
                    });
                }
            } else {
                // Fallback if unallocated artisan item
                sessionItems.push({
                    orderItemId: itemIdStr,
                    variantId: item.variantId,
                    productTitle: item.productTitle,
                    variantTitle: item.variantTitle,
                    lotId: new Types.ObjectId(),
                    lotNumber: "UNALLOCATED",
                    requiredQty: item.quantity,
                    verifiedQty: 0,
                });
            }
        }

        const count = await PackingSessionModel.countDocuments({ orderId: new Types.ObjectId(orderId) });

        try {
            const newSession = await PackingSessionModel.create({
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: "IN_PROGRESS",
                sessionNumber: count + 1,
                stationId,
                startedBy: actor,
                startedAt: new Date(),
                items: sessionItems,
                scanEvents: [],
            });
            return newSession;
        } catch (err: any) {
            if (err.code === 11000) {
                const existing = await PackingSessionModel.findOne({
                    orderId: new Types.ObjectId(orderId),
                    status: { $in: ["NOT_STARTED", "IN_PROGRESS", "VERIFIED"] },
                });
                if (existing) return existing;
            }
            throw err;
        }
    }

    /**
     * Database-safe barcode/QR scan validation against the order's allocated finished goods lots.
     * Uses MongoDB atomic conditional update ($elemMatch + verifiedQty: { $lt: requiredQty } + $inc)
     * to guarantee quantities cannot exceed allocations even under concurrent requests across multiple API instances.
     */
    async verifyPackingScan(
        orderId: string,
        input: PackingScanInput,
        actor?: AuditActor
    ): Promise<{
        session: PackingSessionResponse;
        scanResult: PackingScanResult;
        message: string;
        scannedLotNumber?: string;
    }> {
        const rawCode = (input.barcode || "").trim();
        if (!rawCode) {
            throw new AppError("Barcode is required", 400, "MISSING_BARCODE");
        }

        const stationId = sanitizeStationId(input.stationId);
        const session = await this.getOrCreateActiveSession(orderId, { stationId }, actor);

        if (session.status === "VERIFIED") {
            const allComplete = session.items.every((i) => i.verifiedQty >= i.requiredQty);
            if (allComplete) {
                return {
                    session: this.mapToResponse(session),
                    scanResult: "ALREADY_COMPLETED",
                    message: "All items in this order have already been verified and packed.",
                };
            }
        }

        // Parse token if full URL was scanned
        let tokenOrCode = rawCode;
        if (rawCode.includes("/verify/")) {
            const parts = rawCode.split("/verify/");
            tokenOrCode = parts[1]?.trim() || rawCode;
        }

        // Rule: Scanner resolves Finished Goods only!
        const finishedLot = await FinishedGoodsLotModel.findOne({
            $or: [
                { lotNumber: tokenOrCode },
                { publicVerificationToken: tokenOrCode },
                ...(Types.ObjectId.isValid(tokenOrCode) ? [{ _id: new Types.ObjectId(tokenOrCode) }] : []),
            ],
        });

        // 1. Not Found
        if (!finishedLot) {
            const event = {
                eventId: randomUUID(),
                barcode: rawCode,
                result: "NOT_FOUND" as PackingScanResult,
                message: `No finished goods lot found matching '${rawCode}'`,
                quantity: 1,
                scannedBy: actor,
                stationId,
                scannedAt: new Date(),
            };
            const updated = await PackingSessionModel.findOneAndUpdate(
                { _id: session._id },
                { $push: { scanEvents: event } },
                { returnDocument: "after" }
            );

            return {
                session: this.mapToResponse(updated || session),
                scanResult: "NOT_FOUND",
                message: event.message,
            };
        }

        const lotNumber = finishedLot.lotNumber;
        const lotIdStr = finishedLot._id.toString();

        // 2. Safety State: RECALLED
        if (finishedLot.qualityStatus === "RECALLED") {
            const event = {
                eventId: randomUUID(),
                barcode: rawCode,
                lotId: finishedLot._id,
                lotNumber,
                result: "RECALLED" as PackingScanResult,
                message: `CRITICAL SAFETY VIOLATION: Lot '${lotNumber}' has been RECALLED. DO NOT PACK!`,
                quantity: 1,
                scannedBy: actor,
                stationId,
                scannedAt: new Date(),
            };
            const updated = await PackingSessionModel.findOneAndUpdate(
                { _id: session._id },
                { $push: { scanEvents: event } },
                { returnDocument: "after" }
            );

            return {
                session: this.mapToResponse(updated || session),
                scanResult: "RECALLED",
                message: event.message,
                scannedLotNumber: lotNumber,
            };
        }

        // 3. Safety State: QUARANTINED or REJECTED
        if (finishedLot.qualityStatus === "QUARANTINED" || finishedLot.qualityStatus === "REJECTED") {
            const event = {
                eventId: randomUUID(),
                barcode: rawCode,
                lotId: finishedLot._id,
                lotNumber,
                result: "QUARANTINED" as PackingScanResult,
                message: `SAFETY HOLD: Lot '${lotNumber}' is currently ${finishedLot.qualityStatus}. DO NOT PACK!`,
                quantity: 1,
                scannedBy: actor,
                stationId,
                scannedAt: new Date(),
            };
            const updated = await PackingSessionModel.findOneAndUpdate(
                { _id: session._id },
                { $push: { scanEvents: event } },
                { returnDocument: "after" }
            );

            return {
                session: this.mapToResponse(updated || session),
                scanResult: "QUARANTINED",
                message: event.message,
                scannedLotNumber: lotNumber,
            };
        }

        // 4. Safety State: EXPIRED
        if (finishedLot.expiryDate && finishedLot.expiryDate.getTime() <= Date.now()) {
            const event = {
                eventId: randomUUID(),
                barcode: rawCode,
                lotId: finishedLot._id,
                lotNumber,
                result: "EXPIRED" as PackingScanResult,
                message: `EXPIRED BATCH: Lot '${lotNumber}' expired on ${finishedLot.expiryDate.toISOString().slice(0, 10)}. DO NOT PACK!`,
                quantity: 1,
                scannedBy: actor,
                stationId,
                scannedAt: new Date(),
            };
            const updated = await PackingSessionModel.findOneAndUpdate(
                { _id: session._id },
                { $push: { scanEvents: event } },
                { returnDocument: "after" }
            );

            return {
                session: this.mapToResponse(updated || session),
                scanResult: "EXPIRED",
                message: event.message,
                scannedLotNumber: lotNumber,
            };
        }

        // 5. Allocation Check: Does this lot match an allocated line item?
        const matchingItem = session.items.find(
            (item) => item.lotId.toString() === lotIdStr || item.lotNumber === lotNumber
        );

        if (!matchingItem) {
            const event = {
                eventId: randomUUID(),
                barcode: rawCode,
                lotId: finishedLot._id,
                lotNumber,
                result: "WRONG_LOT" as PackingScanResult,
                message: `WRONG LOT: Lot '${lotNumber}' is not allocated to this order.`,
                quantity: 1,
                scannedBy: actor,
                stationId,
                scannedAt: new Date(),
            };
            const updated = await PackingSessionModel.findOneAndUpdate(
                { _id: session._id },
                { $push: { scanEvents: event } },
                { returnDocument: "after" }
            );

            return {
                session: this.mapToResponse(updated || session),
                scanResult: "WRONG_LOT",
                message: event.message,
                scannedLotNumber: lotNumber,
            };
        }

        // 6. Database-Safe Atomic Match Increment
        // Execute atomic conditional update with $elemMatch: verifiedQty < requiredQty.
        // If another process/instance already satisfied the required count, findOneAndUpdate will return null.
        const eventId = randomUUID();
        const matchedEvent = {
            eventId,
            barcode: rawCode,
            lotId: finishedLot._id,
            lotNumber,
            result: "MATCHED" as PackingScanResult,
            message: `Verified 1 unit of '${matchingItem.productTitle}' [${lotNumber}] (${matchingItem.verifiedQty + 1}/${matchingItem.requiredQty})`,
            quantity: 1,
            scannedBy: actor,
            stationId,
            scannedAt: new Date(),
        };

        const updatedSession = await PackingSessionModel.findOneAndUpdate(
            {
                _id: session._id,
                status: { $in: ["NOT_STARTED", "IN_PROGRESS"] },
                items: {
                    $elemMatch: {
                        orderItemId: matchingItem.orderItemId,
                        lotId: finishedLot._id,
                        verifiedQty: { $lt: matchingItem.requiredQty },
                    },
                },
            },
            {
                $inc: { "items.$.verifiedQty": 1 },
                $set: { status: "IN_PROGRESS" },
                $push: { scanEvents: matchedEvent },
            },
            { returnDocument: "after" }
        );

        if (!updatedSession) {
            // Condition failed: either required quantity is already satisfied or session is no longer in progress.
            const alreadyCompletedEvent = {
                eventId: randomUUID(),
                barcode: rawCode,
                lotId: finishedLot._id,
                lotNumber,
                result: "ALREADY_COMPLETED" as PackingScanResult,
                message: `All required units (${matchingItem.verifiedQty}/${matchingItem.requiredQty}) for '${matchingItem.productTitle}' (${lotNumber}) are already scanned.`,
                quantity: 1,
                scannedBy: actor,
                stationId,
                scannedAt: new Date(),
            };

            const latestSession = await PackingSessionModel.findOneAndUpdate(
                { _id: session._id },
                { $push: { scanEvents: alreadyCompletedEvent } },
                { returnDocument: "after" }
            );

            return {
                session: this.mapToResponse(latestSession || session),
                scanResult: "ALREADY_COMPLETED",
                message: alreadyCompletedEvent.message,
                scannedLotNumber: lotNumber,
            };
        }

        // If updatedSession succeeded, reflect the exact verified quantity from the database
        const freshItem = updatedSession.items.find(
            (i) => i.orderItemId === matchingItem.orderItemId && i.lotId.toString() === finishedLot._id.toString()
        );
        const currentVerified = freshItem ? freshItem.verifiedQty : matchingItem.verifiedQty + 1;
        matchedEvent.message = `Verified 1 unit of '${matchingItem.productTitle}' [${lotNumber}] (${currentVerified}/${matchingItem.requiredQty})`;

        // Check if all items in session are now complete
        const allItemsComplete = updatedSession.items.every((i) => i.verifiedQty >= i.requiredQty);
        if (allItemsComplete) {
            const completedSession = await PackingSessionModel.findOneAndUpdate(
                { _id: updatedSession._id, status: "IN_PROGRESS" },
                {
                    $set: {
                        status: "VERIFIED",
                        completedAt: new Date(),
                        completedBy: actor,
                    },
                },
                { returnDocument: "after" }
            );
            if (completedSession) {
                return {
                    session: this.mapToResponse(completedSession),
                    scanResult: "MATCHED",
                    message: matchedEvent.message,
                    scannedLotNumber: lotNumber,
                };
            }
        }

        return {
            session: this.mapToResponse(updatedSession),
            scanResult: "MATCHED",
            message: matchedEvent.message,
            scannedLotNumber: lotNumber,
        };
    }

    /**
     * Resets a packing session due to operator error or box repacking.
     * Preserves audit log of the previous session and starts a new session.
     */
    async resetPackingSession(
        orderId: string,
        input: ResetPackingInput,
        actor?: AuditActor
    ): Promise<PackingSessionResponse> {
        if (!input.reason?.trim()) {
            throw new AppError("Reset reason is required", 400, "REASON_REQUIRED");
        }

        const activeSession = await PackingSessionModel.findOne({
            orderId: new Types.ObjectId(orderId),
            status: { $in: ["NOT_STARTED", "IN_PROGRESS", "VERIFIED"] },
        });

        if (!activeSession) {
            throw new AppError("No active packing session found to reset", 404, "NO_ACTIVE_SESSION");
        }

        // Mark previous session cancelled with audit reason
        activeSession.status = "CANCELLED";
        activeSession.resetReason = input.reason.trim();
        activeSession.resetAt = new Date();
        activeSession.resetBy = actor;
        await activeSession.save();

        // Create new clean session
        const freshSession = await this.getOrCreateActiveSession(
            orderId,
            { stationId: input.stationId || activeSession.stationId },
            actor
        );

        return this.mapToResponse(freshSession);
    }

    /**
     * Validates that an order's packing session is fully VERIFIED and that all lots remain healthy at shipping time.
     */
    async validateOrderForShipment(orderId: string): Promise<void> {
        const session = await PackingSessionModel.findOne({
            orderId: new Types.ObjectId(orderId),
            status: "VERIFIED",
        });

        if (!session) {
            throw new AppError(
                "Order cannot be shipped: Packing session is not VERIFIED. All allocated lots must be physically scanned at the packing bench.",
                400,
                "PACKING_NOT_VERIFIED"
            );
        }

        // Confirm every item has verifiedQty >= requiredQty
        const hasUnverified = session.items.some((i) => i.verifiedQty < i.requiredQty);
        if (hasUnverified) {
            throw new AppError(
                "Order cannot be shipped: Not all allocated items have been physically verified.",
                400,
                "PACKING_INCOMPLETE"
            );
        }

        // Revalidate lots at shipping time! (Point 6 of architecture)
        const lotIds = session.items.map((i) => i.lotId);
        const lots = await FinishedGoodsLotModel.find({ _id: { $in: lotIds } });

        for (const lot of lots) {
            if (lot.qualityStatus === "RECALLED") {
                throw new AppError(
                    `SHIPMENT BLOCKED: Lot '${lot.lotNumber}' has been RECALLED. Remove from packing bench and quarantine immediately.`,
                    400,
                    "RECALLED_LOT_DETECTED"
                );
            }
            if (lot.qualityStatus === "QUARANTINED" || lot.qualityStatus === "REJECTED") {
                throw new AppError(
                    `SHIPMENT BLOCKED: Lot '${lot.lotNumber}' is currently ${lot.qualityStatus}. Cannot ship unapproved food stock.`,
                    400,
                    "QUARANTINED_LOT_DETECTED"
                );
            }
            if (lot.expiryDate && lot.expiryDate.getTime() <= Date.now()) {
                throw new AppError(
                    `SHIPMENT BLOCKED: Lot '${lot.lotNumber}' has EXPIRED. Cannot ship expired food to customer.`,
                    400,
                    "EXPIRED_LOT_DETECTED"
                );
            }
        }
    }

    mapToResponse(doc: PackingSessionDocument): PackingSessionResponse {
        return {
            id: doc._id.toString(),
            orderId: doc.orderId.toString(),
            orderNumber: doc.orderNumber,
            status: doc.status,
            sessionNumber: doc.sessionNumber,
            stationId: doc.stationId,
            startedBy: doc.startedBy,
            startedAt: doc.startedAt ? doc.startedAt.toISOString() : "",
            completedBy: doc.completedBy,
            completedAt: doc.completedAt ? doc.completedAt.toISOString() : undefined,
            items: doc.items.map((item) => ({
                orderItemId: item.orderItemId,
                variantId: item.variantId,
                productTitle: item.productTitle,
                variantTitle: item.variantTitle,
                lotId: item.lotId.toString(),
                lotNumber: item.lotNumber,
                requiredQty: item.requiredQty,
                verifiedQty: item.verifiedQty,
            })),
            scanEvents: doc.scanEvents.map((evt) => ({
                eventId: evt.eventId,
                barcode: evt.barcode,
                lotId: evt.lotId ? evt.lotId.toString() : undefined,
                lotNumber: evt.lotNumber,
                result: evt.result,
                message: evt.message,
                quantity: evt.quantity,
                scannedBy: evt.scannedBy,
                stationId: evt.stationId,
                scannedAt: evt.scannedAt ? evt.scannedAt.toISOString() : "",
            })),
            resetReason: doc.resetReason,
            resetAt: doc.resetAt ? doc.resetAt.toISOString() : undefined,
            resetBy: doc.resetBy,
        };
    }
}

export const packingService = new PackingService();
