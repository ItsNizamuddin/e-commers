import { z } from "zod";
import { STAFF_ROLES, ALL_ROLES, type UserRole } from "@shopsphere/types";

export const createStaffUserSchema = z
    .object({
        email: z
            .string()
            .trim()
            .toLowerCase()
            .email("Invalid email address"),

        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password must not exceed 128 characters"),

        firstName: z
            .string()
            .trim()
            .min(2, "First name must be at least 2 characters")
            .max(50, "First name must not exceed 50 characters"),

        lastName: z
            .string()
            .trim()
            .min(2, "Last name must be at least 2 characters")
            .max(50, "Last name must not exceed 50 characters"),

        role: z.enum(STAFF_ROLES as [UserRole, ...UserRole[]]),
    })
    .strict();

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

export const updateUserRoleSchema = z
    .object({
        role: z.enum(ALL_ROLES as [UserRole, ...UserRole[]]),
    })
    .strict();

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserStatusSchema = z
    .object({
        isActive: z.boolean(),
    })
    .strict();

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const listStaffUsersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    role: z.enum(ALL_ROLES as [UserRole, ...UserRole[]]).optional(),
});

export type ListStaffUsersQuery = z.infer<typeof listStaffUsersQuerySchema>;
