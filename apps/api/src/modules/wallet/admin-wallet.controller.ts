import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { walletService } from "./wallet.service.js";
import { UserModel } from "../users/user.model.js";
import { AppError } from "../../utils/app-error.js";
import { auditLogService } from "../audit/audit-log.service.js";
import type {
    UpdateWalletConfigBody,
    AdminWalletAdjustBody,
    CustomerIdParam,
} from "./admin-wallet.validation.js";

export async function getWalletConfigHandler(_req: Request, res: Response) {
    const config = await walletService.getWalletConfig();
    res.status(200).json({
        success: true,
        data: config,
    });
}

export async function updateWalletConfigHandler(req: Request, res: Response) {
    const adminUser = req.user!;
    const body = req.body as UpdateWalletConfigBody;

    const configInput = {
        ...(body.signupBonusEnabled !== undefined ? { signupBonusEnabled: body.signupBonusEnabled } : {}),
        ...(body.signupBonusByCurrency ? { signupBonusByCurrency: body.signupBonusByCurrency } : {}),
        ...(body.defaultCurrency ? { defaultCurrency: body.defaultCurrency } : {}),
        ...(body.countryToCurrency ? { countryToCurrency: body.countryToCurrency } : {}),
    };

    const updatedConfig = await walletService.updateWalletConfig(configInput, adminUser.id);

    void auditLogService.recordFromRequest(req, {
        action: "WALLET_CONFIG_UPDATED",
        target: {
            resource: "wallet_config",
            resourceId: "singleton",
            details: body,
        },
    });

    res.status(200).json({
        success: true,
        data: updatedConfig,
    });
}

export async function adjustWalletBalanceHandler(req: Request, res: Response) {
    const adminUser = req.user!;
    const { userId, type, amountMinor, reason, idempotencyKey } = req.body as AdminWalletAdjustBody;

    // Verify user exists and is strictly a customer
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
        throw new AppError("Customer user not found", 404, "USER_NOT_FOUND");
    }

    if (targetUser.role !== "CUSTOMER") {
        throw new AppError(
            "Wallets are strictly for customer accounts. Staff accounts cannot hold wallet balances.",
            403,
            "WALLET_CUSTOMERS_ONLY"
        );
    }

    const adjustmentRef = `ADJ_${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

    let result;
    if (type === "CREDIT") {
        result = await walletService.creditWallet({
            userId,
            amountMinor,
            purpose: "ADMIN_ADJUSTMENT",
            referenceType: "ADJUSTMENT",
            referenceId: adjustmentRef,
            createdBy: "ADMIN",
            adminActorId: adminUser.id,
            ...(idempotencyKey ? { idempotencyKey } : {}),
            metadata: {
                reason,
                adjustedBy: adminUser.id,
                operatorRole: adminUser.role,
            },
        });
    } else {
        result = await walletService.debitWallet({
            userId,
            amountMinor,
            purpose: "ADMIN_ADJUSTMENT",
            referenceType: "ADJUSTMENT",
            referenceId: adjustmentRef,
            createdBy: "ADMIN",
            adminActorId: adminUser.id,
            ...(idempotencyKey ? { idempotencyKey } : {}),
            metadata: {
                reason,
                adjustedBy: adminUser.id,
                operatorRole: adminUser.role,
            },
        });
    }

    void auditLogService.recordFromRequest(req, {
        action: "WALLET_BALANCE_ADJUSTED",
        target: {
            resource: "wallet",
            resourceId: result.wallet._id.toString(),
            details: {
                userId,
                type,
                amountMinor,
                reason,
                balanceBeforeMinor: result.transaction.balanceBeforeMinor,
                balanceAfterMinor: result.transaction.balanceAfterMinor,
                transactionId: result.transaction.transactionId,
            },
        },
    });

    res.status(200).json({
        success: true,
        data: {
            wallet: {
                id: result.wallet._id.toString(),
                userId: result.wallet.userId.toString(),
                currency: result.wallet.currency,
                balanceMinor: result.wallet.balanceMinor,
                status: result.wallet.status,
            },
            transaction: {
                id: result.transaction._id.toString(),
                transactionId: result.transaction.transactionId,
                type: result.transaction.type,
                purpose: result.transaction.purpose,
                amountMinor: result.transaction.amountMinor,
                balanceBeforeMinor: result.transaction.balanceBeforeMinor,
                balanceAfterMinor: result.transaction.balanceAfterMinor,
                referenceType: result.transaction.referenceType,
                referenceId: result.transaction.referenceId,
                status: result.transaction.status,
                createdAt: result.transaction.createdAt,
            },
        },
    });
}

export async function getCustomerWalletHandler(req: Request, res: Response) {
    const { userId } = req.params as CustomerIdParam;

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
        throw new AppError("Customer user not found", 404, "USER_NOT_FOUND");
    }

    if (targetUser.role !== "CUSTOMER") {
        throw new AppError(
            "Wallets are strictly for customer accounts",
            403,
            "WALLET_CUSTOMERS_ONLY"
        );
    }

    const wallet = await walletService.getOrCreateWallet(userId);
    const transactions = await walletService.listTransactions(userId, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    });

    res.status(200).json({
        success: true,
        data: {
            wallet: {
                id: wallet._id.toString(),
                userId: wallet.userId.toString(),
                currency: wallet.currency,
                balanceMinor: wallet.balanceMinor,
                status: wallet.status,
            },
            transactions,
        },
    });
}
