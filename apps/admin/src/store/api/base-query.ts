import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { api } from "../../lib/api";
import { ApiClientError } from "@ecommers/api-client";

export interface ApiClientBaseQueryArgs {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: any;
    params?: Record<string, any>;
    headers?: HeadersInit;
}

export interface ApiClientBaseQueryError {
    status?: number;
    message: string;
    code?: string;
    details?: any;
}

export const apiClientBaseQuery = (): BaseQueryFn<
    ApiClientBaseQueryArgs,
    unknown,
    ApiClientBaseQueryError
> => async ({ url, method = "GET", body, params, headers }) => {
    try {
        const normalizedMethod = method.toUpperCase();
        let data: unknown;

        if (normalizedMethod === "GET") {
            data = await api.client.get(url, { params, headers });
        } else if (normalizedMethod === "POST") {
            data = await api.client.post(url, body, { params, headers });
        } else if (normalizedMethod === "PUT") {
            data = await api.client.put(url, body, { params, headers });
        } else if (normalizedMethod === "PATCH") {
            data = await api.client.patch(url, body, { params, headers });
        } else if (normalizedMethod === "DELETE") {
            data = await api.client.delete(url, { params, headers });
        } else {
            data = await api.client.request(url, {
                method: normalizedMethod,
                body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
                params,
                headers,
            });
        }

        const sanitizedData = Array.isArray(data) ? [...data] : data;
        return { data: sanitizedData };
    } catch (err: unknown) {
        if (err instanceof ApiClientError) {
            return {
                error: {
                    status: err.status,
                    code: err.code,
                    message: err.message,
                    details: err.details,
                },
            };
        }

        const error = err as Error;
        return {
            error: {
                status: 500,
                message: error?.message || "An unexpected error occurred",
            },
        };
    }
};
