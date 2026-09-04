import { AuditActor, UserRole } from "@shopsphere/types";
import { UserModel } from "../modules/users/user.model.js";
import { AppError } from "./app-error.js";

/**
 * Resolves a trusted server-side AuditActor snapshot at the time of a mutation.
 */
export async function resolveActor(userId?: string): Promise<AuditActor | undefined> {
    if (!userId) {
        return undefined;
    }

    const user = await UserModel.findById(userId).select("firstName lastName email role");
    if (!user) {
        throw new AppError("Actor user not found", 404, "USER_NOT_FOUND");
    }

    return {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role as UserRole,
    };
}
