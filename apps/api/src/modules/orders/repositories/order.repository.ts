import crypto from "crypto";
import { ClientSession, Types } from "mongoose";
import { AuditActor, OrderListQuery, OrderFulfillmentStatus, OrderStatus } from "@shopsphere/types";
import { OrderModel } from "../models/order.model.js";
import { IOrder, OrderDocument } from "../types/order.types.js";

export class OrderRepository {
    async generateCollisionSafeOrderNumber(): Promise<string> {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const maxAttempts = 10;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
            const orderNumber = `ORD-${dateStr}-${randomCode}`;

            const existing = await OrderModel.findOne({ orderNumber }).lean();
            if (!existing) {
                return orderNumber;
            }
        }

        // Fallback with timestamp suffix
        return `ORD-${dateStr}-${Date.now().toString(36).toUpperCase()}`;
    }

    async create(
        data: Partial<IOrder>,
        session?: ClientSession
    ): Promise<OrderDocument> {
        const doc = new OrderModel(data);
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
    ): Promise<OrderDocument | null> {
        return OrderModel.findById(id).session(session ?? null).exec();
    }

    async findByIdWithGuestToken(
        id: Types.ObjectId | string
    ): Promise<OrderDocument | null> {
        return OrderModel.findById(id).select("+guestAccessToken").exec();
    }

    async findByOrderNumber(
        orderNumber: string,
        session?: ClientSession
    ): Promise<OrderDocument | null> {
        return OrderModel.findOne({ orderNumber }).session(session ?? null).exec();
    }

    async findByCheckoutId(
        checkoutId: Types.ObjectId | string,
        session?: ClientSession
    ): Promise<OrderDocument | null> {
        return OrderModel.findOne({
            checkoutId: new Types.ObjectId(checkoutId.toString()),
        }).session(session ?? null).exec();
    }

    async listCustomerOrders(
        customerId: Types.ObjectId | string,
        query: OrderListQuery
    ): Promise<{ orders: OrderDocument[]; total: number }> {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 10));
        const skip = (page - 1) * limit;

        const filter: any = {
            customerId: new Types.ObjectId(customerId.toString()),
        };

        if (query.orderStatus) {
            filter.orderStatus = query.orderStatus;
        }

        const [orders, total] = await Promise.all([
            OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            OrderModel.countDocuments(filter),
        ]);

        return { orders, total };
    }

    async listAdminOrders(
        query: OrderListQuery
    ): Promise<{ orders: OrderDocument[]; total: number }> {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;

        const filter: any = {};

        if (query.orderStatus) filter.orderStatus = query.orderStatus;
        if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
        if (query.fulfillmentStatus) filter.fulfillmentStatus = query.fulfillmentStatus;
        if (query.customerId) filter.customerId = new Types.ObjectId(query.customerId);
        if (query.search) {
            filter.$or = [
                { orderNumber: { $regex: query.search, $options: "i" } },
                { customerEmailSnapshot: { $regex: query.search, $options: "i" } },
            ];
        }

        const [orders, total] = await Promise.all([
            OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            OrderModel.countDocuments(filter),
        ]);

        return { orders, total };
    }

    async updateFulfillmentWithOCC(
        id: Types.ObjectId | string,
        expectedVersion: number,
        newFulfillmentStatus: OrderFulfillmentStatus,
        fulfillmentInfo?: { carrier?: string | undefined; trackingNumber?: string | undefined } | undefined,
        actor?: AuditActor | undefined,
        session?: ClientSession | undefined
    ): Promise<OrderDocument | null> {
        const now = new Date();
        const setPayload: any = {
            fulfillmentStatus: newFulfillmentStatus,
            ...(actor ? { updatedBy: actor } : {}),
        };

        if (fulfillmentInfo?.carrier) setPayload["fulfillment.carrier"] = fulfillmentInfo.carrier;
        if (fulfillmentInfo?.trackingNumber)
            setPayload["fulfillment.trackingNumber"] = fulfillmentInfo.trackingNumber;
        if (newFulfillmentStatus === "SHIPPED") setPayload["fulfillment.shippedAt"] = now;
        if (newFulfillmentStatus === "DELIVERED") setPayload["fulfillment.deliveredAt"] = now;

        // Auto-complete order when delivered
        if (newFulfillmentStatus === "DELIVERED") {
            setPayload.orderStatus = "COMPLETED";
        }

        return OrderModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(id.toString()),
                version: expectedVersion,
            },
            {
                $set: setPayload,
                $inc: { version: 1 },
            },
            {
                new: true,
                session: session ?? null,
            }
        ).exec();
    }

    async cancelOrderWithOCC(
        id: Types.ObjectId | string,
        expectedVersion?: number,
        actor?: AuditActor,
        session?: ClientSession
    ): Promise<OrderDocument | null> {
        const filter: any = {
            _id: new Types.ObjectId(id.toString()),
            orderStatus: { $in: ["PENDING", "CONFIRMED"] },
        };

        if (typeof expectedVersion === "number") {
            filter.version = expectedVersion;
        }

        return OrderModel.findOneAndUpdate(
            filter,
            {
                $set: {
                    orderStatus: "CANCELLED" as OrderStatus,
                    cancelledAt: new Date(),
                    ...(actor ? { updatedBy: actor } : {}),
                },
                $inc: { version: 1 },
            },
            {
                new: true,
                session: session ?? null,
            }
        ).exec();
    }
}

export const orderRepository = new OrderRepository();
