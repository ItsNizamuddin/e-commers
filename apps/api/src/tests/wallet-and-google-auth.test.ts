import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import mongoose from "mongoose";
import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { AuthIdentityModel } from "../modules/auth/auth-identity.model.js";
import {
    WalletModel,
    WalletTransactionModel,
    WalletTopUpModel,
    WalletPaymentAllocationModel,
    RefundAllocationModel,
    WalletConfigModel,
} from "../modules/wallet/models/index.js";
import { walletService } from "../modules/wallet/wallet.service.js";
import { refundSagaService } from "../modules/wallet/refund-saga.service.js";
import { runWalletReconciliation } from "../modules/queues/workers/wallet-reconciliation.worker.js";
import { signAccessToken } from "../utils/jwt.js";
import { env } from "../config/env.js";

describe("Production Customer Wallet & Google OAuth Integration Tests", () => {
    let customerToken: string;
    let customerUserId: string;
    let adminToken: string;
    let adminUserId: string;

    beforeAll(async () => {
        await connectDatabase();
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await AuthIdentityModel.deleteMany({});
        await WalletModel.deleteMany({});
        await WalletTransactionModel.deleteMany({});
        await WalletTopUpModel.deleteMany({});
        await WalletPaymentAllocationModel.deleteMany({});
        await RefundAllocationModel.deleteMany({});
        await WalletConfigModel.deleteMany({});

        // 1. Create registered customer
        const custRes = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "wallet.user@example.com",
                password: "Password123!",
                firstName: "Wallet",
                lastName: "Tester",
            });
        customerUserId = custRes.body.data.id;

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "wallet.user@example.com",
                password: "Password123!",
            });
        customerToken = loginRes.body.data.accessToken;

        // 2. Create staff admin
        const adminUser = await UserModel.create({
            email: "admin.tester@example.com",
            passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhash",
            firstName: "Admin",
            lastName: "Tester",
            role: "ADMIN",
            isActive: true,
            passwordLoginEnabled: true,
            authenticationMethods: ["LOCAL"],
        });
        adminUserId = adminUser._id.toString();

        adminToken = signAccessToken({
            sub: adminUserId,
            role: "ADMIN",
            sessionType: "STAFF",
            type: "access",
        });
    });

    afterAll(async () => {
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await AuthIdentityModel.deleteMany({});
        await WalletModel.deleteMany({});
        await WalletTransactionModel.deleteMany({});
        await WalletTopUpModel.deleteMany({});
        await WalletPaymentAllocationModel.deleteMany({});
        await RefundAllocationModel.deleteMany({});
        await WalletConfigModel.deleteMany({});
        await disconnectDatabase();
    });

    /* -------------------------------------------------------------------------- */
    /* 1. Google OAuth & Identity Security                                        */
    /* -------------------------------------------------------------------------- */
    describe("1. Google OAuth & Identity Security", () => {
        it("should reject Google login without mandatory nonce", async () => {
            const res = await request(app)
                .post("/api/v1/auth/google")
                .send({
                    idToken: "mock-google-token-sub101-newuser",
                });
            expect(res.status).toBe(400);
        });

        it("should auto-register Google customer and provision a Customer Wallet in a single transaction", async () => {
            const res = await request(app)
                .post("/api/v1/auth/google")
                .send({
                    idToken: "mock-google-token-sub101-googleuser",
                    nonce: "client_nonce_xyz123",
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.email).toBe("googleuser@example.com");
            expect(res.body.data.user.role).toBe("CUSTOMER");
            expect(res.body.data.accessToken).toBeDefined();

            // Verify AuthIdentity was created with sub
            const identity = await AuthIdentityModel.findOne({
                provider: "GOOGLE",
                providerSubject: "sub101",
            });
            expect(identity).toBeDefined();
            expect(identity?.email).toBe("googleuser@example.com");

            // Verify Wallet was automatically provisioned with signup promo bonus (₹50 = 5000 paise)
            const wallet = await WalletModel.findOne({ userId: res.body.data.user.id });
            expect(wallet).toBeDefined();
            expect(wallet?.balanceMinor).toBe(5000);
            expect(wallet?.currency).toBe("INR");
            expect(wallet?.status).toBe("ACTIVE");
        });

        it("should reject automatic linking when Google email matches existing local user (anti-hijacking)", async () => {
            const res = await request(app)
                .post("/api/v1/auth/google")
                .send({
                    idToken: "mock-google-token-sub999-wallet.user",
                    nonce: "client_nonce_xyz123",
                });

            expect(res.status).toBe(409);
            expect(res.body.error.code).toBe("REQUIRE_ACCOUNT_LINKING");
        });

        it("should allow authenticated customer to link Google account", async () => {
            const res = await request(app)
                .post("/api/v1/auth/google/link")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({
                    idToken: "mock-google-token-sub555-wallet.user",
                    nonce: "client_nonce_xyz123",
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const identity = await AuthIdentityModel.findOne({ providerSubject: "sub555" });
            expect(identity?.userId.toString()).toBe(customerUserId);
        });
    });

    /* -------------------------------------------------------------------------- */
    /* 2. Customer-Only Wallet Authorization & Invariants                        */
    /* -------------------------------------------------------------------------- */
    describe("2. Customer-Only Authorization & Financial Invariants", () => {
        it("should allow customer to fetch their wallet", async () => {
            const res = await request(app)
                .get("/api/v1/wallet")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.balanceMinor).toBe(5000);
            expect(res.body.data.currency).toBe("INR");
            expect(res.body.data.status).toBe("ACTIVE");
        });

        it("should reject non-integer, negative, or zero amounts in credit and debit", async () => {
            await expect(
                walletService.creditWallet({
                    userId: customerUserId,
                    amountMinor: -500,
                    purpose: "TOP_UP",
                    referenceType: "TOPUP",
                    referenceId: "t1",
                    createdBy: "CUSTOMER",
                })
            ).rejects.toThrow("Credit amount must be a positive integer");

            await expect(
                walletService.creditWallet({
                    userId: customerUserId,
                    amountMinor: 10.5,
                    purpose: "TOP_UP",
                    referenceType: "TOPUP",
                    referenceId: "t2",
                    createdBy: "CUSTOMER",
                })
            ).rejects.toThrow("Credit amount must be a positive integer");

            await expect(
                walletService.debitWallet({
                    userId: customerUserId,
                    amountMinor: 0,
                    purpose: "ORDER_PAYMENT",
                    referenceType: "CHECKOUT",
                    referenceId: "t3",
                    createdBy: "CUSTOMER",
                })
            ).rejects.toThrow("Debit amount must be a positive integer");
        });

        it("should reject debit when balance is insufficient", async () => {
            await expect(
                walletService.debitWallet({
                    userId: customerUserId,
                    amountMinor: 1000000, // ₹10,000.00 exceeds any current balance
                    purpose: "ORDER_PAYMENT",
                    referenceType: "CHECKOUT",
                    referenceId: "chk_insufficient",
                    createdBy: "CUSTOMER",
                })
            ).rejects.toThrow("Insufficient wallet balance");
        });
    });

    /* -------------------------------------------------------------------------- */
    /* 3. Concurrency Safety Test (10 simultaneous debits on ₹500 balance)       */
    /* -------------------------------------------------------------------------- */
    describe("3. Concurrency Safety (10 simultaneous debits)", () => {
        it("given balance ₹500, exactly 5 of 10 concurrent ₹100 debits must succeed, 5 fail, final balance = 0", async () => {
            // Clear any initial balance so test starts at zero
            const currentW = await walletService.getOrCreateWallet(customerUserId);
            if (currentW.balanceMinor > 0) {
                await walletService.debitWallet({
                    userId: customerUserId,
                    amountMinor: currentW.balanceMinor,
                    purpose: "ADMIN_ADJUSTMENT",
                    referenceType: "ADJUSTMENT",
                    referenceId: "reset_before_concurrency",
                    createdBy: "SYSTEM",
                });
            }

            // 1. Credit ₹500 (50,000 paise)
            await walletService.creditWallet({
                userId: customerUserId,
                amountMinor: 50000,
                purpose: "TOP_UP",
                referenceType: "TOPUP",
                referenceId: "topup_concurrency_seed",
                createdBy: "SYSTEM",
            });

            const walletBefore = await walletService.getOrCreateWallet(customerUserId);
            expect(walletBefore.balanceMinor).toBe(50000);

            // 2. Launch 10 concurrent debits of ₹100 (10,000 paise) each
            const debitPromises = Array.from({ length: 10 }).map((_, index) =>
                walletService
                    .debitWallet({
                        userId: customerUserId,
                        amountMinor: 10000,
                        purpose: "ORDER_PAYMENT",
                        referenceType: "CHECKOUT",
                        referenceId: `concurrent_checkout_${index}`,
                        createdBy: "CUSTOMER",
                    })
                    .then(() => ({ status: "SUCCESS" }))
                    .catch((err) => ({ status: "FAILED", error: err.message }))
            );

            const results = await Promise.all(debitPromises);
            const successes = results.filter((r) => r.status === "SUCCESS");
            const failures = results.filter((r) => r.status === "FAILED");

            expect(successes.length).toBe(5);
            expect(failures.length).toBe(5);

            // 3. Final balance must be exactly 0
            const walletAfter = await walletService.getOrCreateWallet(customerUserId);
            expect(walletAfter.balanceMinor).toBe(0);
        });
    });

    /* -------------------------------------------------------------------------- */
    /* 4. Idempotency Replay Test                                                 */
    /* -------------------------------------------------------------------------- */
    describe("4. Scoped Idempotency Replay", () => {
        it("replaying identical credit request 5 times credits wallet exactly once", async () => {
            // Ensure wallet starts at 0 balance
            const currentW = await walletService.getOrCreateWallet(customerUserId);
            if (currentW.balanceMinor > 0) {
                await walletService.debitWallet({
                    userId: customerUserId,
                    amountMinor: currentW.balanceMinor,
                    purpose: "ADMIN_ADJUSTMENT",
                    referenceType: "ADJUSTMENT",
                    referenceId: "reset_before_idemp",
                    createdBy: "SYSTEM",
                });
            }

            const idempotencyKey = `idemp_credit_${Date.now()}`;

            const runs = await Promise.all(
                Array.from({ length: 5 }).map(() =>
                    walletService.creditWallet({
                        userId: customerUserId,
                        amountMinor: 25000, // ₹250
                        purpose: "TOP_UP",
                        referenceType: "TOPUP",
                        referenceId: "ref_idemp",
                        idempotencyKey,
                        createdBy: "CUSTOMER",
                    })
                )
            );

            // All 5 invocations return the same transaction ID
            const txIds = new Set(runs.map((r) => r.transaction.transactionId));
            expect(txIds.size).toBe(1);

            // Balance must be exactly ₹250 (25,000 paise), not 5x
            const wallet = await walletService.getOrCreateWallet(customerUserId);
            expect(wallet.balanceMinor).toBe(25000);

            // Clear balance for subsequent tests
            await walletService.debitWallet({
                userId: customerUserId,
                amountMinor: 25000,
                purpose: "ORDER_PAYMENT",
                referenceType: "CHECKOUT",
                referenceId: "clear_balance",
                createdBy: "SYSTEM",
            });
        });
    });

    /* -------------------------------------------------------------------------- */
    /* 5. Authoritative Webhook Top-Up Flow                                       */
    /* -------------------------------------------------------------------------- */
    describe("5. Authoritative Webhook-Driven Top-Up", () => {
        it("creates top-up intent and credits wallet only when gateway webhook arrives", async () => {
            const intentRes = await request(app)
                .post("/api/v1/wallet/topup/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({
                    amountMinor: 100000, // ₹1,000
                    provider: "MOCK",
                });

            expect(intentRes.status).toBe(200);
            expect(intentRes.body.data.amountMinor).toBe(100000);
            expect(intentRes.body.data.providerPaymentId).toBeDefined();

            const paymentIntentId = intentRes.body.data.providerPaymentId;

            // Record balance before webhook confirmation
            const wBefore = await walletService.getOrCreateWallet(customerUserId);
            const balanceBeforeWebhook = wBefore.balanceMinor;

            // Simulate cryptographically signed gateway webhook
            const webhookPayload = {
                id: `evt_${Date.now()}`,
                type: "payment_intent.succeeded",
                paymentIntentId,
                amountMinor: 100000,
                currency: "INR",
            };

            const rawBody = Buffer.from(JSON.stringify(webhookPayload), "utf-8");
            const signature = crypto
                .createHmac("sha256", env.paymentWebhookSecret)
                .update(rawBody)
                .digest("hex");

            const webhookRes = await request(app)
                .post("/api/v1/payments/webhook")
                .set("x-webhook-signature", signature)
                .set("Content-Type", "application/json")
                .send(webhookPayload);

            expect(webhookRes.status).toBe(200);

            // Wallet must now have balanceBeforeWebhook + ₹1,000 (100,000 paise)
            const wAfter = await walletService.getOrCreateWallet(customerUserId);
            expect(wAfter.balanceMinor).toBe(balanceBeforeWebhook + 100000);

            // Verify immutable ledger transaction was created
            const ledger = await WalletTransactionModel.findOne({
                referenceId: intentRes.body.data.topUpId,
                type: "CREDIT",
                purpose: "TOP_UP",
            });
            expect(ledger).toBeDefined();
            expect(ledger?.amountMinor).toBe(100000);
        });
    });

    /* -------------------------------------------------------------------------- */
    /* 6. Multi-Source Proportional Refund Saga                                   */
    /* -------------------------------------------------------------------------- */
    describe("6. Proportional Refund Saga & Invariants", () => {
        it("distributes partial refund proportionally between wallet and gateway with single-paisa accuracy", async () => {
            const fakeOrderId = new mongoose.Types.ObjectId();

            // Create simulated split payment allocation: ₹400 Wallet + ₹600 Gateway = ₹1,000 Total
            const alloc = new WalletPaymentAllocationModel({
                checkoutId: new mongoose.Types.ObjectId(),
                orderId: fakeOrderId,
                walletId: new mongoose.Types.ObjectId(),
                userId: new mongoose.Types.ObjectId(customerUserId),
                provider: "MOCK",
                walletAmountMinor: 40000, // ₹400
                externalAmountMinor: 60000, // ₹600
                totalAmountMinor: 100000, // ₹1,000
                status: "COMPLETED",
                externalPaymentId: "pi_mock_split_test",
                gatewayIdempotencyKey: "gw_split_test",
                idempotencyKey: `alloc_${Date.now()}`,
            });
            await alloc.save();

            // Cancel ₹300.00 (30,000 paise)
            // Wallet share = 30000 * (40000 / 100000) = 12000 paise (₹120)
            // Gateway share = 30000 - 12000 = 18000 paise (₹180)
            const refundRecord = await refundSagaService.processOrderRefund({
                orderId: fakeOrderId.toString(),
                userId: customerUserId,
                requestedRefundMinor: 30000,
                reason: "Customer returned 1 item",
            });

            expect(refundRecord.status).toBe("COMPLETED");
            expect(refundRecord.walletAmountMinor).toBe(12000);
            expect(refundRecord.externalAmountMinor).toBe(18000);
            expect(refundRecord.walletAmountMinor + refundRecord.externalAmountMinor).toBe(30000);

            // Re-refunding more than remaining balance must fail
            await expect(
                refundSagaService.processOrderRefund({
                    orderId: fakeOrderId.toString(),
                    userId: customerUserId,
                    requestedRefundMinor: 80000, // 30,000 + 80,000 = 110,000 > 100,000
                })
            ).rejects.toThrow("Total refund cannot exceed captured order amount");
        });
    });

    /* -------------------------------------------------------------------------- */
    /* 7. Ledger Reconciliation Worker                                            */
    /* -------------------------------------------------------------------------- */
    describe("7. Ledger Reconciliation Worker", () => {
        it("verifies SUM(credits) - SUM(debits) === wallet.balanceMinor without discrepancies", async () => {
            const result = await runWalletReconciliation();
            expect(result.scannedCount).toBeGreaterThan(0);
            expect(result.discrepancyCount).toBe(0);
            expect(result.balancedCount).toBe(result.scannedCount);
        });
    });

    /* -------------------------------------------------------------------------- */
    /* 8. Admin Wallet Controls & Location-Based Signup Config                    */
    /* -------------------------------------------------------------------------- */
    describe("8. Admin Wallet Controls & Location-Based Signup Config", () => {
        it("rejects non-admin or unauthenticated callers from admin wallet endpoints", async () => {
            // Customer attempting to update config -> 403 Forbidden
            const custRes = await request(app)
                .put("/api/v1/admin/wallet/config")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ signupBonusEnabled: false });
            expect(custRes.status).toBe(403);

            // Unauthenticated attempting to adjust -> 401 Unauthorized
            const anonRes = await request(app)
                .post("/api/v1/admin/wallet/adjust")
                .send({
                    userId: customerUserId,
                    type: "CREDIT",
                    amountMinor: 1000,
                    reason: "Audit test",
                });
            expect(anonRes.status).toBe(401);
        });

        it("allows admin to retrieve and update wallet configuration per currency", async () => {
            // Get config
            const getRes = await request(app)
                .get("/api/v1/admin/wallet/config")
                .set("Authorization", `Bearer ${adminToken}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.data.defaultCurrency).toBe("INR");
            expect(getRes.body.data.signupBonusByCurrency.INR).toBe(5000);

            // Update config
            const putRes = await request(app)
                .put("/api/v1/admin/wallet/config")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    signupBonusEnabled: true,
                    signupBonusByCurrency: {
                        INR: 7500, // ₹75.00
                        USD: 600,  // $6.00
                        EUR: 600,
                    },
                });
            expect(putRes.status).toBe(200);
            expect(putRes.body.data.signupBonusByCurrency.INR).toBe(7500);
            expect(putRes.body.data.signupBonusByCurrency.USD).toBe(600);
        });

        it("provisions wallet with location-specific currency and welcome bonus on customer registration", async () => {
            // Register US customer
            const usRes = await request(app)
                .post("/api/v1/auth/register")
                .send({
                    email: `us.customer.${Date.now()}@example.com`,
                    password: "Password123!",
                    firstName: "US",
                    lastName: "Customer",
                    countryCode: "US",
                });
            expect(usRes.status).toBe(201);
            const usUserId = usRes.body.data.id;

            // Check wallet for US user: currency should be USD and bonus 600 cents ($6.00)
            const usWallet = await walletService.getOrCreateWallet(usUserId);
            expect(usWallet.currency).toBe("USD");
            expect(usWallet.balanceMinor).toBe(600);

            // Verify immutable ledger transaction was created
            const tx = await WalletTransactionModel.findOne({
                walletId: usWallet._id,
                purpose: "SIGNUP_BONUS",
            });
            expect(tx).toBeDefined();
            expect(tx?.amountMinor).toBe(600);
            expect(tx?.type).toBe("CREDIT");
            expect(tx?.referenceType).toBe("REGISTRATION");
        });

        it("allows admin to adjust customer wallet balance with audit reason", async () => {
            const initialWallet = await walletService.getOrCreateWallet(customerUserId);
            const initialBalance = initialWallet.balanceMinor;

            // Admin CREDIT ₹200 (20,000 paise)
            const creditRes = await request(app)
                .post("/api/v1/admin/wallet/adjust")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    userId: customerUserId,
                    type: "CREDIT",
                    amountMinor: 20000,
                    reason: "Customer loyalty goodwill credit",
                });
            expect(creditRes.status).toBe(200);
            expect(creditRes.body.data.wallet.balanceMinor).toBe(initialBalance + 20000);

            // Admin DEBIT ₹100 (10,000 paise)
            const debitRes = await request(app)
                .post("/api/v1/admin/wallet/adjust")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    userId: customerUserId,
                    type: "DEBIT",
                    amountMinor: 10000,
                    reason: "Correction of overcredit",
                });
            expect(debitRes.status).toBe(200);
            expect(debitRes.body.data.wallet.balanceMinor).toBe(initialBalance + 10000);

            // Verify transactions in ledger
            const txs = await WalletTransactionModel.find({
                walletId: initialWallet._id,
                purpose: "ADMIN_ADJUSTMENT",
            });
            expect(txs.length).toBeGreaterThanOrEqual(2);
        });

        it("rejects admin debit when customer has insufficient balance", async () => {
            const res = await request(app)
                .post("/api/v1/admin/wallet/adjust")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    userId: customerUserId,
                    type: "DEBIT",
                    amountMinor: 99999999, // Way more than available balance
                    reason: "Attempt excessive debit",
                });
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe("INSUFFICIENT_FUNDS");
        });

        it("rejects admin adjustment without mandatory reason", async () => {
            const res = await request(app)
                .post("/api/v1/admin/wallet/adjust")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    userId: customerUserId,
                    type: "CREDIT",
                    amountMinor: 5000,
                    reason: "",
                });
            expect(res.status).toBe(400);
            expect(res.body.error.code).toBe("VALIDATION_ERROR");
        });
    });
});
