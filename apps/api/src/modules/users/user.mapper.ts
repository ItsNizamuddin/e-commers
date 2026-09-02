import type { UserResponse } from "@shopsphere/types";
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
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
};