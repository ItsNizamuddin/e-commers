export type UserRole =
    | "CUSTOMER"
    | "SUPER_ADMIN"
    | "ADMIN"
    | "SALES"
    | "PUBLISHER"
    | "SUPPORT_AGENT";

export const STAFF_ROLES: readonly UserRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "SALES",
    "PUBLISHER",
    "SUPPORT_AGENT",
] as const;

export const ALL_ROLES: readonly UserRole[] = [
    "CUSTOMER",
    ...STAFF_ROLES,
] as const;

export * from "./permissions.js";

export type AuthProvider = "LOCAL" | "GOOGLE" | "APPLE";

export interface GoogleAuthInput {
    idToken: string;
    nonce: string;
}

export interface UserResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    authenticationMethods?: AuthProvider[];
    passwordLoginEnabled?: boolean;
    createdAt: string;
    updatedAt: string;
}