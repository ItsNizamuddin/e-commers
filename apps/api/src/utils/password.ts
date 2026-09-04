import { argon2id, hash, verify, type HashOptions } from "argon2";

const ARGON2_OPTIONS: HashOptions = {
    type: argon2id,
    memoryCost: 65536, // 64 MB memory
    timeCost: 3,        // 3 iterations
    parallelism: 2,     // 2 parallel threads
};

/**
 * Hashes a plain-text password using Argon2id.
 */
export const hashPassword = async (password: string): Promise<string> => {
    return hash(password, ARGON2_OPTIONS);
};

/**
 * Verifies a plain-text password against an Argon2id hash.
 */
export const verifyPassword = async (
    hashValue: string,
    password: string,
): Promise<boolean> => {
    try {
        return await verify(hashValue, password);
    } catch {
        return false;
    }
};
