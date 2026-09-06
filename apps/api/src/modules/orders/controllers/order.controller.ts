import { RequestHandler } from "express";
import { AppError } from "../../../utils/app-error.js";
import { resolveActor } from "../../../utils/audit.js";
import { orderService, OrderService } from "../services/order.service.js";

export class OrderController {
    constructor(private readonly svc: OrderService = orderService) {}

    getMyOrders: RequestHandler = async (req, res, next) => {
        try {
            if (!req.user?.id) {
                throw new AppError("Authentication required", 401, "UNAUTHORIZED");
            }

            const result = await this.svc.listCustomerOrders(req.user.id, req.query);

            res.status(200).json({
                success: true,
                data: result.orders,
                meta: {
                    total: result.total,
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 10,
                },
            });
        } catch (err) {
            next(err);
        }
    };

    getOrderById: RequestHandler = async (req, res, next) => {
        try {
            const orderId = String(req.params.id);
            if (!orderId) {
                throw new AppError("Order ID is required", 400, "MISSING_ID");
            }

            if (req.user?.id) {
                // Authenticated customer request
                const order = await this.svc.getCustomerOrderById(orderId, req.user.id);
                res.status(200).json({
                    success: true,
                    data: order,
                });
            } else {
                // Guest request with possession token
                const guestToken = String(
                    req.query.token || req.headers["x-guest-token"] || ""
                );

                const order = await this.svc.getGuestOrderById(orderId, guestToken);
                res.status(200).json({
                    success: true,
                    data: order,
                });
            }
        } catch (err) {
            next(err);
        }
    };

    getAdminOrders: RequestHandler = async (req, res, next) => {
        try {
            const result = await this.svc.listAdminOrders(req.query);

            res.status(200).json({
                success: true,
                data: result.orders,
                meta: {
                    total: result.total,
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                },
            });
        } catch (err) {
            next(err);
        }
    };

    getAdminOrderById: RequestHandler = async (req, res, next) => {
        try {
            const orderId = String(req.params.id);
            if (!orderId) {
                throw new AppError("Order ID is required", 400, "MISSING_ID");
            }

            const order = await this.svc.getAdminOrderById(orderId);

            res.status(200).json({
                success: true,
                data: order,
            });
        } catch (err) {
            next(err);
        }
    };

    updateFulfillment: RequestHandler = async (req, res, next) => {
        try {
            const orderId = String(req.params.id);
            if (!orderId) {
                throw new AppError("Order ID is required", 400, "MISSING_ID");
            }

            const actor = await resolveActor(req.user?.id);

            const order = await this.svc.updateFulfillment(orderId, req.body, actor);

            res.status(200).json({
                success: true,
                data: order,
            });
        } catch (err) {
            next(err);
        }
    };

    cancelOrder: RequestHandler = async (req, res, next) => {
        try {
            const orderId = String(req.params.id);
            if (!orderId) {
                throw new AppError("Order ID is required", 400, "MISSING_ID");
            }

            const actor = req.user ? await resolveActor(req.user.id) : undefined;

            const order = await this.svc.cancelOrder(orderId, req.body, actor);

            res.status(200).json({
                success: true,
                data: order,
            });
        } catch (err) {
            next(err);
        }
    };
}

export const orderController = new OrderController();
