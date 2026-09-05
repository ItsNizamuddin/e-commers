import { UserRole } from "./user.js";

export const Permissions = {
    STAFF_CREATE: "staff.create",
    STAFF_READ: "staff.read",
    STAFF_ROLE_UPDATE: "staff.role.update",
    STAFF_STATUS_UPDATE: "staff.status.update",

    CATEGORY_CREATE: "category.create",
    CATEGORY_READ: "category.read",
    CATEGORY_UPDATE: "category.update",
    CATEGORY_DELETE: "category.delete",

    PRODUCT_CREATE: "product.create",
    PRODUCT_READ: "product.read",
    PRODUCT_UPDATE: "product.update",
    PRODUCT_DELETE: "product.delete",
    PRODUCT_PUBLISH: "product.publish",

    ORDER_READ: "order.read",
    ORDER_UPDATE: "order.update",
    ORDER_FULFILL: "order.fulfill",

    INVENTORY_READ: "inventory.read",
    INVENTORY_ADJUST: "inventory.adjust",
    INVENTORY_UPDATE: "inventory.update",

    CUSTOMER_READ: "customer.read",

    ANALYTICS_READ: "analytics.read",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(Permissions);

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
    SUPER_ADMIN: ALL_PERMISSIONS,
    ADMIN: [
        Permissions.STAFF_READ,
        Permissions.CATEGORY_CREATE,
        Permissions.CATEGORY_READ,
        Permissions.CATEGORY_UPDATE,
        Permissions.CATEGORY_DELETE,
        Permissions.PRODUCT_CREATE,
        Permissions.PRODUCT_READ,
        Permissions.PRODUCT_UPDATE,
        Permissions.PRODUCT_DELETE,
        Permissions.PRODUCT_PUBLISH,
        Permissions.INVENTORY_READ,
        Permissions.INVENTORY_ADJUST,
        Permissions.INVENTORY_UPDATE,
        Permissions.ORDER_READ,
        Permissions.ORDER_UPDATE,
        Permissions.ORDER_FULFILL,
        Permissions.CUSTOMER_READ,
        Permissions.ANALYTICS_READ,
    ],
    SALES: [
        Permissions.CATEGORY_READ,
        Permissions.PRODUCT_READ,
        Permissions.INVENTORY_READ,
        Permissions.ORDER_READ,
        Permissions.ORDER_UPDATE,
        Permissions.ORDER_FULFILL,
        Permissions.CUSTOMER_READ,
        Permissions.ANALYTICS_READ,
    ],
    PUBLISHER: [
        Permissions.CATEGORY_CREATE,
        Permissions.CATEGORY_READ,
        Permissions.CATEGORY_UPDATE,
        Permissions.PRODUCT_CREATE,
        Permissions.PRODUCT_READ,
        Permissions.PRODUCT_UPDATE,
        Permissions.PRODUCT_PUBLISH,
    ],
    SUPPORT_AGENT: [
        Permissions.CATEGORY_READ,
        Permissions.PRODUCT_READ,
        Permissions.INVENTORY_READ,
        Permissions.CUSTOMER_READ,
        Permissions.ORDER_READ,
    ],
    CUSTOMER: [
        Permissions.CATEGORY_READ,
        Permissions.PRODUCT_READ,
    ],
};
