import type { AuthenticatedUser } from "../modules/auth/auth.middleware.js";

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}

export {};
