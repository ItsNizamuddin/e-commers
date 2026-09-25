import { z } from "zod";
import { ALL_ROLES, type UserRole } from "@ecommers/types";

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

        countryCode: z
            .string()
            .trim()
            .toUpperCase()
            .length(2, "Country code must be ISO 2-letter format")
            .optional(),

        currency: z
            .string()
            .trim()
            .toUpperCase()
            .length(3, "Currency must be ISO 3-letter format")
            .optional(),
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

export const googleAuthSchema = z
    .object({
        idToken: z.string().min(1, "Google ID token is required"),
        nonce: z.string().min(1, "Nonce is required"),
    })
    .strict();

export type GoogleAuthValidationInput = z.infer<typeof googleAuthSchema>;