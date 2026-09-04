import { UserModel } from "../modules/users/user.model.js";
import { hashPassword } from "../utils/password.js";
import { logger } from "../config/logger.js";

/**
 * Ensures a default SUPER_ADMIN user exists on system initialization.
 */
export const seedDefaultSuperAdmin = async (): Promise<void> => {
    try {
        const existingSuperAdmin = await UserModel.findOne({ role: "SUPER_ADMIN" });

        if (existingSuperAdmin) {
            logger.info("Default SUPER_ADMIN account already initialized.");
            return;
        }

        const defaultEmail = process.env.DEFAULT_SUPERADMIN_EMAIL || "superadmin@gmail.com";
        const defaultPassword = process.env.DEFAULT_SUPERADMIN_PASSWORD || "admin@123";

        const passwordHash = await hashPassword(defaultPassword);

        await UserModel.create({
            email: defaultEmail.toLowerCase(),
            passwordHash,
            firstName: "System",
            lastName: "SuperAdmin",
            role: "SUPER_ADMIN",
            isActive: true,
        });

        logger.info(`Default SUPER_ADMIN created successfully: ${defaultEmail}`);
    } catch (error) {
        logger.error(error, "Failed to seed default SUPER_ADMIN user");
    }
};
