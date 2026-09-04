import type { UserRole } from "@shopsphere/types";
import { UserModel } from "./user.model.js";

export const userRepository = {
    async findByEmail(email: string) {
        return UserModel.findOne({
            email,
        }).select("+passwordHash");
    },

    async findById(id: string) {
        return UserModel.findById(id);
    },

    async create(data: {
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        role?: UserRole;
    }) {
        return UserModel.create(data);
    },
};