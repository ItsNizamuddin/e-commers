export type UserRole = "CUSTOMER" | "ADMIN";

export interface UserResponse {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}