import type { Request, Response } from "express";
import { AppError } from "../../utils/app-error.js";
import { walletService } from "./wallet.service.js";
import { WalletTopUpModel } from "./models/index.js";
import { mockPaymentGateway, stripePaymentGateway } from "../payments/services/gateways/index.js";
import { UserModel } from "../users/user.model.js";
import type { TopUpIntentInput } from "./wallet.validation.js";

const assertCustomerRole = (req: Request) => {
    if (req.user?.role !== "CUSTOMER") {
        throw new AppError(
            "Digital wallet is only available for customer accounts",
            403,
            "WALLET_CUSTOMERS_ONLY"
        );
    }
};

export const getWallet = async (req: Request, res: Response): Promise<void> => {
    assertCustomerRole(req);
    const userId = req.user!.id;
    const wallet = await walletService.getOrCreateWallet(userId);

    res.status(200).json({
        success: true,
        data: {
            id: wallet._id.toString(),
            userId: wallet.userId.toString(),
            currency: wallet.currency,
            balanceMinor: wallet.balanceMinor,
            status: wallet.status,
            createdAt: wallet.createdAt.toISOString(),
            updatedAt: wallet.updatedAt.toISOString(),
        },
    });
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
    assertCustomerRole(req);
    const userId = req.user!.id;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const type = req.query.type as any;
    const purpose = req.query.purpose as any;

    const result = await walletService.listTransactions(userId, { page, limit, type, purpose });

    res.status(200).json({
        success: true,
        data: {
            items: result.items.map((tx) => ({
                id: tx._id.toString(),
                transactionId: tx.transactionId,
                walletId: tx.walletId.toString(),
                userId: tx.userId.toString(),
                type: tx.type,
                purpose: tx.purpose,
                amountMinor: tx.amountMinor,
                balanceBeforeMinor: tx.balanceBeforeMinor,
                balanceAfterMinor: tx.balanceAfterMinor,
                referenceType: tx.referenceType,
                referenceId: tx.referenceId,
                idempotencyKey: tx.idempotencyKey,
                status: tx.status,
                createdBy: tx.createdBy,
                adminActorId: tx.adminActorId?.toString(),
                metadata: tx.metadata,
                createdAt: tx.createdAt.toISOString(),
            })),
            total: result.total,
            page: result.page,
            limit: result.limit,
            pages: result.pages,
        },
    });
};

export const createTopUpIntent = async (req: Request, res: Response): Promise<void> => {
    assertCustomerRole(req);
    const userId = req.user!.id;
    const input = req.body as TopUpIntentInput;
    const idempotencyKey =
        (req.headers["idempotency-key"] as string) || `topup_${Date.now()}_${userId}`;

    const wallet = await walletService.getOrCreateWallet(userId);
    if (wallet.status !== "ACTIVE") {
        throw new AppError(
            `Wallet is ${wallet.status.toLowerCase()} and cannot receive top-ups`,
            403,
            "WALLET_LOCKED"
        );
    }

    const user = await UserModel.findById(userId);
    const customerEmail = user?.email || "customer@example.com";

    // Deduplication check
    let topUp = await WalletTopUpModel.findOne({ idempotencyKey });
    if (!topUp) {
        const gateway = input.provider === "STRIPE" ? stripePaymentGateway : mockPaymentGateway;
        const intent = await gateway.createPaymentIntent({
            amountMinor: input.amountMinor,
            currency: "INR",
            checkoutId: wallet._id.toString(),
            customerEmail,
            idempotencyKey: `gw_${idempotencyKey}`,
            metadata: {
                type: "WALLET_TOPUP",
                walletId: wallet._id.toString(),
                userId,
            },
        });

        topUp = new WalletTopUpModel({
            walletId: wallet._id,
            userId: wallet.userId,
            amountMinor: input.amountMinor,
            currency: "INR",
            status: "PAYMENT_PENDING",
            provider: input.provider || "MOCK",
            providerPaymentId: intent.paymentIntentId,
            clientSecret: intent.clientSecret,
            idempotencyKey,
        });
        await topUp.save();
    }

    res.status(200).json({
        success: true,
        data: {
            topUpId: topUp._id.toString(),
            clientSecret: topUp.clientSecret,
            amountMinor: topUp.amountMinor,
            currency: topUp.currency,
            providerPaymentId: topUp.providerPaymentId,
            provider: topUp.provider,
        },
    });
};
