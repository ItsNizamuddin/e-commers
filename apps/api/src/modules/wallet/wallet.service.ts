import { randomUUID } from "node:crypto";
import mongoose, { ClientSession, Types } from "mongoose";
import type {
    WalletStatus,
    WalletTransactionType,
    WalletTransactionPurpose,
    WalletTransactionReferenceType,
    WalletTransactionCreatedBy,
    WalletTransactionMetadata,
    WalletConfig,
    UpdateWalletConfigInput,
} from "@ecommers/types";
import { AppError } from "../../utils/app-error.js";
import { withTransaction } from "../../database/transaction.js";
import { outboxService } from "../outbox/outbox.service.js";
import { UserModel } from "../users/user.model.js";
import {
    WalletModel,
    type WalletDocument,
    WalletTransactionModel,
    type WalletTransactionDocument,
    WalletConfigModel,
} from "./models/index.js";

export interface CreditWalletParams {
    userId: string;
    amountMinor: number;
    purpose: WalletTransactionPurpose;
    referenceType: WalletTransactionReferenceType;
    referenceId: string;
    idempotencyKey?: string;
    createdBy: WalletTransactionCreatedBy;
    adminActorId?: string;
    metadata?: WalletTransactionMetadata;
    session?: ClientSession;
}

export interface DebitWalletParams {
    userId: string;
    amountMinor: number;
    purpose: WalletTransactionPurpose;
    referenceType: WalletTransactionReferenceType;
    referenceId: string;
    idempotencyKey?: string;
    createdBy: WalletTransactionCreatedBy;
    adminActorId?: string;
    metadata?: WalletTransactionMetadata;
    session?: ClientSession;
}

export interface ListTransactionsQuery {
    page?: number;
    limit?: number;
    type?: WalletTransactionType;
    purpose?: WalletTransactionPurpose;
}

export class WalletService {
    /**
     * Retrieves the current system wallet configuration.
     * Automatically creates default singleton configuration if not already existing.
     */
    async getWalletConfig(): Promise<WalletConfig> {
        let configDoc = await WalletConfigModel.findOne({ isSingleton: true });
        if (!configDoc) {
            configDoc = await WalletConfigModel.create({
                isSingleton: true,
                signupBonusEnabled: true,
                signupBonusByCurrency: {
                    INR: 5000, // ₹50.00
                    USD: 500,  // $5.00
                    EUR: 500,  // €5.00
                    GBP: 400,  // £4.00
                    AED: 2000, // AED 20.00
                },
                defaultCurrency: "INR",
                countryToCurrency: {
                    IN: "INR",
                    US: "USD",
                    GB: "GBP",
                    AE: "AED",
                    CA: "CAD",
                    AU: "AUD",
                    DE: "EUR",
                    FR: "EUR",
                    IT: "EUR",
                    ES: "EUR",
                    NL: "EUR",
                },
            });
        }

        const bonusMap =
            configDoc.signupBonusByCurrency instanceof Map
                ? Object.fromEntries(configDoc.signupBonusByCurrency)
                : (configDoc.signupBonusByCurrency as Record<string, number>);

        const countryMap =
            configDoc.countryToCurrency instanceof Map
                ? Object.fromEntries(configDoc.countryToCurrency)
                : (configDoc.countryToCurrency as Record<string, string>);

        return {
            signupBonusEnabled: configDoc.signupBonusEnabled,
            signupBonusByCurrency: bonusMap,
            defaultCurrency: configDoc.defaultCurrency,
            countryToCurrency: countryMap,
            ...(configDoc.updatedAt ? { updatedAt: configDoc.updatedAt.toISOString() } : {}),
        };
    }

    /**
     * Updates wallet configuration (Admin & Super Admin only).
     */
    async updateWalletConfig(input: UpdateWalletConfigInput, adminId: string): Promise<WalletConfig> {
        let configDoc = await WalletConfigModel.findOne({ isSingleton: true });
        if (!configDoc) {
            configDoc = new WalletConfigModel({ isSingleton: true });
        }

        if (input.signupBonusEnabled !== undefined) {
            configDoc.signupBonusEnabled = input.signupBonusEnabled;
        }

        if (input.signupBonusByCurrency) {
            for (const [curr, amt] of Object.entries(input.signupBonusByCurrency)) {
                if (typeof amt !== "number" || amt < 0 || !Number.isInteger(amt)) {
                    throw new AppError(
                        `Bonus amount for ${curr} must be a non-negative integer in minor units`,
                        400,
                        "INVALID_BONUS_AMOUNT"
                    );
                }
            }
            configDoc.signupBonusByCurrency = input.signupBonusByCurrency as any;
        }

        if (input.defaultCurrency) {
            configDoc.defaultCurrency = input.defaultCurrency.trim().toUpperCase();
        }

        if (input.countryToCurrency) {
            configDoc.countryToCurrency = input.countryToCurrency as any;
        }

        configDoc.updatedBy = new Types.ObjectId(adminId);
        await configDoc.save();

        return this.getWalletConfig();
    }

    /**
     * Resolves the appropriate wallet currency according to customer location / country code.
     */
    async resolveCurrencyForLocation(countryCode?: string, preferredCurrency?: string): Promise<string> {
        const config = await this.getWalletConfig();

        if (preferredCurrency) {
            return preferredCurrency.trim().toUpperCase();
        }

        if (countryCode) {
            const normalizedCountry = countryCode.trim().toUpperCase();
            if (config.countryToCurrency[normalizedCountry]) {
                return config.countryToCurrency[normalizedCountry];
            }
        }

        return config.defaultCurrency || "INR";
    }

    /**
     * Provisions a customer wallet and automatically grants the first signup promo balance if enabled.
     */
    async provisionCustomerWallet(
        userId: string,
        options?: { countryCode?: string | undefined; currency?: string | undefined },
        session?: ClientSession
    ): Promise<WalletDocument> {
        const targetCurrency = await this.resolveCurrencyForLocation(options?.countryCode, options?.currency);
        const wallet = await this.getOrCreateWallet(userId, session, targetCurrency);

        const config = await this.getWalletConfig();
        if (config.signupBonusEnabled) {
            const bonusMinor = config.signupBonusByCurrency[wallet.currency] ?? 0;
            if (bonusMinor > 0) {
                // Ensure idempotency so signup bonus is credited at most once per user
                const idempotencyKey = `signup_bonus_${userId}`;
                await this.creditWallet({
                    userId,
                    amountMinor: bonusMinor,
                    purpose: "SIGNUP_BONUS",
                    referenceType: "REGISTRATION",
                    referenceId: userId,
                    idempotencyKey,
                    createdBy: "SYSTEM",
                    metadata: {
                        promo: "FIRST_SIGNUP_PROMO_BALANCE",
                        currency: wallet.currency,
                    },
                    ...(session ? { session } : {}),
                });
            }
        }

        return (await WalletModel.findById(wallet._id).session(session || null))!;
    }

    /**
     * Retrieves an existing customer wallet or creates a new active one.
     * Invariant: Wallets are strictly for CUSTOMER accounts only.
     */
    async getOrCreateWallet(
        userId: string,
        session?: ClientSession,
        preferredCurrency?: string
    ): Promise<WalletDocument> {
        const user = await UserModel.findById(userId).session(session || null);
        if (!user) {
            throw new AppError("User not found", 404, "USER_NOT_FOUND");
        }

        if (user.role !== "CUSTOMER") {
            throw new AppError(
                "Digital wallet is only available for customer accounts",
                403,
                "WALLET_CUSTOMERS_ONLY"
            );
        }

        let wallet = await WalletModel.findOne({ userId: user._id }).session(session || null);
        if (!wallet) {
            try {
                const currency = preferredCurrency || "INR";
                const newWallet = new WalletModel({
                    userId: user._id,
                    currency,
                    balanceMinor: 0,
                    status: "ACTIVE",
                    version: 0,
                });
                if (session) {
                    await newWallet.save({ session });
                } else {
                    await newWallet.save();
                }
                wallet = newWallet;
            } catch (err: any) {
                if (err.code === 11000) {
                    wallet = await WalletModel.findOne({ userId: user._id }).session(session || null);
                } else {
                    throw err;
                }
            }
        }

        return wallet!;
    }

    /**
     * Credits funds to a customer's wallet and appends an immutable ledger record.
     */
    async creditWallet(params: CreditWalletParams): Promise<{
        wallet: WalletDocument;
        transaction: WalletTransactionDocument;
    }> {
        const {
            userId,
            amountMinor,
            purpose,
            referenceType,
            referenceId,
            idempotencyKey,
            createdBy,
            adminActorId,
            metadata,
        } = params;

        if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
            throw new AppError("Credit amount must be a positive integer in paise", 400, "INVALID_AMOUNT");
        }

        // Idempotency check before executing transaction
        if (idempotencyKey) {
            const existingTx = await WalletTransactionModel.findOne({ idempotencyKey });
            if (existingTx) {
                const currentWallet = await WalletModel.findById(existingTx.walletId);
                return { wallet: currentWallet!, transaction: existingTx };
            }
        }

        const executeCredit = async (activeSession: ClientSession) => {
            const wallet = await this.getOrCreateWallet(userId, activeSession);

            if (wallet.status === "SUSPENDED") {
                throw new AppError("Suspended wallet cannot receive credits", 403, "WALLET_SUSPENDED");
            }

            const balanceBefore = wallet.balanceMinor;

            // Atomic balance update
            const updatedWallet = await WalletModel.findOneAndUpdate(
                { _id: wallet._id },
                { $inc: { balanceMinor: amountMinor, version: 1 } },
                { returnDocument: "after", session: activeSession }
            );

            if (!updatedWallet) {
                throw new AppError("Failed to update wallet balance", 500, "WALLET_UPDATE_FAILED");
            }

            const transactionId = `TXN_CR_${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

            const transaction = new WalletTransactionModel({
                transactionId,
                walletId: updatedWallet._id,
                userId: new Types.ObjectId(userId),
                type: "CREDIT",
                purpose,
                amountMinor,
                balanceBeforeMinor: balanceBefore,
                balanceAfterMinor: updatedWallet.balanceMinor,
                referenceType,
                referenceId,
                ...(idempotencyKey ? { idempotencyKey } : {}),
                status: "COMPLETED",
                createdBy,
                ...(adminActorId ? { adminActorId: new Types.ObjectId(adminActorId) } : {}),
                ...(metadata ? { metadata } : {}),
            });
            await transaction.save({ session: activeSession });

            await outboxService.recordEvent({
                eventType: "WALLET_CREDITED",
                aggregateType: "Wallet",
                aggregateId: updatedWallet._id,
                payload: {
                    walletId: updatedWallet._id.toString(),
                    userId,
                    amountMinor,
                    transactionId,
                    purpose,
                },
                session: activeSession,
            });

            return { wallet: updatedWallet, transaction };
        };

        try {
            if (params.session) {
                return await executeCredit(params.session);
            }

            return await withTransaction(executeCredit);
        } catch (error: any) {
            if (idempotencyKey && (error.code === 11000 || error.message?.includes("E11000"))) {
                const existingTx = await WalletTransactionModel.findOne({ idempotencyKey });
                if (existingTx) {
                    const currentWallet = await WalletModel.findById(existingTx.walletId);
                    if (currentWallet) {
                        return { wallet: currentWallet, transaction: existingTx };
                    }
                }
            }
            throw error;
        }
    }

    /**
     * Debits funds atomically from a customer's wallet and appends an immutable ledger record.
     * Enforces non-negative balance constraint natively in MongoDB query condition.
     */
    async debitWallet(params: DebitWalletParams): Promise<{
        wallet: WalletDocument;
        transaction: WalletTransactionDocument;
    }> {
        const {
            userId,
            amountMinor,
            purpose,
            referenceType,
            referenceId,
            idempotencyKey,
            createdBy,
            adminActorId,
            metadata,
        } = params;

        if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
            throw new AppError("Debit amount must be a positive integer in paise", 400, "INVALID_AMOUNT");
        }

        if (idempotencyKey) {
            const existingTx = await WalletTransactionModel.findOne({ idempotencyKey });
            if (existingTx) {
                const currentWallet = await WalletModel.findById(existingTx.walletId);
                return { wallet: currentWallet!, transaction: existingTx };
            }
        }

        const executeDebit = async (activeSession: ClientSession) => {
            const wallet = await this.getOrCreateWallet(userId, activeSession);

            if (wallet.status !== "ACTIVE") {
                throw new AppError(`Wallet is ${wallet.status.toLowerCase()} and cannot be debited`, 403, "WALLET_LOCKED");
            }

            const balanceBefore = wallet.balanceMinor;

            // Atomic decrement with strict balance condition
            const updatedWallet = await WalletModel.findOneAndUpdate(
                {
                    _id: wallet._id,
                    balanceMinor: { $gte: amountMinor },
                    status: "ACTIVE",
                },
                {
                    $inc: { balanceMinor: -amountMinor, version: 1 },
                },
                { returnDocument: "after", session: activeSession }
            );

            if (!updatedWallet) {
                throw new AppError("Insufficient wallet balance", 400, "INSUFFICIENT_FUNDS");
            }

            const transactionId = `TXN_DB_${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

            const transaction = new WalletTransactionModel({
                transactionId,
                walletId: updatedWallet._id,
                userId: new Types.ObjectId(userId),
                type: "DEBIT",
                purpose,
                amountMinor,
                balanceBeforeMinor: balanceBefore,
                balanceAfterMinor: updatedWallet.balanceMinor,
                referenceType,
                referenceId,
                ...(idempotencyKey ? { idempotencyKey } : {}),
                status: "COMPLETED",
                createdBy,
                ...(adminActorId ? { adminActorId: new Types.ObjectId(adminActorId) } : {}),
                ...(metadata ? { metadata } : {}),
            });
            await transaction.save({ session: activeSession });

            await outboxService.recordEvent({
                eventType: "WALLET_DEBITED",
                aggregateType: "Wallet",
                aggregateId: updatedWallet._id,
                payload: {
                    walletId: updatedWallet._id.toString(),
                    userId,
                    amountMinor,
                    transactionId,
                    purpose,
                },
                session: activeSession,
            });

            return { wallet: updatedWallet, transaction };
        };

        try {
            if (params.session) {
                return await executeDebit(params.session);
            }

            return await withTransaction(executeDebit);
        } catch (error: any) {
            if (idempotencyKey && (error.code === 11000 || error.message?.includes("E11000"))) {
                const existingTx = await WalletTransactionModel.findOne({ idempotencyKey });
                if (existingTx) {
                    const currentWallet = await WalletModel.findById(existingTx.walletId);
                    if (currentWallet) {
                        return { wallet: currentWallet, transaction: existingTx };
                    }
                }
            }
            throw error;
        }
    }

    /**
     * Lists paginated transaction records for a customer.
     */
    async listTransactions(userId: string, query: ListTransactionsQuery) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;

        const filter: Record<string, any> = { userId: new Types.ObjectId(userId) };
        if (query.type) filter.type = query.type;
        if (query.purpose) filter.purpose = query.purpose;

        const [items, total] = await Promise.all([
            WalletTransactionModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletTransactionModel.countDocuments(filter),
        ]);

        return {
            items,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        };
    }

    /**
     * Reconciles a wallet by verifying SUM(credits) - SUM(debits) against balanceMinor.
     */
    async reconcileWallet(walletId: string) {
        const wallet = await WalletModel.findById(walletId);
        if (!wallet) {
            throw new AppError("Wallet not found", 404, "WALLET_NOT_FOUND");
        }

        const transactions = await WalletTransactionModel.find({
            walletId: wallet._id,
            status: "COMPLETED",
        }).lean();

        let sumCredits = 0;
        let sumDebits = 0;

        for (const tx of transactions) {
            if (tx.type === "CREDIT") sumCredits += tx.amountMinor;
            if (tx.type === "DEBIT") sumDebits += tx.amountMinor;
        }

        const calculatedBalanceMinor = sumCredits - sumDebits;
        const differenceMinor = wallet.balanceMinor - calculatedBalanceMinor;
        const isBalanced = differenceMinor === 0;

        return {
            walletId: wallet._id.toString(),
            userId: wallet.userId.toString(),
            actualBalanceMinor: wallet.balanceMinor,
            calculatedBalanceMinor,
            differenceMinor,
            transactionCount: transactions.length,
            isBalanced,
        };
    }
}

export const walletService = new WalletService();
