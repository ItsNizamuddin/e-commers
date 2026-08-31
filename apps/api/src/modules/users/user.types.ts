import { z } from "zod";

export const getUserByIdParamsSchema = z.object({
    id: z.string().min(1, "User ID is required"),
});

export type GetUserByIdParams = z.infer<typeof getUserByIdParamsSchema>;

export const createUserBodySchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.enum(["CUSTOMER", "ADMIN"]).optional().default("CUSTOMER"),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
