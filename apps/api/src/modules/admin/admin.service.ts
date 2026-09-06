import type {
    UserRole,
    AdminDashboardMetrics,
    AdminTopProductItem,
    AdminLowStockItem,
    AdminRecentOrderItem,
    SalesAnalyticsResponse,
    SalesAnalyticsPoint,
    CustomerListItem,
} from "@shopsphere/types";
import { AppError } from "../../utils/app-error.js";
import { hashPassword } from "../../utils/password.js";
import { UserModel } from "../users/user.model.js";
import { userRepository } from "../users/user.repository.js";
import { toUserResponse } from "../users/user.mapper.js";
import { OrderModel } from "../orders/models/order.model.js";
import { PaymentModel } from "../payments/models/payment.model.js";
import { InventoryModel } from "../inventory/inventory.model.js";
import type {
    CreateStaffUserInput,
    ListStaffUsersQuery,
    SalesAnalyticsQuery,
    CustomerListQuery,
} from "./admin.validation.js";

export const adminService = {
    async createStaffUser(
        _operatorId: string,
        operatorRole: UserRole,
        input: CreateStaffUserInput,
    ) {
        // Business Invariant: Only SUPER_ADMIN can create staff or admin users
        if (operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "Only SUPER_ADMIN users can create staff or admin accounts",
                403,
                "FORBIDDEN",
            );
        }

        const existingUser = await userRepository.findByEmail(input.email);
        if (existingUser) {
            throw new AppError(
                "An account with this email already exists",
                409,
                "EMAIL_ALREADY_EXISTS",
            );
        }

        const passwordHash = await hashPassword(input.password);

        const user = await userRepository.create({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
        });

        return toUserResponse(user);
    },

    async listStaffUsers(query: ListStaffUsersQuery) {
        const { page, limit, role } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = role
            ? { role }
            : { role: { $in: ["SUPER_ADMIN", "ADMIN", "SALES", "PUBLISHER", "SUPPORT_AGENT"] } };

        const [users, totalItems] = await Promise.all([
            UserModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            UserModel.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalItems / limit) || 1;

        return {
            data: users.map(toUserResponse),
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    },

    async updateUserRole(
        operatorId: string,
        operatorRole: UserRole,
        targetUserId: string,
        newRole: UserRole,
    ) {
        // Business Invariant 1: Only SUPER_ADMIN can update user roles
        if (operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "Only SUPER_ADMIN users can update user roles",
                403,
                "FORBIDDEN",
            );
        }

        if (operatorId === targetUserId) {
            throw new AppError(
                "You cannot modify your own administrative role",
                400,
                "INVALID_ACTION",
            );
        }

        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) {
            throw new AppError("Target user not found", 404, "USER_NOT_FOUND");
        }

        // Business Invariant 2: Cannot modify someone above your privilege level
        if (targetUser.role === "SUPER_ADMIN" && operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "You cannot modify someone above your privilege level",
                403,
                "FORBIDDEN",
            );
        }

        // Business Invariant 3: Protect last active SUPER_ADMIN from demotion
        if (targetUser.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
            const activeSuperAdminCount = await UserModel.countDocuments({
                role: "SUPER_ADMIN",
                isActive: true,
            });

            if (activeSuperAdminCount <= 1) {
                throw new AppError(
                    "Cannot demote the last active SUPER_ADMIN user in the system",
                    403,
                    "FORBIDDEN",
                );
            }
        }

        targetUser.role = newRole;
        await targetUser.save();

        return toUserResponse(targetUser);
    },

    async updateUserStatus(
        operatorId: string,
        operatorRole: UserRole,
        targetUserId: string,
        isActive: boolean,
    ) {
        if (operatorId === targetUserId) {
            throw new AppError(
                "You cannot modify your own account status",
                400,
                "INVALID_ACTION",
            );
        }

        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) {
            throw new AppError("Target user not found", 404, "USER_NOT_FOUND");
        }

        // Business Invariant 1: ADMIN cannot deactivate a SUPER_ADMIN
        if (targetUser.role === "SUPER_ADMIN" && operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "ADMIN cannot deactivate a SUPER_ADMIN account",
                403,
                "FORBIDDEN",
            );
        }

        // Business Invariant 2: Protect last active SUPER_ADMIN from deactivation
        if (targetUser.role === "SUPER_ADMIN" && !isActive) {
            const activeSuperAdminCount = await UserModel.countDocuments({
                role: "SUPER_ADMIN",
                isActive: true,
            });

            if (activeSuperAdminCount <= 1) {
                throw new AppError(
                    "Cannot deactivate the last active SUPER_ADMIN user in the system",
                    403,
                    "FORBIDDEN",
                );
            }
        }

        targetUser.isActive = isActive;
        await targetUser.save();

        return toUserResponse(targetUser);
    },

    async getDashboardMetrics(currency = "USD"): Promise<AdminDashboardMetrics> {
        const uppercaseCurrency = currency.toUpperCase();

        // 1. Order Financials & Status Aggregation
        const [orderAggregation] = await OrderModel.aggregate([
            { $match: { "pricing.currency": uppercaseCurrency } },
            {
                $facet: {
                    financials: [
                        {
                            $match: {
                                orderStatus: { $in: ["CONFIRMED", "COMPLETED"] },
                                paymentStatus: { $in: ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"] },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                grossRevenueMinor: {
                                    $sum: {
                                        $add: [
                                            "$pricing.subtotalMinor",
                                            "$pricing.shippingMinor",
                                            "$pricing.taxMinor",
                                        ],
                                    },
                                },
                                discountTotalMinor: { $sum: "$pricing.discountMinor" },
                                taxTotalMinor: { $sum: "$pricing.taxMinor" },
                                shippingTotalMinor: { $sum: "$pricing.shippingMinor" },
                            },
                        },
                    ],
                    byOrderStatus: [
                        { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
                    ],
                    byPaymentStatus: [
                        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
                    ],
                    byFulfillmentStatus: [
                        { $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } },
                    ],
                    totalOrders: [{ $count: "count" }],
                    topSelling: [
                        {
                            $match: {
                                orderStatus: { $in: ["CONFIRMED", "COMPLETED"] },
                            },
                        },
                        { $unwind: "$items" },
                        {
                            $group: {
                                _id: {
                                    sku: "$items.sku",
                                    variantId: "$items.variantId",
                                    productId: "$items.productId",
                                },
                                productTitle: { $first: "$items.productTitle" },
                                variantTitle: { $first: "$items.variantTitle" },
                                unitsSold: { $sum: "$items.quantity" },
                                totalRevenueMinor: { $sum: "$items.lineTotalMinor" },
                            },
                        },
                        { $sort: { unitsSold: -1, totalRevenueMinor: -1 } },
                        { $limit: 5 },
                    ],
                },
            },
        ]);

        // 2. Query Refund totals from PaymentModel for accuracy
        const [refundAggregation] = await PaymentModel.aggregate([
            {
                $match: {
                    currency: uppercaseCurrency,
                    status: { $in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRefundedMinor: { $sum: "$amountMinor" },
                },
            },
        ]);

        // 3. User / Customer Metrics
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [userAggregation] = await UserModel.aggregate([
            { $match: { role: "CUSTOMER" } },
            {
                $facet: {
                    total: [{ $count: "count" }],
                    active: [{ $match: { isActive: true } }, { $count: "count" }],
                    newLast30Days: [
                        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                        { $count: "count" },
                    ],
                },
            },
        ]);

        // 4. Inventory Alerts (Low stock & Out of stock)
        const [inventoryAggregation] = await InventoryModel.aggregate([
            {
                $facet: {
                    lowStockCount: [
                        { $match: { $expr: { $lte: ["$onHand", "$reorderThreshold"] } } },
                        { $count: "count" },
                    ],
                    outOfStockCount: [
                        { $match: { onHand: { $lte: 0 } } },
                        { $count: "count" },
                    ],
                    alerts: [
                        { $match: { $expr: { $lte: ["$onHand", "$reorderThreshold"] } } },
                        { $sort: { onHand: 1 } },
                        { $limit: 10 },
                    ],
                },
            },
        ]);

        // 5. Recent 5 Orders
        const recentOrdersRaw = await OrderModel.find({ "pricing.currency": uppercaseCurrency })
            .sort({ placedAt: -1 })
            .limit(5)
            .lean();

        // Assemble Financials
        const fin = orderAggregation?.financials?.[0] || {};
        const grossRevenueMinor = fin.grossRevenueMinor || 0;
        const discountTotalMinor = fin.discountTotalMinor || 0;
        const taxTotalMinor = fin.taxTotalMinor || 0;
        const shippingTotalMinor = fin.shippingTotalMinor || 0;
        const refundTotalMinor = refundAggregation?.totalRefundedMinor || 0;
        const netRevenueMinor = Math.max(0, grossRevenueMinor - discountTotalMinor - refundTotalMinor);

        // Assemble Status Breakdowns (guaranteeing all enum keys exist)
        const orderStatusMap: Record<string, number> = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 };
        for (const item of orderAggregation?.byOrderStatus || []) {
            if (item._id) orderStatusMap[item._id] = item.count;
        }

        const paymentStatusMap: Record<string, number> = {
            PENDING: 0,
            AUTHORIZED: 0,
            CAPTURED: 0,
            FAILED: 0,
            REFUND_REQUESTED: 0,
            REFUNDED: 0,
            PARTIALLY_REFUNDED: 0,
        };
        for (const item of orderAggregation?.byPaymentStatus || []) {
            if (item._id) paymentStatusMap[item._id] = item.count;
        }

        const fulfillmentStatusMap: Record<string, number> = {
            UNFULFILLED: 0,
            PROCESSING: 0,
            SHIPPED: 0,
            DELIVERED: 0,
            RETURNED: 0,
        };
        for (const item of orderAggregation?.byFulfillmentStatus || []) {
            if (item._id) fulfillmentStatusMap[item._id] = item.count;
        }

        const topSellingProducts: AdminTopProductItem[] = (orderAggregation?.topSelling || []).map((t: any) => ({
            productId: t._id.productId ? t._id.productId.toString() : "",
            variantId: t._id.variantId ? t._id.variantId.toString() : "",
            sku: t._id.sku || "",
            productTitle: t.productTitle || "",
            variantTitle: t.variantTitle || "",
            unitsSold: t.unitsSold || 0,
            totalRevenueMinor: t.totalRevenueMinor || 0,
            totalRevenue: (t.totalRevenueMinor || 0) / 100,
            currency: uppercaseCurrency,
        }));

        const lowStockAlerts: AdminLowStockItem[] = (inventoryAggregation?.alerts || []).map((inv: any) => ({
            productId: inv.productId.toString(),
            variantId: inv.variantId.toString(),
            warehouseId: inv.warehouseId.toString(),
            onHand: inv.onHand,
            reserved: inv.reserved,
            reorderThreshold: inv.reorderThreshold,
        }));

        const recentOrders: AdminRecentOrderItem[] = recentOrdersRaw.map((o: any) => ({
            id: o._id.toString(),
            orderNumber: o.orderNumber,
            customerId: o.customerId?.toString(),
            customerEmail: o.customerEmailSnapshot,
            grandTotalMinor: o.pricing.grandTotalMinor,
            grandTotal: o.pricing.grandTotalMinor / 100,
            currency: o.pricing.currency,
            orderStatus: o.orderStatus,
            paymentStatus: o.paymentStatus,
            fulfillmentStatus: o.fulfillmentStatus,
            itemCount: o.items?.length || 0,
            placedAt: o.placedAt ? new Date(o.placedAt).toISOString() : new Date(o.createdAt).toISOString(),
        }));

        return {
            financials: {
                currency: uppercaseCurrency,
                grossRevenueMinor,
                discountTotalMinor,
                taxTotalMinor,
                shippingTotalMinor,
                refundTotalMinor,
                netRevenueMinor,
                grossRevenue: grossRevenueMinor / 100,
                netRevenue: netRevenueMinor / 100,
                discountTotal: discountTotalMinor / 100,
                taxTotal: taxTotalMinor / 100,
                shippingTotal: shippingTotalMinor / 100,
                refundTotal: refundTotalMinor / 100,
            },
            orders: {
                totalOrders: orderAggregation?.totalOrders?.[0]?.count || 0,
                breakdown: {
                    byOrderStatus: orderStatusMap as any,
                    byPaymentStatus: paymentStatusMap as any,
                    byFulfillmentStatus: fulfillmentStatusMap as any,
                },
            },
            customers: {
                totalCustomers: userAggregation?.total?.[0]?.count || 0,
                newCustomersLast30Days: userAggregation?.newLast30Days?.[0]?.count || 0,
                activeCustomersCount: userAggregation?.active?.[0]?.count || 0,
            },
            inventory: {
                lowStockCount: inventoryAggregation?.lowStockCount?.[0]?.count || 0,
                outOfStockCount: inventoryAggregation?.outOfStockCount?.[0]?.count || 0,
                lowStockAlerts,
            },
            topSellingProducts,
            recentOrders,
        };
    },

    async getSalesAnalytics(query: SalesAnalyticsQuery): Promise<SalesAnalyticsResponse> {
        const interval = query.interval || "day";
        const currency = (query.currency || "USD").toUpperCase();
        const end = query.endDate ? new Date(query.endDate) : new Date();
        const start = query.startDate
            ? new Date(query.startDate)
            : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        const seriesRaw = await OrderModel.aggregate([
            {
                $match: {
                    "pricing.currency": currency,
                    orderStatus: { $in: ["CONFIRMED", "COMPLETED"] },
                    placedAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: {
                        $dateTrunc: {
                            date: "$placedAt",
                            unit: interval,
                            binSize: 1,
                        },
                    },
                    orderCount: { $sum: 1 },
                    grossRevenueMinor: {
                        $sum: {
                            $add: [
                                "$pricing.subtotalMinor",
                                "$pricing.shippingMinor",
                                "$pricing.taxMinor",
                            ],
                        },
                    },
                    discountTotalMinor: { $sum: "$pricing.discountMinor" },
                    unitsSold: {
                        $sum: {
                            $reduce: {
                                input: "$items",
                                initialValue: 0,
                                in: { $add: ["$$value", "$$this.quantity"] },
                            },
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        let totalOrders = 0;
        let totalUnitsSold = 0;
        let totalGrossMinor = 0;
        let totalNetMinor = 0;

        const series: SalesAnalyticsPoint[] = seriesRaw.map((p: any) => {
            const grossMinor = p.grossRevenueMinor || 0;
            const discountMinor = p.discountTotalMinor || 0;
            const netMinor = Math.max(0, grossMinor - discountMinor);
            const aovMinor = p.orderCount > 0 ? Math.round(netMinor / p.orderCount) : 0;

            totalOrders += p.orderCount;
            totalUnitsSold += p.unitsSold;
            totalGrossMinor += grossMinor;
            totalNetMinor += netMinor;

            const dateStr = p._id instanceof Date ? p._id.toISOString().split("T")[0] : String(p._id);

            return {
                date: dateStr,
                orderCount: p.orderCount,
                grossRevenueMinor: grossMinor,
                grossRevenue: grossMinor / 100,
                netRevenueMinor: netMinor,
                netRevenue: netMinor / 100,
                averageOrderValueMinor: aovMinor,
                averageOrderValue: aovMinor / 100,
                unitsSold: p.unitsSold,
                currency,
            };
        });

        const overallAovMinor = totalOrders > 0 ? Math.round(totalNetMinor / totalOrders) : 0;

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            interval,
            currency,
            summary: {
                totalOrders,
                totalUnitsSold,
                grossRevenueMinor: totalGrossMinor,
                grossRevenue: totalGrossMinor / 100,
                netRevenueMinor: totalNetMinor,
                netRevenue: totalNetMinor / 100,
                averageOrderValueMinor: overallAovMinor,
                averageOrderValue: overallAovMinor / 100,
            },
            series,
        };
    },

    async listCustomers(query: CustomerListQuery) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const matchStage: Record<string, any> = { role: "CUSTOMER" };

        if (query.status === "active") {
            matchStage.isActive = true;
        } else if (query.status === "inactive") {
            matchStage.isActive = false;
        }

        if (query.search && query.search.trim()) {
            const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const reg = new RegExp(escaped, "i");
            matchStage.$or = [{ email: reg }, { firstName: reg }, { lastName: reg }];
        }

        let sortStage: Record<string, any> = { createdAt: -1 };
        if (query.sortBy === "spent") {
            sortStage = { lifetimeSpendMinor: -1, createdAt: -1 };
        } else if (query.sortBy === "orders") {
            sortStage = { orderCount: -1, createdAt: -1 };
        }

        const [result] = await UserModel.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: "orders",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$customerId", "$$userId"] },
                                orderStatus: { $ne: "CANCELLED" },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                totalSpentMinor: { $sum: "$pricing.grandTotalMinor" },
                                lastOrder: { $max: "$placedAt" },
                            },
                        },
                    ],
                    as: "orderStats",
                },
            },
            {
                $addFields: {
                    stats: { $arrayElemAt: ["$orderStats", 0] },
                },
            },
            {
                $project: {
                    _id: 1,
                    email: 1,
                    firstName: 1,
                    lastName: 1,
                    role: 1,
                    isActive: 1,
                    createdAt: 1,
                    orderCount: { $ifNull: ["$stats.count", 0] },
                    lifetimeSpendMinor: { $ifNull: ["$stats.totalSpentMinor", 0] },
                    lastOrderDate: "$stats.lastOrder",
                },
            },
            { $sort: sortStage },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }],
                    total: [{ $count: "count" }],
                },
            },
        ]);

        const totalItems = result?.total?.[0]?.count || 0;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        const data: CustomerListItem[] = (result?.data || []).map((u: any) => ({
            id: u._id.toString(),
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            isActive: u.isActive,
            createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
            orderCount: u.orderCount,
            lifetimeSpendMinor: u.lifetimeSpendMinor,
            lifetimeSpend: u.lifetimeSpendMinor / 100,
            lastOrderDate: u.lastOrderDate ? new Date(u.lastOrderDate).toISOString() : undefined,
        }));

        return {
            data,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    },
};

