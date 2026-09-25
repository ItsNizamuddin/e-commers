import type { ApiClient } from "../client";
import type { UserResponse } from "@ecommers/types";

export interface AuthLoginInput {
    email: string;
    password: string;
}

export interface AuthRegisterInput {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export interface AuthSessionResponse {
    user: UserResponse;
    accessToken: string;
}

export class AuthClient {
    constructor(private readonly client: ApiClient) {}

    async login(input: AuthLoginInput): Promise<AuthSessionResponse> {
        return this.client.post<AuthSessionResponse>("/auth/login", input);
    }

    async register(input: AuthRegisterInput): Promise<UserResponse> {
        return this.client.post<UserResponse>("/auth/register", input);
    }

    async googleLogin(input: { idToken: string; nonce: string }): Promise<AuthSessionResponse> {
        return this.client.post<AuthSessionResponse>("/auth/google", input);
    }

    async googleLink(input: { idToken: string; nonce: string }): Promise<{ success: boolean; message: string }> {
        return this.client.post<{ success: boolean; message: string }>("/auth/google/link", input);
    }

    async refresh(): Promise<AuthSessionResponse> {
        return this.client.post<AuthSessionResponse>("/auth/refresh", undefined, { isRefreshRequest: true });
    }

    async logout(): Promise<{ message: string }> {
        return this.client.post<{ message: string }>("/auth/logout");
    }

    async adminLogin(input: AuthLoginInput): Promise<AuthSessionResponse> {
        return this.client.post<AuthSessionResponse>("/auth/admin/login", input);
    }

    async adminRefresh(): Promise<AuthSessionResponse> {
        return this.client.post<AuthSessionResponse>("/auth/admin/refresh", undefined, { isRefreshRequest: true });
    }

    async adminLogout(): Promise<{ message: string }> {
        return this.client.post<{ message: string }>("/auth/admin/logout");
    }

    async me(): Promise<UserResponse> {
        return this.client.get<UserResponse>("/users/me");
    }
}
