import { OrderStatus, OrderPaymentStatus, OrderFulfillmentStatus } from "../order/index.js";

export interface AdminFinancialBreakdown {
    currency: string;
    grossRevenueMinor: number;
    discountTotalMinor: number;
    taxTotalMinor: number;
    shippingTotalMinor: number;
    refundTotalMinor: number;
    netRevenueMinor: number;
    grossRevenue: number;
    netRevenue: number;
    discountTotal: number;
    taxTotal: number;
    shippingTotal: number;
    refundTotal: number;
}

export interface AdminOrderStatusBreakdown {
    byOrderStatus: Record<OrderStatus, number>;
    byPaymentStatus: Record<OrderPaymentStatus, number>;
    byFulfillmentStatus: Record<OrderFulfillmentStatus, number>;
}

export interface AdminTopProductItem {
    productId: string;
    variantId: string;
    sku: string;
    productTitle: string;
    variantTitle: string;
    unitsSold: number;
    totalRevenueMinor: number;
    totalRevenue: number;
    currency: string;
}

export interface AdminLowStockItem {
    productId: string;
    variantId: string;
    warehouseId: string;
    productTitle?: string;
    sku?: string;
    onHand: number;
    reserved: number;
    reorderThreshold: number;
}

export interface AdminRecentOrderItem {
    id: string;
    orderNumber: string;
    customerId?: string;
    customerEmail: string;
    grandTotalMinor: number;
    grandTotal: number;
    currency: string;
    orderStatus: OrderStatus;
    paymentStatus: OrderPaymentStatus;
    fulfillmentStatus: OrderFulfillmentStatus;
    itemCount: number;
    placedAt: string;
}

export interface AdminDashboardMetrics {
    financials: AdminFinancialBreakdown;
    orders: {
        totalOrders: number;
        breakdown: AdminOrderStatusBreakdown;
    };
    customers: {
        totalCustomers: number;
        newCustomersLast30Days: number;
        activeCustomersCount: number;
    };
    inventory: {
        lowStockCount: number;
        outOfStockCount: number;
        lowStockAlerts: AdminLowStockItem[];
    };
    topSellingProducts: AdminTopProductItem[];
    recentOrders: AdminRecentOrderItem[];
}

export interface SalesAnalyticsPoint {
    date: string;
    orderCount: number;
    grossRevenueMinor: number;
    grossRevenue: number;
    netRevenueMinor: number;
    netRevenue: number;
    averageOrderValueMinor: number;
    averageOrderValue: number;
    unitsSold: number;
    currency: string;
}

export interface SalesAnalyticsResponse {
    startDate: string;
    endDate: string;
    interval: "day" | "week" | "month";
    currency: string;
    summary: {
        totalOrders: number;
        totalUnitsSold: number;
        grossRevenueMinor: number;
        grossRevenue: number;
        netRevenueMinor: number;
        netRevenue: number;
        averageOrderValueMinor: number;
        averageOrderValue: number;
    };
    series: SalesAnalyticsPoint[];
}

export interface CustomerListItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    orderCount: number;
    lifetimeSpendMinor: number;
    lifetimeSpend: number;
    lastOrderDate?: string;
}
