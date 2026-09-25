import type { PaymentProvider } from "../payment/index.js";

export type WalletStatus = "ACTIVE" | "FROZEN" | "SUSPENDED";

export type WalletTransactionType = "CREDIT" | "DEBIT";

export type WalletTransactionPurpose =
    | "TOP_UP"
    | "ORDER_PAYMENT"
    | "ORDER_REFUND"
    | "PAYMENT_REVERSAL"
    | "ADMIN_ADJUSTMENT"
    | "CASHBACK"
    | "PROMOTIONAL"
    | "SIGNUP_BONUS";

export type WalletTransactionReferenceType =
    | "ORDER"
    | "CHECKOUT"
    | "TOPUP"
    | "REFUND"
    | "ADMIN"
    | "REGISTRATION"
    | "ADJUSTMENT";

export type WalletTransactionCreatedBy =
    | "CUSTOMER"
    | "SYSTEM"
    | "ADMIN"
    | "WEBHOOK";

export type WalletTransactionMetadata = Record<string, string | number | boolean | null | undefined>;

export interface WalletResponse {
    id: string;
    userId: string;
    currency: string;
    balanceMinor: number;
    status: WalletStatus;
    createdAt: string;
    updatedAt: string;
}

export interface WalletTransactionResponse {
    id: string;
    transactionId: string;
    walletId: string;
    userId: string;
    type: WalletTransactionType;
    purpose: WalletTransactionPurpose;
    amountMinor: number;
    balanceBeforeMinor: number;
    balanceAfterMinor: number;
    referenceType: WalletTransactionReferenceType;
    referenceId: string;
    idempotencyKey?: string;
    status: "COMPLETED";
    createdBy: WalletTransactionCreatedBy;
    adminActorId?: string;
    metadata?: WalletTransactionMetadata;
    createdAt: string;
}

export type WalletTopUpStatus =
    | "CREATED"
    | "PAYMENT_PENDING"
    | "SUCCESS"
    | "FAILED"
    | "EXPIRED"
    | "REVERSED";

export interface CreateTopUpIntentInput {
    amountMinor: number;
    provider?: PaymentProvider;
}

export interface TopUpIntentResponse {
    topUpId: string;
    clientSecret?: string;
    amountMinor: number;
    currency: string;
    providerPaymentId?: string;
    provider: PaymentProvider;
}

export type WalletPaymentAllocationStatus =
    | "PENDING"
    | "COMPLETED"
    | "FAILED"
    | "REVERSED";

export interface WalletPaymentAllocationResponse {
    id: string;
    checkoutId: string;
    orderId?: string;
    walletId: string;
    userId: string;
    provider: PaymentProvider;
    walletAmountMinor: number;
    externalAmountMinor: number;
    totalAmountMinor: number;
    status: WalletPaymentAllocationStatus;
    externalPaymentId?: string;
    createdAt: string;
    updatedAt: string;
}

export type RefundAllocationStatus =
    | "REFUND_PENDING"
    | "GATEWAY_REFUND_PENDING"
    | "COMPLETED"
    | "GATEWAY_FAILED";

export interface RefundAllocationResponse {
    id: string;
    refundId: string;
    orderId: string;
    userId: string;
    walletAmountMinor: number;
    externalAmountMinor: number;
    totalRefundMinor: number;
    status: RefundAllocationStatus;
    walletTransactionId?: string;
    externalRefundId?: string;
    failureReason?: string;
    createdAt: string;
    completedAt?: string;
}

export interface WalletConfig {
    signupBonusEnabled: boolean;
    signupBonusByCurrency: Record<string, number>;
    defaultCurrency: string;
    countryToCurrency: Record<string, string>;
    updatedAt?: string;
}

export interface UpdateWalletConfigInput {
    signupBonusEnabled?: boolean;
    signupBonusByCurrency?: Record<string, number>;
    defaultCurrency?: string;
    countryToCurrency?: Record<string, string>;
}

export interface AdminWalletAdjustInput {
    userId: string;
    type: WalletTransactionType;
    amountMinor: number;
    reason: string;
    idempotencyKey?: string;
}
