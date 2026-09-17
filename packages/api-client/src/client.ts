import { ApiClientError } from "./errors";

export interface RequestOptions extends RequestInit {
    params?: Record<string, any>;
    isRefreshRequest?: boolean;
    _isRetry?: boolean;
}

export interface ApiClientConfig {
    baseUrl: string;
    getAccessToken?: () => string | null;
    setAccessToken?: (token: string | null) => void;
    onRefreshToken?: () => Promise<string | null>;
    onUnauthorized?: () => void;
    fetch?: typeof fetch;
}

export class ApiClient {
    private readonly baseUrl: string;
    private readonly customFetch: typeof fetch;
    private inFlightRefreshPromise: Promise<string | null> | null = null;

    constructor(private readonly config: ApiClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, "");
        this.customFetch = config.fetch || globalThis.fetch.bind(globalThis);
    }

    private async executeSingleFlightRefresh(): Promise<string | null> {
        if (this.inFlightRefreshPromise) {
            return this.inFlightRefreshPromise;
        }

        if (!this.config.onRefreshToken) {
            return null;
        }

        this.inFlightRefreshPromise = (async () => {
            try {
                const newToken = await this.config.onRefreshToken!();
                if (newToken && this.config.setAccessToken) {
                    this.config.setAccessToken(newToken);
                }
                return newToken;
            } catch (err) {
                if (this.config.setAccessToken) {
                    this.config.setAccessToken(null);
                }
                if (this.config.onUnauthorized) {
                    this.config.onUnauthorized();
                }
                return null;
            } finally {
                this.inFlightRefreshPromise = null;
            }
        })();

        return this.inFlightRefreshPromise;
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { params, isRefreshRequest, _isRetry, headers: customHeaders, ...init } = options;

        let url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null && value !== "") {
                    searchParams.append(key, String(value));
                }
            }
            const queryString = searchParams.toString();
            if (queryString) {
                url += `${url.includes("?") ? "&" : "?"}${queryString}`;
            }
        }

        const headers = new Headers(customHeaders);
        if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }

        const token = this.config.getAccessToken?.();
        if (token && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        try {
            const res = await this.customFetch(url, {
                ...init,
                headers,
                credentials: init.credentials || "include",
            });

            // 1. Handle 401 Unauthorized with Single-Flight Refresh
            if (res.status === 401 && !isRefreshRequest && !_isRetry) {
                const refreshedToken = await this.executeSingleFlightRefresh();
                if (refreshedToken) {
                    return this.request<T>(endpoint, {
                        ...options,
                        _isRetry: true,
                    });
                }
            }

            // 2. Parse JSON
            let json: any = null;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                json = await res.json().catch(() => null);
            }

            // 3. Handle Error Statuses
            if (!res.ok) {
                const code = json?.error?.code || (res.status === 401 ? "UNAUTHORIZED" : "HTTP_ERROR");
                const message = json?.error?.message || res.statusText || `HTTP ${res.status}`;
                const details = json?.error?.details;

                if (res.status === 401 && this.config.onUnauthorized) {
                    this.config.onUnauthorized();
                }

                throw new ApiClientError(message, res.status, code, details);
            }

            if (json?.data !== undefined) {
                if (Array.isArray(json.data) && (json.meta !== undefined || json.pagination !== undefined)) {
                    const rawMeta = json.meta || json.pagination;
                    const total = Number(rawMeta.total ?? json.data.length) || 0;
                    const limit = Number(rawMeta.limit ?? 10) || 10;
                    const page = Number(rawMeta.page ?? 1) || 1;
                    const totalPages = Number(rawMeta.totalPages ?? Math.ceil(total / limit)) || 1;

                    const pagination = {
                        page,
                        limit,
                        total,
                        totalPages,
                    };

                    try {
                        Object.defineProperties(json.data, {
                            items: { value: json.data, enumerable: false, writable: true, configurable: true },
                            pagination: { value: pagination, enumerable: false, writable: true, configurable: true },
                            meta: { value: pagination, enumerable: false, writable: true, configurable: true },
                        });
                    } catch {
                        // ignore if non-extensible
                    }
                }
                return json.data as T;
            }

            return json as T;
        } catch (err: any) {
            if (err instanceof ApiClientError) {
                throw err;
            }
            if (err.name === "AbortError") {
                throw new ApiClientError("Request was aborted", 0, "ABORT_ERROR");
            }
            throw new ApiClientError(err.message || "Network request failed", 0, "NETWORK_ERROR");
        }
    }

    get<T>(endpoint: string, options?: Omit<RequestOptions, "method">): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: "GET" });
    }

    post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "POST",
            body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
        });
    }

    put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "PUT",
            body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
        });
    }

    patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: "PATCH",
            body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
        });
    }

    delete<T>(endpoint: string, options?: Omit<RequestOptions, "method">): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: "DELETE" });
    }
}
