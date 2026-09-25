import type { UserResponse } from "@ecommers/types";
import type { UserDocument } from "./user.model.js";

export const toUserResponse = (
    user: UserDocument,
): UserResponse => {
    return {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        authenticationMethods: user.authenticationMethods as any,
        passwordLoginEnabled: user.passwordLoginEnabled,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
};