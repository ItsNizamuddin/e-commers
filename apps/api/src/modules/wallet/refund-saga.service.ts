import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { AppError } from "../../utils/app-error.js";
import { withTransaction } from "../../database/transaction.js";
import { WalletPaymentAllocationModel } from "./models/wallet-payment-allocation.model.js";
import { RefundAllocationModel } from "./models/refund-allocation.model.js";
import { walletService } from "./wallet.service.js";
import { mockPaymentGateway, stripePaymentGateway } from "../payments/services/gateways/index.js";

export interface ProcessRefundParams {
    orderId: string;
    userId: string;
    requestedRefundMinor: number;
    reason?: string;
}

export class RefundSagaService {
    /**
     * Executes the Multi-Source Refund Saga adhering to exact proportional single-paisa math
     * and external gateway confirmation before committing wallet credits.
     */
    async processOrderRefund(params: ProcessRefundParams) {
        const { orderId, userId, requestedRefundMinor, reason } = params;

        if (!Number.isInteger(requestedRefundMinor) || requestedRefundMinor <= 0) {
            throw new AppError("Refund amount must be a positive integer in paise", 400, "INVALID_AMOUNT");
        }

        const allocation = await WalletPaymentAllocationModel.findOne({
            orderId: new Types.ObjectId(orderId),
        });

        const refundId = `REF_${randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;

        // Case 1: No allocation found (pure external gateway payment)
        if (!allocation) {
            const refundRecord = new RefundAllocationModel({
                refundId,
                orderId: new Types.ObjectId(orderId),
                userId: new Types.ObjectId(userId),
                walletAmountMinor: 0,
                externalAmountMinor: requestedRefundMinor,
                totalRefundMinor: requestedRefundMinor,
                status: "GATEWAY_REFUND_PENDING",
            });
            await refundRecord.save();

            const gateway = mockPaymentGateway;
            const res = await gateway.refundPayment({
                paymentIntentId: `order_${orderId}`,
                amountMinor: requestedRefundMinor,
                ...(reason ? { reason } : {}),
            });

            if (res.status === "SUCCEEDED") {
                refundRecord.status = "COMPLETED";
                refundRecord.externalRefundId = res.externalRefundId;
                refundRecord.completedAt = new Date();
                await refundRecord.save();
                return refundRecord;
            } else {
                refundRecord.status = "GATEWAY_FAILED";
                refundRecord.failureReason = "Gateway refund rejected";
                await refundRecord.save();
                throw new AppError("External payment gateway refund failed", 500, "GATEWAY_REFUND_FAILED");
            }
        }

        // Invariant checks:
        // Ensure cumulative refunds for this order do not exceed original captured total
        const targetOrderId = allocation.orderId || new Types.ObjectId(orderId);
        const previousRefunds = await RefundAllocationModel.find({
            orderId: targetOrderId,
            status: "COMPLETED",
        });

        const cumulativeRefunded = previousRefunds.reduce((acc, r) => acc + r.totalRefundMinor, 0);
        if (cumulativeRefunded + requestedRefundMinor > allocation.totalAmountMinor) {
            throw new AppError(
                "Total refund cannot exceed captured order amount",
                400,
                "REFUND_EXCEEDS_CAPTURED"
            );
        }

        // Proportional Calculation with Gateway-First Remainder Allocation
        const walletShareMinor = Math.floor(
            (requestedRefundMinor * allocation.walletAmountMinor) / allocation.totalAmountMinor
        );
        const gatewayShareMinor = requestedRefundMinor - walletShareMinor;

        // Ensure wallet share doesn't exceed original wallet paid
        const cumulativeWalletRefunded = previousRefunds.reduce((acc, r) => acc + r.walletAmountMinor, 0);
        if (cumulativeWalletRefunded + walletShareMinor > allocation.walletAmountMinor) {
            throw new AppError(
                "Wallet refund portion cannot exceed wallet amount originally paid",
                400,
                "REFUND_EXCEEDS_WALLET"
            );
        }

        const refundRecord = new RefundAllocationModel({
            refundId,
            orderId: targetOrderId,
            userId: allocation.userId,
            walletAmountMinor: walletShareMinor,
            externalAmountMinor: gatewayShareMinor,
            totalRefundMinor: requestedRefundMinor,
            status: "REFUND_PENDING",
        });
        await refundRecord.save();

        let externalRefundId: string | undefined = undefined;

        // Step 1: External gateway refund first (if applicable)
        if (gatewayShareMinor > 0 && allocation.externalPaymentId) {
            refundRecord.status = "GATEWAY_REFUND_PENDING";
            await refundRecord.save();

            const gateway = allocation.provider === "STRIPE" ? stripePaymentGateway : mockPaymentGateway;
            const gwResult = await gateway.refundPayment({
                paymentIntentId: allocation.externalPaymentId,
                amountMinor: gatewayShareMinor,
                ...(reason ? { reason } : {}),
            });

            if (gwResult.status !== "SUCCEEDED") {
                refundRecord.status = "GATEWAY_FAILED";
                refundRecord.failureReason = "External gateway refund failed";
                await refundRecord.save();
                throw new AppError(
                    "External gateway refund failed. Wallet credit halted.",
                    500,
                    "GATEWAY_REFUND_FAILED"
                );
            }

            externalRefundId = gwResult.externalRefundId;
        }

        // Step 2: Only upon external gateway success (or 100% wallet order), credit wallet balance
        await withTransaction(async (session) => {
            let walletTxId: Types.ObjectId | undefined = undefined;
            if (walletShareMinor > 0) {
                const cred = await walletService.creditWallet({
                    userId: allocation.userId.toString(),
                    amountMinor: walletShareMinor,
                    purpose: "ORDER_REFUND",
                    referenceType: "REFUND",
                    referenceId: refundId,
                    idempotencyKey: `refund_${refundId}`,
                    createdBy: "SYSTEM",
                    metadata: {
                        orderId: targetOrderId.toString(),
                        reason,
                    },
                    session,
                });
                walletTxId = cred.transaction._id;
            }

            refundRecord.status = "COMPLETED";
            if (walletTxId) refundRecord.walletTransactionId = walletTxId;
            if (externalRefundId) refundRecord.externalRefundId = externalRefundId;
            refundRecord.completedAt = new Date();
            await refundRecord.save({ session });
        });

        return refundRecord;
    }
}

export const refundSagaService = new RefundSagaService();
