import type { ApiClient } from "../client";
import type {
    AdminDashboardMetrics,
    SalesAnalyticsResponse,
    CustomerListItem,
    UserResponse,
    UserRole,
    AuditLogQuery,
    AuditLogListResponse,
} from "@ecommers/types";

export interface SalesAnalyticsQuery {
    startDate?: string;
    endDate?: string;
    interval?: "day" | "week" | "month";
    currency?: string;
}

export interface CustomerListQuery {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: "spend" | "orders" | "createdAt";
    sortOrder?: "asc" | "desc";
}

export interface CustomerListResponse {
    items: CustomerListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CreateStaffUserInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phoneNumber?: string;
}

export interface ListStaffUsersQuery {
    page?: number;
    limit?: number;
    role?: UserRole;
    isActive?: boolean;
}

export interface StaffUsersListResponse {
    items: UserResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class AdminClient {
    constructor(private readonly client: ApiClient) {}

    async getDashboard(currency?: string): Promise<AdminDashboardMetrics> {
        return this.client.get<AdminDashboardMetrics>("/admin/dashboard", { params: { currency } });
    }

    async getSalesAnalytics(params?: SalesAnalyticsQuery): Promise<SalesAnalyticsResponse> {
        return this.client.get<SalesAnalyticsResponse>("/admin/analytics/sales", { params });
    }

    async getCustomers(params?: CustomerListQuery): Promise<CustomerListResponse> {
        return this.client.get<CustomerListResponse>("/admin/customers", { params });
    }

    async listStaff(params?: ListStaffUsersQuery): Promise<StaffUsersListResponse | UserResponse[]> {
        return this.client.get<StaffUsersListResponse | UserResponse[]>("/admin/users", { params });
    }

    async createStaff(body: CreateStaffUserInput): Promise<UserResponse> {
        return this.client.post<UserResponse>("/admin/users", body);
    }

    async updateStaffRole(userId: string, role: UserRole): Promise<UserResponse> {
        return this.client.patch<UserResponse>(`/admin/users/${userId}/role`, { role });
    }

    async updateStaffStatus(userId: string, isActive: boolean): Promise<UserResponse> {
        return this.client.patch<UserResponse>(`/admin/users/${userId}/status`, { isActive });
    }

    async getAuditLogs(params?: AuditLogQuery): Promise<AuditLogListResponse> {
        return this.client.get<AuditLogListResponse>("/admin/audit-logs", { params });
    }
}
