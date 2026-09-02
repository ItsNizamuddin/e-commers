import type { RequestHandler } from "express";

import { AppError } from "../../utils/app-error.js";
import { userService } from "./user.service.js";
import { toUserResponse } from "./user.mapper.js";

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
        data: toUserResponse(user),
    });
};