import type { UserRole } from "@shopsphere/types";
import { AppError } from "../../utils/app-error.js";
import { hashPassword } from "../../utils/password.js";
import { UserModel } from "../users/user.model.js";
import { userRepository } from "../users/user.repository.js";
import { toUserResponse } from "../users/user.mapper.js";
import type {
    CreateStaffUserInput,
    ListStaffUsersQuery,
} from "./admin.validation.js";

export const adminService = {
    async createStaffUser(
        _operatorId: string,
        operatorRole: UserRole,
        input: CreateStaffUserInput,
    ) {
        // Business Invariant: Only SUPER_ADMIN can create staff or admin users
        if (operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "Only SUPER_ADMIN users can create staff or admin accounts",
                403,
                "FORBIDDEN",
            );
        }

        const existingUser = await userRepository.findByEmail(input.email);
        if (existingUser) {
            throw new AppError(
                "An account with this email already exists",
                409,
                "EMAIL_ALREADY_EXISTS",
            );
        }

        const passwordHash = await hashPassword(input.password);

        const user = await userRepository.create({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
        });

        return toUserResponse(user);
    },

    async listStaffUsers(query: ListStaffUsersQuery) {
        const { page, limit, role } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = role
            ? { role }
            : { role: { $in: ["SUPER_ADMIN", "ADMIN", "SALES", "PUBLISHER", "SUPPORT_AGENT"] } };

        const [users, totalItems] = await Promise.all([
            UserModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            UserModel.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalItems / limit) || 1;

        return {
            data: users.map(toUserResponse),
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    },

    async updateUserRole(
        operatorId: string,
        operatorRole: UserRole,
        targetUserId: string,
        newRole: UserRole,
    ) {
        // Business Invariant 1: Only SUPER_ADMIN can update user roles
        if (operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "Only SUPER_ADMIN users can update user roles",
                403,
                "FORBIDDEN",
            );
        }

        if (operatorId === targetUserId) {
            throw new AppError(
                "You cannot modify your own administrative role",
                400,
                "INVALID_ACTION",
            );
        }

        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) {
            throw new AppError("Target user not found", 404, "USER_NOT_FOUND");
        }

        // Business Invariant 2: Cannot modify someone above your privilege level
        if (targetUser.role === "SUPER_ADMIN" && operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "You cannot modify someone above your privilege level",
                403,
                "FORBIDDEN",
            );
        }

        // Business Invariant 3: Protect last active SUPER_ADMIN from demotion
        if (targetUser.role === "SUPER_ADMIN" && newRole !== "SUPER_ADMIN") {
            const activeSuperAdminCount = await UserModel.countDocuments({
                role: "SUPER_ADMIN",
                isActive: true,
            });

            if (activeSuperAdminCount <= 1) {
                throw new AppError(
                    "Cannot demote the last active SUPER_ADMIN user in the system",
                    403,
                    "FORBIDDEN",
                );
            }
        }

        targetUser.role = newRole;
        await targetUser.save();

        return toUserResponse(targetUser);
    },

    async updateUserStatus(
        operatorId: string,
        operatorRole: UserRole,
        targetUserId: string,
        isActive: boolean,
    ) {
        if (operatorId === targetUserId) {
            throw new AppError(
                "You cannot modify your own account status",
                400,
                "INVALID_ACTION",
            );
        }

        const targetUser = await UserModel.findById(targetUserId);
        if (!targetUser) {
            throw new AppError("Target user not found", 404, "USER_NOT_FOUND");
        }

        // Business Invariant 1: ADMIN cannot deactivate a SUPER_ADMIN
        if (targetUser.role === "SUPER_ADMIN" && operatorRole !== "SUPER_ADMIN") {
            throw new AppError(
                "ADMIN cannot deactivate a SUPER_ADMIN account",
                403,
                "FORBIDDEN",
            );
        }

        // Business Invariant 2: Protect last active SUPER_ADMIN from deactivation
        if (targetUser.role === "SUPER_ADMIN" && !isActive) {
            const activeSuperAdminCount = await UserModel.countDocuments({
                role: "SUPER_ADMIN",
                isActive: true,
            });

            if (activeSuperAdminCount <= 1) {
                throw new AppError(
                    "Cannot deactivate the last active SUPER_ADMIN user in the system",
                    403,
                    "FORBIDDEN",
                );
            }
        }

        targetUser.isActive = isActive;
        await targetUser.save();

        return toUserResponse(targetUser);
    },
};
