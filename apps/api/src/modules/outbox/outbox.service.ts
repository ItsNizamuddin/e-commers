import mongoose from "mongoose";
import { OutboxEventModel, type IOutboxEvent } from "./outbox.model.js";
import { logger } from "../../config/logger.js";

export interface RecordOutboxEventParams {
    eventType: string;
    aggregateType: "ProductionRun" | "RepackagingRun" | "Order" | "RawMaterialLot" | "RawMaterial" | "FinishedGoodsLot" | "Inventory";
    aggregateId: mongoose.Types.ObjectId | string;
    deduplicationKey?: string;
    payload: Record<string, any>;
    scheduledFor?: Date;
    session?: mongoose.ClientSession;
}

export class OutboxService {
    /**
     * Records an outbox event within the caller's transaction session.
     * Guarantees that business mutations and outbox events commit atomically.
     */
    async recordEvent(params: RecordOutboxEventParams): Promise<IOutboxEvent | null> {
        const aggregateId = typeof params.aggregateId === "string"
            ? new mongoose.Types.ObjectId(params.aggregateId)
            : params.aggregateId;

        // 1. Check for existing deduplicationKey
        if (params.deduplicationKey) {
            const existing = await OutboxEventModel.findOne({
                deduplicationKey: params.deduplicationKey,
            }).session(params.session || null);

            if (existing) {
                return existing;
            }
        }

        try {
            const event = new OutboxEventModel({
                eventType: params.eventType,
                aggregateType: params.aggregateType,
                aggregateId,
                ...(params.deduplicationKey ? { deduplicationKey: params.deduplicationKey } : {}),
                payload: params.payload,
                status: "PENDING",
                scheduledFor: params.scheduledFor || new Date(),
            });

            if (params.session) {
                await event.save({ session: params.session });
            } else {
                await event.save();
            }
            return event;
        } catch (err: any) {
            // If deduplicationKey already exists, ignore duplicate insertion gracefully
            if (err.code === 11000 && params.deduplicationKey) {
                logger.warn(
                    { deduplicationKey: params.deduplicationKey },
                    "Outbox event already recorded with deduplicationKey; skipping duplicate"
                );
                return OutboxEventModel.findOne({ deduplicationKey: params.deduplicationKey }).session(
                    params.session || null
                );
            }
            throw err;
        }
    }
}

export const outboxService = new OutboxService();
