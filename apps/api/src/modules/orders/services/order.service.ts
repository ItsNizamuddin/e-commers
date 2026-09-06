import { Types } from "mongoose";
import {
    AuditActor,
    OrderListQuery,
    OrderResponse,
    UpdateFulfillmentInput,
    CancelOrderInput,
    OrderFulfillmentStatus,
} from "@ecommers/types";
import { AppError } from "../../../utils/app-error.js";
import { inventoryRepository, InventoryRepository } from "../../inventory/repositories/inventory.repository.js";
import { inventoryService, InventoryService } from "../../inventory/services/inventory.service.js";
import { paymentRepository, PaymentRepository } from "../../payments/repositories/payment.repository.js";
import { orderRepository, OrderRepository } from "../repositories/order.repository.js";
import { OrderDocument } from "../types/order.types.js";

// Strict state transition map for fulfillment
const VALID_FULFILLMENT_TRANSITIONS: Record<OrderFulfillmentStatus, OrderFulfillmentStatus[]> = {
    UNFULFILLED: ["PROCESSING", "SHIPPED"],
    PROCESSING: ["SHIPPED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["RETURNED"],
    RETURNED: [],
};

export class OrderService {
    constructor(
        private readonly repo: OrderRepository = orderRepository,
        private readonly paymentRepo: PaymentRepository = paymentRepository,
        private readonly invService: InventoryService = inventoryService,
        private readonly invRepo: InventoryRepository = inventoryRepository
    ) {}

    mapOrderToResponse(doc: OrderDocument): OrderResponse {
        return {
            id: doc._id.toString(),
            orderNumber: doc.orderNumber,
            checkoutId: doc.checkoutId.toString(),
            paymentId: doc.paymentId.toString(),
            ...(doc.customerId ? { customerId: doc.customerId.toString() } : {}),
            customerEmailSnapshot: doc.customerEmailSnapshot,
            items: doc.items.map((i) => ({
                productId: i.productId,
                variantId: i.variantId,
                sku: i.sku,
                productTitle: i.productTitle,
                variantTitle: i.variantTitle,
                quantity: i.quantity,
                currency: i.currency,
                unitPriceMinor: i.unitPriceMinor,
                lineTotalMinor: i.lineTotalMinor,
            })),
            shippingAddressSnapshot: doc.shippingAddressSnapshot,
            billingAddressSnapshot: doc.billingAddressSnapshot,
            pricing: doc.pricing,
            orderStatus: doc.orderStatus,
            paymentStatus: doc.paymentStatus,
            fulfillmentStatus: doc.fulfillmentStatus,
            ...(doc.fulfillment ? { fulfillment: doc.fulfillment } : {}),
            ...(doc.createdBy ? { createdBy: doc.createdBy } : {}),
            ...(doc.updatedBy ? { updatedBy: doc.updatedBy } : {}),
            placedAt: doc.placedAt.toISOString(),
            ...(doc.cancelledAt ? { cancelledAt: doc.cancelledAt.toISOString() } : {}),
            version: doc.version,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
        };
    }

    async getCustomerOrderById(orderId: string, customerId: string): Promise<OrderResponse> {
        const order = await this.repo.findById(orderId);
        if (!order) {
            throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
        }

        if (order.customerId?.toString() !== customerId) {
            throw new AppError("Access denied to this order", 403, "FORBIDDEN");
        }

        return this.mapOrderToResponse(order);
    }

    async getGuestOrderById(orderId: string, guestAccessToken?: string): Promise<OrderResponse> {
        if (!guestAccessToken) {
            throw new AppError(
                "Access token is required to view guest order details",
                401,
                "TOKEN_REQUIRED"
            );
        }

        const order = await this.repo.findByIdWithGuestToken(orderId);
        if (!order) {
            throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
        }

        if (!order.guestAccessToken || order.guestAccessToken !== guestAccessToken) {
            throw new AppError("Invalid guest order access token", 403, "INVALID_TOKEN");
        }

        return this.mapOrderToResponse(order);
    }

    async listCustomerOrders(
        customerId: string,
        query: OrderListQuery
    ): Promise<{ orders: OrderResponse[]; total: number }> {
        const { orders, total } = await this.repo.listCustomerOrders(customerId, query);
        return {
            orders: orders.map((o) => this.mapOrderToResponse(o)),
            total,
        };
    }

    async listAdminOrders(
        query: OrderListQuery
    ): Promise<{ orders: OrderResponse[]; total: number }> {
        const { orders, total } = await this.repo.listAdminOrders(query);
        return {
            orders: orders.map((o) => this.mapOrderToResponse(o)),
            total,
        };
    }

    async getAdminOrderById(orderId: string): Promise<OrderResponse> {
        const order = await this.repo.findById(orderId);
        if (!order) {
            throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
        }
        return this.mapOrderToResponse(order);
    }

    async updateFulfillment(
        orderId: string,
        input: UpdateFulfillmentInput,
        actor?: AuditActor
    ): Promise<OrderResponse> {
        const order = await this.repo.findById(orderId);
        if (!order) {
            throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
        }

        if (order.orderStatus === "CANCELLED") {
            throw new AppError("Cannot fulfill a cancelled order", 400, "ORDER_CANCELLED");
        }

        const allowedTransitions = VALID_FULFILLMENT_TRANSITIONS[order.fulfillmentStatus] || [];
        if (!allowedTransitions.includes(input.fulfillmentStatus)) {
            throw new AppError(
                `Illegal fulfillment transition from '${order.fulfillmentStatus}' to '${input.fulfillmentStatus}'. Allowed: ${allowedTransitions.join(", ")}`,
                409,
                "INVALID_STATE_TRANSITION"
            );
        }

        const fulfillmentInfo =
            input.carrier !== undefined || input.trackingNumber !== undefined
                ? {
                      ...(input.carrier !== undefined ? { carrier: input.carrier } : {}),
                      ...(input.trackingNumber !== undefined
                          ? { trackingNumber: input.trackingNumber }
                          : {}),
                  }
                : undefined;

        const updated = await this.repo.updateFulfillmentWithOCC(
            orderId,
            input.expectedVersion,
            input.fulfillmentStatus,
            fulfillmentInfo,
            actor
        );

        if (!updated) {
            const recheck = await this.repo.findById(orderId);
            if (recheck && recheck.version !== input.expectedVersion) {
                throw new AppError(
                    `Order version conflict. Expected ${input.expectedVersion}, found ${recheck.version}`,
                    409,
                    "OCC_CONFLICT"
                );
            }
            throw new AppError("Failed to update fulfillment", 400, "UPDATE_FAILED");
        }

        return this.mapOrderToResponse(updated);
    }

    async cancelOrder(
        orderId: string,
        input: CancelOrderInput = {},
        actor?: AuditActor
    ): Promise<OrderResponse> {
        const order = await this.repo.findById(orderId);
        if (!order) {
            throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
        }

        if (order.orderStatus === "CANCELLED") {
            return this.mapOrderToResponse(order);
        }

        if (["SHIPPED", "DELIVERED", "RETURNED"].includes(order.fulfillmentStatus)) {
            throw new AppError(
                `Cannot cancel order once fulfillment has reached '${order.fulfillmentStatus}' status`,
                400,
                "CANNOT_CANCEL_SHIPPED_ORDER"
            );
        }

        // 1. Mark Order CANCELLED in DB
        const cancelled = await this.repo.cancelOrderWithOCC(
            orderId,
            input.expectedVersion,
            actor
        );

        if (!cancelled) {
            throw new AppError("Failed to cancel order due to version conflict", 409, "OCC_CONFLICT");
        }

        // 2. Asynchronous External Refund & Restock Workflow
        // Update payment status to REFUND_REQUESTED / REFUNDED
        const payment = await this.paymentRepo.findById(order.paymentId);
        if (payment && payment.status === "CAPTURED") {
            await this.paymentRepo.updateStatusWithOCC(
                payment._id,
                payment.version,
                "REFUND_REQUESTED"
            );
        }

        // Restock physical inventory for each item
        for (const item of order.items) {
            try {
                const invList = await this.invRepo.findByVariant(item.variantId);
                if (invList.length > 0 && invList[0]) {
                    await this.invService.adjustStock(
                        {
                            inventoryId: invList[0]._id.toString(),
                            delta: item.quantity,
                            reason: `Restock cancelled order ${order.orderNumber}`,
                            referenceType: "ORDER",
                            referenceId: order._id.toString(),
                        },
                        actor
                    );
                }
            } catch {
                // Log and continue restocking remaining items
            }
        }

        return this.mapOrderToResponse(cancelled);
    }
}

export const orderService = new OrderService();
