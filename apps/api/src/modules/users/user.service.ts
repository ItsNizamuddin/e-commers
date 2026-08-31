import { userRepository } from "./user.repository.js";

export const userService = {
    async getUserById(id: string) {
        return userRepository.findById(id);
    },
};