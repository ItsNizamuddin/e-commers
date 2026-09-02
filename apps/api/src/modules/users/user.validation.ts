import { z } from "zod";

export const userIdParamsSchema = z.object({
    id: z.string().regex(
        /^[a-f\d]{24}$/i,
        "Invalid user ID",
    ),
});

export type UserIdParams = z.infer<
    typeof userIdParamsSchema
>;