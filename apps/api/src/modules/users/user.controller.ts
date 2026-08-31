import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { userService } from "./user.service.js";

export const getUserById: RequestHandler<{ id: string }> = async (
    req,
    res,
): Promise<void> => {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    if (!user) {
        throw new AppError(
            "User not found",
            404,
            "USER_NOT_FOUND",
        );
    }

    res.status(200).json({
        success: true,
        data: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
    });
};