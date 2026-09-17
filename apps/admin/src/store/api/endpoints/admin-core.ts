import { adminApi } from "../admin-api";
import type {
    CustomerListQuery,
    CustomerListResponse,
    CreateStaffUserInput,
    ListStaffUsersQuery,
    StaffUsersListResponse,
} from "@ecommers/api-client";
import type {
    AdminDashboardMetrics,
    SalesAnalyticsResponse,
    CustomerListItem,
    UserResponse,
    UserRole,
    AuditLogQuery,
    AuditLogListResponse,
    QueueJobsQuery,
    QueueJobsListResponse,
    QueueJobItem,
} from "@ecommers/types";

export interface SalesAnalyticsQuery {
    startDate?: string;
    endDate?: string;
    interval?: "day" | "week" | "month";
    currency?: string;
}

export const adminCoreApi = adminApi.injectEndpoints({
    endpoints: (builder) => ({
        getDashboardMetrics: builder.query<AdminDashboardMetrics, string | void>({
            query: (currency) => ({
                url: "/admin/dashboard",
                method: "GET",
                params: currency ? { currency } : undefined,
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: [{ type: "Analytics", id: "DASHBOARD" }],
        }),

        getSalesAnalytics: builder.query<SalesAnalyticsResponse, SalesAnalyticsQuery | void>({
            query: (params) => ({
                url: "/admin/analytics/sales",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => response?.data || response,
            providesTags: [{ type: "Analytics", id: "SALES" }],
        }),

        getCustomers: builder.query<CustomerListResponse, CustomerListQuery | void>({
            query: (params) => ({
                url: "/admin/customers",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items = Array.isArray(response?.items) ? [...response.items] : [];
                const pagination = response?.pagination || { page: 1, limit: 10, total: items.length, totalPages: 1 };
                return { items, pagination };
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.items.map((c: CustomerListItem) => ({ type: "Customers" as const, id: c.id })),
                        { type: "Customers", id: "LIST" },
                    ]
                    : [{ type: "Customers", id: "LIST" }],
        }),

        getStaffList: builder.query<StaffUsersListResponse, ListStaffUsersQuery | void>({
            query: (params) => ({
                url: "/admin/users",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                if (Array.isArray(response)) {
                    return {
                        items: [...response],
                        pagination: { page: 1, limit: response.length, total: response.length, totalPages: 1 },
                    };
                }
                const items = Array.isArray(response?.items) ? [...response.items] : [];
                const pagination = response?.pagination || { page: 1, limit: 10, total: items.length, totalPages: 1 };
                return { items, pagination };
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.items.map((s: UserResponse) => ({ type: "Staff" as const, id: s.id })),
                        { type: "Staff", id: "LIST" },
                    ]
                    : [{ type: "Staff", id: "LIST" }],
        }),

        createStaff: builder.mutation<UserResponse, CreateStaffUserInput>({
            query: (body) => ({
                url: "/admin/users",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Staff", id: "LIST" }],
        }),

        updateStaffRole: builder.mutation<UserResponse, { userId: string; role: UserRole }>({
            query: ({ userId, role }) => ({
                url: `/admin/users/${userId}/role`,
                method: "PATCH",
                body: { role },
            }),
            invalidatesTags: (_res, _err, { userId }) => [
                { type: "Staff", id: userId },
                { type: "Staff", id: "LIST" },
            ],
        }),

        updateStaffStatus: builder.mutation<UserResponse, { userId: string; isActive: boolean }>({
            query: ({ userId, isActive }) => ({
                url: `/admin/users/${userId}/status`,
                method: "PATCH",
                body: { isActive },
            }),
            invalidatesTags: (_res, _err, { userId }) => [
                { type: "Staff", id: userId },
                { type: "Staff", id: "LIST" },
            ],
        }),

        getAuditLogs: builder.query<AuditLogListResponse, AuditLogQuery | void>({
            query: (params) => ({
                url: "/admin/audit-logs",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items = Array.isArray(response?.items) ? [...response.items] : [];
                const pagination = response?.pagination || { page: 1, limit: 10, total: items.length, totalPages: 1 };
                return { items, pagination };
            },
            providesTags: [{ type: "AuditLogs", id: "LIST" }],
        }),

        getJobsList: builder.query<QueueJobsListResponse, QueueJobsQuery | void>({
            query: (params) => ({
                url: "/admin/jobs",
                method: "GET",
                params: params || undefined,
            }),
            transformResponse: (response: any) => {
                const items: QueueJobItem[] = Array.isArray(response?.items) ? [...response.items] : [];
                const pagination = response?.pagination || { page: 1, limit: 10, total: items.length, totalPages: 1 };
                return { items, pagination };
            },
            providesTags: [{ type: "Jobs", id: "LIST" }],
        }),

        retryJob: builder.mutation<{ message: string }, string>({
            query: (jobId) => ({
                url: `/admin/jobs/${jobId}/retry`,
                method: "POST",
            }),
            invalidatesTags: [{ type: "Jobs", id: "LIST" }],
        }),

        cancelJob: builder.mutation<{ message: string }, string>({
            query: (jobId) => ({
                url: `/admin/jobs/${jobId}/cancel`,
                method: "POST",
            }),
            invalidatesTags: [{ type: "Jobs", id: "LIST" }],
        }),
    }),
});

export const {
    useGetDashboardMetricsQuery,
    useGetSalesAnalyticsQuery,
    useGetCustomersQuery,
    useGetStaffListQuery,
    useCreateStaffMutation,
    useUpdateStaffRoleMutation,
    useUpdateStaffStatusMutation,
    useGetAuditLogsQuery,
    useGetJobsListQuery,
    useRetryJobMutation,
    useCancelJobMutation,
} = adminCoreApi;
