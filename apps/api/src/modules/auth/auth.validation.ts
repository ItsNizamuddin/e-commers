import { z } from "zod";
import { ALL_ROLES, type UserRole } from "@shopsphere/types";

export const registerSchema = z
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
    })
    .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
    .object({
        email: z
            .string()
            .trim()
            .toLowerCase()
            .email("Invalid email address"),

        password: z
            .string()
            .min(1, "Password is required")
            .max(128, "Password must not exceed 128 characters"),
    })
    .strict();

export type LoginInput = z.infer<typeof loginSchema>;