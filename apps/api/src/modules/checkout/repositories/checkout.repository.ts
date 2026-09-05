import { ClientSession, Types } from "mongoose";
import { CheckoutAddress, CheckoutStatus } from "@shopsphere/types";
import { AppError } from "../../../utils/app-error.js";
import { CheckoutModel } from "../models/checkout.model.js";
import { CheckoutDocument, ICheckout, ICheckoutPricing } from "../types/checkout.types.js";

export class CheckoutRepository {
    async findById(
        id: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<CheckoutDocument | null> {
        const checkout = await CheckoutModel.findById(id).session(session ?? null).exec();
        if (!checkout) return null;

        // Defensive Application-Level Expiry Guard
        if (
            checkout.expiresAt &&
            checkout.expiresAt.getTime() < Date.now() &&
            ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"].includes(checkout.status)
        ) {
            checkout.status = "EXPIRED";
            checkout.version += 1;
            if (session) {
                await checkout.save({ session });
            } else {
                await checkout.save();
            }
        }

        return checkout;
    }

    async findActiveByCartId(
        cartId: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<CheckoutDocument | null> {
        return await CheckoutModel.findOne({
            cartId: new Types.ObjectId(cartId),
            status: { $in: ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"] },
        })
            .sort({ createdAt: -1 })
            .session(session ?? null)
            .exec();
    }

    async findByIdempotencyKey(
        key: string,
        session?: ClientSession
    ): Promise<CheckoutDocument | null> {
        return await CheckoutModel.findOne({ idempotencyKey: key })
            .session(session ?? null)
            .exec();
    }

    async createCheckout(
        data: Omit<ICheckout, "version" | "createdAt" | "updatedAt">,
        session?: ClientSession
    ): Promise<CheckoutDocument> {
        const checkout = new CheckoutModel({
            ...data,
            version: 1,
        });

        if (session) {
            await checkout.save({ session });
        } else {
            await checkout.save();
        }

        return checkout;
    }

    async transitionStatus(
        id: string | Types.ObjectId,
        newStatus: CheckoutStatus,
        allowedCurrentStatuses: CheckoutStatus[],
        expectedVersion: number,
        updates?: Record<string, unknown>,
        session?: ClientSession
    ): Promise<CheckoutDocument> {
        const query = {
            _id: new Types.ObjectId(id),
            version: expectedVersion,
            status: { $in: allowedCurrentStatuses },
        };

        const updateData: Record<string, unknown> = {
            status: newStatus,
            ...(updates || {}),
        };

        const updated = await CheckoutModel.findOneAndUpdate(
            query,
            {
                $set: updateData,
                $inc: { version: 1 },
            },
            {
                new: true,
                session: session ?? null,
            }
        );

        if (!updated) {
            // Check if checkout exists to return a precise error
            const existing = await CheckoutModel.findById(id).session(session ?? null).exec();
            if (!existing) {
                throw new AppError("Checkout not found", 404, "CHECKOUT_NOT_FOUND");
            }
            if (!allowedCurrentStatuses.includes(existing.status)) {
                throw new AppError(
                    `Illegal status transition from '${existing.status}' to '${newStatus}'. Allowed current states: ${allowedCurrentStatuses.join(", ")}`,
                    409,
                    "INVALID_STATE_TRANSITION"
                );
            }
            if (existing.version !== expectedVersion) {
                throw new AppError(
                    `Checkout version conflict. Expected ${expectedVersion}, found ${existing.version}`,
                    409,
                    "OCC_CONFLICT"
                );
            }
            throw new AppError("Failed to transition checkout status", 409, "CHECKOUT_TRANSITION_FAILED");
        }

        return updated;
    }

    async updateAddressesAndPricing(
        id: string | Types.ObjectId,
        shippingAddress: CheckoutAddress | undefined,
        billingAddress: CheckoutAddress | undefined,
        pricing: ICheckoutPricing,
        expectedVersion: number,
        session?: ClientSession
    ): Promise<CheckoutDocument> {
        const existing = await this.findById(id, session);
        if (!existing) {
            throw new AppError("Checkout not found", 404, "CHECKOUT_NOT_FOUND");
        }

        if (!["INITIATED", "INVENTORY_RESERVED"].includes(existing.status)) {
            throw new AppError(
                `Cannot modify addresses when checkout is in '${existing.status}' state. Address is locked once payment is pending or completed.`,
                409,
                "STATE_LOCKED"
            );
        }

        if (existing.version !== expectedVersion) {
            throw new AppError(
                `Checkout version conflict. Expected ${expectedVersion}, found ${existing.version}`,
                409,
                "OCC_CONFLICT"
            );
        }

        if (shippingAddress) existing.shippingAddressSnapshot = shippingAddress;
        if (billingAddress) existing.billingAddressSnapshot = billingAddress;
        existing.pricing = pricing;
        existing.version += 1;

        if (session) {
            await existing.save({ session });
        } else {
            await existing.save();
        }

        return existing;
    }

    async findExpiredActiveCheckouts(
        limit = 50,
        session?: ClientSession
    ): Promise<CheckoutDocument[]> {
        return await CheckoutModel.find({
            expiresAt: { $lt: new Date() },
            status: { $in: ["INITIATED", "INVENTORY_RESERVED", "PAYMENT_PENDING"] },
        })
            .limit(limit)
            .session(session ?? null)
            .exec();
    }
}

export const checkoutRepository = new CheckoutRepository();
