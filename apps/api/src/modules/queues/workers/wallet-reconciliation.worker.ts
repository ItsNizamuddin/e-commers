import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../queue.client.js";
import { WalletModel } from "../../wallet/models/wallet.model.js";
import { walletService } from "../../wallet/wallet.service.js";
import { AuditLogModel } from "../../audit/audit-log.model.js";
import { logger } from "../../../config/logger.js";

export interface WalletReconciliationResult {
    scannedCount: number;
    balancedCount: number;
    discrepancyCount: number;
    discrepancies: Array<{
        walletId: string;
        userId: string;
        actualBalanceMinor: number;
        calculatedBalanceMinor: number;
        differenceMinor: number;
    }>;
}

export async function runWalletReconciliation(): Promise<WalletReconciliationResult> {
    const wallets = await WalletModel.find({ status: { $in: ["ACTIVE", "FROZEN"] } }).lean();

    let balancedCount = 0;
    let discrepancyCount = 0;
    const discrepancies: WalletReconciliationResult["discrepancies"] = [];

    for (const w of wallets) {
        const result = await walletService.reconcileWallet(w._id.toString());
        if (result.isBalanced) {
            balancedCount++;
        } else {
            discrepancyCount++;
            discrepancies.push({
                walletId: result.walletId,
                userId: result.userId,
                actualBalanceMinor: result.actualBalanceMinor,
                calculatedBalanceMinor: result.calculatedBalanceMinor,
                differenceMinor: result.differenceMinor,
            });

            logger.error(
                {
                    walletId: result.walletId,
                    userId: result.userId,
                    actualBalanceMinor: result.actualBalanceMinor,
                    calculatedBalanceMinor: result.calculatedBalanceMinor,
                    differenceMinor: result.differenceMinor,
                    transactionCount: result.transactionCount,
                },
                "CRITICAL: Wallet ledger reconciliation discrepancy detected! Auto-correction halted."
            );

            // Log diagnostic incident into AuditLog
            await AuditLogModel.create({
                action: "SYSTEM_CONFIG_UPDATED" as any,
                actor: {
                    id: "system-reconciliation-worker",
                    name: "Wallet Reconciliation Worker",
                    email: "system@internal.ecommers.local",
                    role: "SUPER_ADMIN",
                },
                target: {
                    resource: "Wallet",
                    resourceId: result.walletId,
                    details: {
                        event: "WALLET_RECONCILIATION_MISMATCH",
                        walletId: result.walletId,
                        userId: result.userId,
                        walletBalanceMinor: result.actualBalanceMinor,
                        ledgerBalanceMinor: result.calculatedBalanceMinor,
                        differenceMinor: result.differenceMinor,
                        transactionCount: result.transactionCount,
                        scannedAt: new Date().toISOString(),
                    },
                },
                status: "FAILURE",
                errorMessage: `Discrepancy of ${result.differenceMinor} paise between ledger and materialized balance`,
            });
        }
    }

    return {
        scannedCount: wallets.length,
        balancedCount,
        discrepancyCount,
        discrepancies,
    };
}

export function createWalletReconciliationWorker(): Worker {
    const connection = getRedisConnection();

    const worker = new Worker(
        "maintenance",
        async (job: Job) => {
            if (job.name === "wallet-reconciliation") {
                return await runWalletReconciliation();
            }
        },
        {
            connection,
            concurrency: 1,
        }
    );

    worker.on("failed", (job, err) => {
        logger.error(
            { jobId: job?.id, jobName: job?.name, err: err.message },
            "Wallet reconciliation job failed"
        );
    });

    return worker;
}
