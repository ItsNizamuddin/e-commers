import mongoose, { ClientSession } from "mongoose";

export type TransactionCallback<T> = (session: ClientSession) => Promise<T>;

/**
 * Executes a business operation within a MongoDB transaction.
 *
 * Production Architectural Guidelines:
 * 1. Selective use: Use transactions only when a business operation spans multiple
 *    writes that must remain atomic (e.g. tree relocation, order checkout + inventory reservation).
 * 2. Document-level atomicity: Single-document operations (simple create/update/delete)
 *    rely on MongoDB's native single-document atomicity without transaction overhead.
 * 3. Never wrap external APIs: External HTTP/payment gateway calls must NEVER be held
 *    inside a database transaction.
 * 4. Automatic cleanup: Automatically commits on success, aborts on failure, and
 *    guarantees session closure in a finally block.
 */
export async function withTransaction<T>(work: TransactionCallback<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
        let result: T;
        await session.withTransaction(async () => {
            result = await work(session);
        });
        return result!;
    } catch (error: any) {
        // Fallback for single-node standalone dev/test environments without replica sets
        if (
            error?.message?.includes("replica set member") ||
            error?.message?.includes("Transaction numbers are only allowed on a replica set member")
        ) {
            return await work(session);
        }
        throw error;
    } finally {
        await session.endSession();
    }
}
