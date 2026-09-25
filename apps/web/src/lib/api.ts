import { createEcommersClient, type EcommersApi } from "@ecommers/api-client";

let inMemoryAccessToken: string | null = null;

export const getAccessToken = (): string | null => inMemoryAccessToken;

export const setAccessToken = (token: string | null): void => {
    inMemoryAccessToken = token;
};

export const api: EcommersApi = createEcommersClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1",
    getAccessToken,
    setAccessToken,
    onRefreshToken: async () => {
        try {
            const res = await api.auth.refresh();
            setAccessToken(res.accessToken);
            return res.accessToken;
        } catch {
            setAccessToken(null);
            return null;
        }
    },
});
