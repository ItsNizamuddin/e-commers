import type { Request, Response } from "express";
import { adminService } from "./admin.service.js";
import type {
    CreateStaffUserInput,
    ListStaffUsersQuery,
    UpdateUserRoleInput,
    UpdateUserStatusInput,
} from "./admin.validation.js";

export const createStaffUser = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const operator = req.user!;
    const input = req.body as CreateStaffUserInput;

    const user = await adminService.createStaffUser(
        operator.id,
        operator.role,
        input,
    );

    res.status(201).json({
        success: true,
        data: user,
    });
};

export const listStaffUsers = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const query = req.query as unknown as ListStaffUsersQuery;

    const result = await adminService.listStaffUsers(query);

    res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
    });
};

export const updateUserRole = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const operator = req.user!;
    const { id } = req.params as { id: string };
    const { role } = req.body as UpdateUserRoleInput;

    const user = await adminService.updateUserRole(
        operator.id,
        operator.role,
        id,
        role,
    );

    res.status(200).json({
        success: true,
        data: user,
    });
};

export const updateUserStatus = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const operator = req.user!;
    const { id } = req.params as { id: string };
    const { isActive } = req.body as UpdateUserStatusInput;

    const user = await adminService.updateUserStatus(
        operator.id,
        operator.role,
        id,
        isActive,
    );

    res.status(200).json({
        success: true,
        data: user,
    });
};
