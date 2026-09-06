import { describe, it, expect, vi } from "vitest";
import { ApiClient } from "./client.js";
import { ApiClientError } from "./errors.js";
import { createInMemoryTokenStore } from "./token-store.js";

describe("ApiClient", () => {
    it("serializes query parameters and performs standard GET request", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({ success: true, data: { items: [1, 2, 3] } }),
        });

        const client = new ApiClient({
            baseUrl: "https://api.ecommers.test/api/v1",
            fetch: mockFetch as any,
        });

        const res = await client.get<{ items: number[] }>("/products", {
            params: { page: 1, limit: 10, search: "headphones" },
        });

        expect(res).toEqual({ items: [1, 2, 3] });
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [calledUrl, options] = mockFetch.mock.calls[0];
        expect(calledUrl).toBe("https://api.ecommers.test/api/v1/products?page=1&limit=10&search=headphones");
        expect(options.method).toBe("GET");
        expect(options.credentials).toBe("include");
    });

    it("injects Authorization Bearer header from in-memory token store", async () => {
        const tokenStore = createInMemoryTokenStore("access_token_123");

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({ success: true, data: { id: "user_1" } }),
        });

        const client = new ApiClient({
            baseUrl: "https://api.ecommers.test/api/v1",
            getAccessToken: tokenStore.getAccessToken,
            fetch: mockFetch as any,
        });

        await client.get("/users/me");

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers.get("Authorization")).toBe("Bearer access_token_123");
    });

    it("handles error response and throws ApiClientError with code and details", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            statusText: "Bad Request",
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid email address",
                    details: { email: ["Invalid format"] },
                },
            }),
        });

        const client = new ApiClient({
            baseUrl: "https://api.ecommers.test/api/v1",
            fetch: mockFetch as any,
        });

        await expect(client.post("/auth/register", { email: "invalid" })).rejects.toThrow(ApiClientError);

        try {
            await client.post("/auth/register", { email: "invalid" });
        } catch (err: any) {
            expect(err).toBeInstanceOf(ApiClientError);
            expect(err.status).toBe(400);
            expect(err.code).toBe("VALIDATION_ERROR");
            expect(err.message).toBe("Invalid email address");
            expect(err.details).toEqual({ email: ["Invalid format"] });
        }
    });

    it("executes single-flight refresh on concurrent 401s and retries queued requests", async () => {
        const tokenStore = createInMemoryTokenStore("expired_token");
        let refreshCount = 0;

        const onRefreshToken = vi.fn(async () => {
            refreshCount++;
            // Simulate async network latency
            await new Promise((resolve) => setTimeout(resolve, 50));
            return "fresh_token_456";
        });

        const mockFetch = vi.fn(async (_url: string, options: RequestInit) => {
            const auth = (options.headers as Headers).get("Authorization");
            if (auth === "Bearer expired_token") {
                return {
                    ok: false,
                    status: 401,
                    statusText: "Unauthorized",
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ success: false, error: { code: "UNAUTHORIZED", message: "Token expired" } }),
                };
            }
            if (auth === "Bearer fresh_token_456") {
                return {
                    ok: true,
                    status: 200,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ success: true, data: { ok: true } }),
                };
            }
            return {
                ok: false,
                status: 400,
                headers: new Headers(),
                json: async () => ({}),
            };
        });

        const client = new ApiClient({
            baseUrl: "https://api.ecommers.test/api/v1",
            getAccessToken: tokenStore.getAccessToken,
            setAccessToken: tokenStore.setAccessToken,
            onRefreshToken,
            fetch: mockFetch as any,
        });

        // Fire 3 simultaneous requests with expired token
        const [res1, res2, res3] = await Promise.all([
            client.get("/orders"),
            client.get("/products"),
            client.get("/cart"),
        ]);

        expect(res1).toEqual({ ok: true });
        expect(res2).toEqual({ ok: true });
        expect(res3).toEqual({ ok: true });

        // Crucial test: onRefreshToken must be called EXACTLY ONCE
        expect(onRefreshToken).toHaveBeenCalledTimes(1);
        expect(refreshCount).toBe(1);

        // Token store was updated with the fresh token
        expect(tokenStore.getAccessToken()).toBe("fresh_token_456");
    });

    it("handles AbortSignal cancellation cleanly", async () => {
        const controller = new AbortController();
        const mockFetch = vi.fn(async () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            throw error;
        });

        const client = new ApiClient({
            baseUrl: "https://api.ecommers.test/api/v1",
            fetch: mockFetch as any,
        });

        controller.abort();

        try {
            await client.get("/search", { signal: controller.signal });
            expect.unreachable();
        } catch (err: any) {
            expect(err).toBeInstanceOf(ApiClientError);
            expect(err.code).toBe("ABORT_ERROR");
        }
    });
});
