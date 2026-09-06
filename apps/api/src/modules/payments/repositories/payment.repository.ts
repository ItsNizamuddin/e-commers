import { ClientSession, Types } from "mongoose";
import { PaymentProvider, PaymentStatus } from "@ecommers/types";
import { PaymentModel } from "../models/payment.model.js";
import { PaymentEventModel } from "../models/payment-event.model.js";
import {
    IPayment,
    PaymentDocument,
    PaymentEventDocument,
} from "../types/payment.types.js";

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5-minute timeout for crash recovery

export class PaymentRepository {
    async create(
        data: Partial<IPayment>,
        session?: ClientSession
    ): Promise<PaymentDocument> {
        const doc = new PaymentModel(data);
        if (session) {
            await doc.save({ session });
        } else {
            await doc.save();
        }
        return doc;
    }

    async findById(
        id: Types.ObjectId | string,
        session?: ClientSession
    ): Promise<PaymentDocument | null> {
        return PaymentModel.findById(id).session(session ?? null).exec();
    }

    async findByPaymentIntentId(
        paymentIntentId: string,
        session?: ClientSession
    ): Promise<PaymentDocument | null> {
        return PaymentModel.findOne({ paymentIntentId }).session(session ?? null).exec();
    }

    async findByCheckoutId(
        checkoutId: Types.ObjectId | string,
        session?: ClientSession
    ): Promise<PaymentDocument | null> {
        return PaymentModel.findOne({
            checkoutId: new Types.ObjectId(checkoutId.toString()),
        })
            .sort({ createdAt: -1 })
            .session(session ?? null)
            .exec();
    }

    async updateStatusWithOCC(
        id: Types.ObjectId | string,
        expectedVersion: number,
        newStatus: PaymentStatus,
        extraUpdates: Partial<IPayment> = {},
        session?: ClientSession
    ): Promise<PaymentDocument | null> {
        return PaymentModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id.toString()),
                version: expectedVersion,
            },
            {
                $set: {
                    status: newStatus,
                    ...extraUpdates,
                },
                $inc: { version: 1 },
            },
            {
                new: true,
                session: session ?? null,
            }
        ).exec();
    }

    async acquireEventLock(
        provider: PaymentProvider,
        eventId: string,
        eventType: string,
        metadata?: {
            paymentIntentId?: string;
            checkoutId?: string;
            payload?: unknown;
        }
    ): Promise<{
        acquired: boolean;
        alreadyProcessed: boolean;
        event: PaymentEventDocument;
    }> {
        // Find existing or insert new in a single atomic upsert
        let event = await PaymentEventModel.findOne({ provider, eventId }).exec();

        if (!event) {
            try {
                const doc = new PaymentEventModel({
                    provider,
                    eventId,
                    eventType,
                    paymentIntentId: metadata?.paymentIntentId,
                    checkoutId: metadata?.checkoutId,
                    payload: metadata?.payload,
                    status: "RECEIVED",
                });
                event = await doc.save();
            } catch (err: any) {
                // If race condition on insert, re-query
                if (err.code === 11000) {
                    event = await PaymentEventModel.findOne({ provider, eventId }).exec();
                } else {
                    throw err;
                }
            }
        }

        if (!event) {
            throw new Error(`Failed to acquire event ledger for ${provider}:${eventId}`);
        }

        if (event.status === "PROCESSED") {
            return { acquired: false, alreadyProcessed: true, event };
        }

        const now = new Date();
        const isStaleLock =
            event.status === "PROCESSING" &&
            event.lockedAt &&
            now.getTime() - event.lockedAt.getTime() > PROCESSING_TIMEOUT_MS;

        if (event.status === "RECEIVED" || event.status === "FAILED" || isStaleLock) {
            const locked = await PaymentEventModel.findOneAndUpdate(
                {
                    _id: event._id,
                    status: event.status, // Guard against concurrent transition
                },
                {
                    $set: {
                        status: "PROCESSING",
                        lockedAt: now,
                        eventType,
                        ...(metadata?.paymentIntentId ? { paymentIntentId: metadata.paymentIntentId } : {}),
                        ...(metadata?.checkoutId ? { checkoutId: metadata.checkoutId } : {}),
                        ...(metadata?.payload ? { payload: metadata.payload } : {}),
                    },
                },
                { new: true }
            ).exec();

            if (locked) {
                return { acquired: true, alreadyProcessed: false, event: locked };
            }
        }

        // Another worker is currently processing this event within active timeout
        return { acquired: false, alreadyProcessed: false, event };
    }

    async markEventProcessed(
        provider: PaymentProvider,
        eventId: string
    ): Promise<void> {
        await PaymentEventModel.updateOne(
            { provider, eventId },
            {
                $set: {
                    status: "PROCESSED",
                    processedAt: new Date(),
                },
            }
        ).exec();
    }

    async markEventFailed(
        provider: PaymentProvider,
        eventId: string,
        errorMessage: string
    ): Promise<void> {
        await PaymentEventModel.updateOne(
            { provider, eventId },
            {
                $set: {
                    status: "FAILED",
                    errorMessage,
                },
            }
        ).exec();
    }
}

export const paymentRepository = new PaymentRepository();
