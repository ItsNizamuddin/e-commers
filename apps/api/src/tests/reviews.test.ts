import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Types } from "mongoose";

import app from "../app.js";
import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import { UserModel } from "../modules/users/user.model.js";
import { SessionModel } from "../modules/auth/session.model.js";
import { CategoryModel } from "../modules/categories/category.model.js";
import { ProductModel } from "../modules/products/product.model.js";
import { OrderModel } from "../modules/orders/models/order.model.js";
import { ReviewModel } from "../modules/reviews/models/review.model.js";
import { seedDefaultSuperAdmin } from "../database/seed.js";

describe("Product Reviews & Ratings Integration Tests", () => {
    let adminToken: string;
    let customerAToken: string;
    let customerBToken: string;
    let customerCToken: string; // Non-purchaser

    let customerAId: string;
    let customerBId: string;
    let customerCId: string;

    let testProductId: string;
    let otherProductId: string;
    let variantAId: string;
    let variantBId: string;

    beforeAll(async () => {
        await connectDatabase();
        await ReviewModel.deleteMany({});
        await OrderModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await seedDefaultSuperAdmin();

        // 1. Login Admin
        const adminLogin = await request(app)
            .post("/api/v1/auth/admin/login")
            .send({
                email: "superadmin@gmail.com",
                password: "admin@123",
            });
        adminToken = adminLogin.body.data.accessToken;

        // 2. Register Customer A
        const regA = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "rev.customer.a@ecommers.test",
                password: "Password123!",
                firstName: "Alice",
                lastName: "Reviewer",
            });
        customerAId = regA.body.data.id;

        const loginA = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "rev.customer.a@ecommers.test",
                password: "Password123!",
            });
        customerAToken = loginA.body.data.accessToken;

        // 3. Register Customer B
        const regB = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "rev.customer.b@ecommers.test",
                password: "Password123!",
                firstName: "Bob",
                lastName: "Critic",
            });
        customerBId = regB.body.data.id;

        const loginB = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "rev.customer.b@ecommers.test",
                password: "Password123!",
            });
        customerBToken = loginB.body.data.accessToken;

        // 4. Register Customer C (Never purchased)
        const regC = await request(app)
            .post("/api/v1/auth/register")
            .send({
                email: "rev.customer.c@ecommers.test",
                password: "Password123!",
                firstName: "Charlie",
                lastName: "Stranger",
            });
        customerCId = regC.body.data.id;

        const loginC = await request(app)
            .post("/api/v1/auth/login")
            .send({
                email: "rev.customer.c@ecommers.test",
                password: "Password123!",
            });
        customerCToken = loginC.body.data.accessToken;

        // 5. Seed Category & Products
        const category = await CategoryModel.create({
            name: "Audio & Headphones",
            slug: "audio-headphones",
        });

        variantAId = new Types.ObjectId().toString();
        variantBId = new Types.ObjectId().toString();

        const product = await ProductModel.create({
            title: "Pro Noise-Cancelling Headphones",
            slug: "pro-noise-cancelling-headphones",
            brand: "AeroSound",
            categoryId: category._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            version: 1,
            averageRating: 0,
            reviewCount: 0,
            variants: [
                {
                    id: variantAId,
                    sku: "REV-VAR-A",
                    title: "Matte Black",
                    prices: [{ currency: "USD", amount: 299.0 }],
                    isActive: true,
                },
            ],
        });
        testProductId = product._id.toString();

        const otherProduct = await ProductModel.create({
            title: "Wireless Earbuds Mini",
            slug: "wireless-earbuds-mini",
            brand: "AeroSound",
            categoryId: category._id,
            baseCurrency: "USD",
            status: "PUBLISHED",
            version: 1,
            averageRating: 0,
            reviewCount: 0,
            variants: [
                {
                    id: variantBId,
                    sku: "REV-VAR-B",
                    title: "White",
                    prices: [{ currency: "USD", amount: 99.0 }],
                    isActive: true,
                },
            ],
        });
        otherProductId = otherProduct._id.toString();

        // 6. Seed Delivered Order for Customer A (contains testProductId, DELIVERED)
        await OrderModel.create({
            orderNumber: "ORD-REV-001",
            checkoutId: new Types.ObjectId(),
            paymentId: new Types.ObjectId(),
            customerId: new Types.ObjectId(customerAId),
            customerEmailSnapshot: "rev.customer.a@ecommers.test",
            items: [
                {
                    productId: testProductId,
                    variantId: variantAId,
                    sku: "REV-VAR-A",
                    productTitle: "Pro Noise-Cancelling Headphones",
                    variantTitle: "Matte Black",
                    quantity: 1,
                    currency: "USD",
                    unitPriceMinor: 29900,
                    lineTotalMinor: 29900,
                },
            ],
            shippingAddressSnapshot: {
                firstName: "Alice",
                lastName: "Reviewer",
                street: "123 Audio Way",
                city: "Boston",
                state: "MA",
                postalCode: "02101",
                country: "US",
            },
            billingAddressSnapshot: {
                firstName: "Alice",
                lastName: "Reviewer",
                street: "123 Audio Way",
                city: "Boston",
                state: "MA",
                postalCode: "02101",
                country: "US",
            },
            pricing: {
                subtotalMinor: 29900,
                shippingMinor: 0,
                taxMinor: 2000,
                discountMinor: 0,
                grandTotalMinor: 31900,
                currency: "USD",
            },
            orderStatus: "COMPLETED",
            paymentStatus: "CAPTURED",
            fulfillmentStatus: "DELIVERED", // <-- Crucial: Delivered!
        });

        // 7. Seed Delivered Order for Customer B (contains testProductId, DELIVERED)
        await OrderModel.create({
            orderNumber: "ORD-REV-002",
            checkoutId: new Types.ObjectId(),
            paymentId: new Types.ObjectId(),
            customerId: new Types.ObjectId(customerBId),
            customerEmailSnapshot: "rev.customer.b@ecommers.test",
            items: [
                {
                    productId: testProductId,
                    variantId: variantAId,
                    sku: "REV-VAR-A",
                    productTitle: "Pro Noise-Cancelling Headphones",
                    variantTitle: "Matte Black",
                    quantity: 1,
                    currency: "USD",
                    unitPriceMinor: 29900,
                    lineTotalMinor: 29900,
                },
            ],
            shippingAddressSnapshot: {
                firstName: "Bob",
                lastName: "Critic",
                street: "456 Bass Blvd",
                city: "Austin",
                state: "TX",
                postalCode: "78701",
                country: "US",
            },
            billingAddressSnapshot: {
                firstName: "Bob",
                lastName: "Critic",
                street: "456 Bass Blvd",
                city: "Austin",
                state: "TX",
                postalCode: "78701",
                country: "US",
            },
            pricing: {
                subtotalMinor: 29900,
                shippingMinor: 0,
                taxMinor: 2000,
                discountMinor: 0,
                grandTotalMinor: 31900,
                currency: "USD",
            },
            orderStatus: "COMPLETED",
            paymentStatus: "CAPTURED",
            fulfillmentStatus: "DELIVERED", // <-- Crucial: Delivered!
        });

        // 8. Seed Undelivered Order for Customer A (contains otherProductId, PROCESSING - NOT DELIVERED)
        await OrderModel.create({
            orderNumber: "ORD-REV-003-UNDELIV",
            checkoutId: new Types.ObjectId(),
            paymentId: new Types.ObjectId(),
            customerId: new Types.ObjectId(customerAId),
            customerEmailSnapshot: "rev.customer.a@ecommers.test",
            items: [
                {
                    productId: otherProductId,
                    variantId: variantBId,
                    sku: "REV-VAR-B",
                    productTitle: "Wireless Earbuds Mini",
                    variantTitle: "White",
                    quantity: 1,
                    currency: "USD",
                    unitPriceMinor: 9900,
                    lineTotalMinor: 9900,
                },
            ],
            shippingAddressSnapshot: {
                firstName: "Alice",
                lastName: "Reviewer",
                street: "123 Audio Way",
                city: "Boston",
                state: "MA",
                postalCode: "02101",
                country: "US",
            },
            billingAddressSnapshot: {
                firstName: "Alice",
                lastName: "Reviewer",
                street: "123 Audio Way",
                city: "Boston",
                state: "MA",
                postalCode: "02101",
                country: "US",
            },
            pricing: {
                subtotalMinor: 9900,
                shippingMinor: 0,
                taxMinor: 500,
                discountMinor: 0,
                grandTotalMinor: 10400,
                currency: "USD",
            },
            orderStatus: "CONFIRMED",
            paymentStatus: "CAPTURED",
            fulfillmentStatus: "PROCESSING", // <-- Undelivered!
        });
    }, 120000);

    afterAll(async () => {
        await ReviewModel.deleteMany({});
        await OrderModel.deleteMany({});
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});
        await UserModel.deleteMany({});
        await SessionModel.deleteMany({});
        await disconnectDatabase();
    });

    let createdReviewId: string;
    let customerBReviewId: string;

    /* -------------------------------------------------------------------------- */
    /* 1. Verified Purchase Requirement Guards                                    */
    /* -------------------------------------------------------------------------- */
    it("Scenario 1: Rejects review if customer has not purchased or order is not yet delivered", async () => {
        // 1.1 Customer C never bought the product -> 403 VERIFIED_PURCHASE_REQUIRED
        const unpurchasedRes = await request(app)
            .post(`/api/v1/products/${testProductId}/reviews`)
            .set("Authorization", `Bearer ${customerCToken}`)
            .send({
                rating: 5,
                title: "Looks cool but never bought it",
                comment: "I am writing this review without purchasing the product!",
            });

        expect(unpurchasedRes.status).toBe(403);
        expect(unpurchasedRes.body.error.code).toBe("VERIFIED_PURCHASE_REQUIRED");

        // 1.2 Customer A purchased otherProductId, but status is PROCESSING (not DELIVERED) -> 403
        const undeliveredRes = await request(app)
            .post(`/api/v1/products/${otherProductId}/reviews`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                rating: 4,
                title: "Still in transit",
                comment: "I haven't received it yet but wanted to leave a review.",
            });

        expect(undeliveredRes.status).toBe(403);
        expect(undeliveredRes.body.error.code).toBe("VERIFIED_PURCHASE_REQUIRED");
    });

    /* -------------------------------------------------------------------------- */
    /* 2. Successful Review Creation & Denormalized Rating Update                 */
    /* -------------------------------------------------------------------------- */
    it("Scenario 2: Verified purchaser can post review, atomically updating Product rating", async () => {
        const res = await request(app)
            .post(`/api/v1/products/${testProductId}/reviews`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                rating: 5,
                title: "Incredible soundstage and ANC",
                comment: "The noise cancellation is top tier, battery easily lasts 30+ hours.",
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.isVerifiedPurchase).toBe(true);
        expect(res.body.data.rating).toBe(5);
        expect(res.body.data.title).toBe("Incredible soundstage and ANC");
        expect(res.body.data.userName).toContain("Alice");

        createdReviewId = res.body.data.id;

        // Verify denormalized rating on ProductModel
        const updatedProduct = await ProductModel.findById(testProductId);
        expect(updatedProduct?.averageRating).toBe(5);
        expect(updatedProduct?.reviewCount).toBe(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 3. One Active Review Per Customer/Product (Duplicate Prevention)           */
    /* -------------------------------------------------------------------------- */
    it("Scenario 3: Prevents duplicate reviews from the same customer on the same product", async () => {
        const dupRes = await request(app)
            .post(`/api/v1/products/${testProductId}/reviews`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                rating: 1,
                title: "Trying to post another review",
                comment: "Attempting to spam multiple reviews for the same product.",
            });

        expect(dupRes.status).toBe(409);
        expect(dupRes.body.error.code).toBe("DUPLICATE_REVIEW");
    });

    /* -------------------------------------------------------------------------- */
    /* 4. Customer Updates Their Existing Review                                  */
    /* -------------------------------------------------------------------------- */
    it("Scenario 4: Author can update review, triggering rating recalculation", async () => {
        // Customer B cannot update Customer A's review (Forbidden)
        const forbiddenRes = await request(app)
            .patch(`/api/v1/reviews/${createdReviewId}`)
            .set("Authorization", `Bearer ${customerBToken}`)
            .send({ rating: 1 });
        expect(forbiddenRes.status).toBe(403);

        // Customer A updates their review from 5 stars to 3 stars
        const updateRes = await request(app)
            .patch(`/api/v1/reviews/${createdReviewId}`)
            .set("Authorization", `Bearer ${customerAToken}`)
            .send({
                rating: 3,
                title: "Good sound but clamp force is tight",
                comment: "After two weeks of use, the headband feels slightly tight.",
            });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.rating).toBe(3);
        expect(updateRes.body.data.title).toBe("Good sound but clamp force is tight");

        // Product average rating recalculates to 3.0
        const updatedProduct = await ProductModel.findById(testProductId);
        expect(updatedProduct?.averageRating).toBe(3);
        expect(updatedProduct?.reviewCount).toBe(1);
    });

    /* -------------------------------------------------------------------------- */
    /* 5. Multi-Customer Reviews & Rating Distribution Summary                    */
    /* -------------------------------------------------------------------------- */
    it("Scenario 5: Aggregates multiple customer reviews and computes rating distribution", async () => {
        // Customer B posts 4-star review
        const resB = await request(app)
            .post(`/api/v1/products/${testProductId}/reviews`)
            .set("Authorization", `Bearer ${customerBToken}`)
            .send({
                rating: 4,
                title: "Solid audio performance",
                comment: "Great for classical and jazz music. Bass is tight and controlled.",
            });

        expect(resB.status).toBe(201);
        customerBReviewId = resB.body.data.id;

        // Product rating: (3 + 4) / 2 = 3.5
        const product = await ProductModel.findById(testProductId);
        expect(product?.averageRating).toBe(3.5);
        expect(product?.reviewCount).toBe(2);

        // Fetch Public Product Reviews listing
        const listRes = await request(app)
            .get(`/api/v1/products/${testProductId}/reviews?page=1&limit=10&sortBy=highest`);

        expect(listRes.status).toBe(200);
        expect(listRes.body.success).toBe(true);

        const { summary, data } = listRes.body;
        expect(summary.averageRating).toBe(3.5);
        expect(summary.totalReviews).toBe(2);
        expect(summary.breakdown[4]).toBe(1);
        expect(summary.breakdown[3]).toBe(1);
        expect(summary.breakdown[5]).toBe(0);

        expect(data.length).toBe(2);
        // Sorted by highest rating: 4-star first, then 3-star
        expect(data[0].rating).toBe(4);
        expect(data[1].rating).toBe(3);
    });

    /* -------------------------------------------------------------------------- */
    /* 6. Helpful Votes Toggle                                                    */
    /* -------------------------------------------------------------------------- */
    it("Scenario 6: Allows authenticated users to toggle helpful votes on reviews", async () => {
        // Customer A votes Customer B's review as helpful
        const voteRes = await request(app)
            .post(`/api/v1/reviews/${customerBReviewId}/vote`)
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(voteRes.status).toBe(200);
        expect(voteRes.body.data.helpfulVotes).toBe(1);
        expect(voteRes.body.data.hasVotedHelpful).toBe(true);

        // Customer A votes again -> toggles vote off
        const unvoteRes = await request(app)
            .post(`/api/v1/reviews/${customerBReviewId}/vote`)
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(unvoteRes.status).toBe(200);
        expect(unvoteRes.body.data.helpfulVotes).toBe(0);
        expect(unvoteRes.body.data.hasVotedHelpful).toBe(false);
    });

    /* -------------------------------------------------------------------------- */
    /* 7. Review Deletion & Recalculation                                         */
    /* -------------------------------------------------------------------------- */
    it("Scenario 7: Author or Admin can delete review, dynamically adjusting rating", async () => {
        // Customer A deletes their own review
        const delRes = await request(app)
            .delete(`/api/v1/reviews/${createdReviewId}`)
            .set("Authorization", `Bearer ${customerAToken}`);

        expect(delRes.status).toBe(200);

        // Product rating should now reflect only Customer B's 4-star review
        const productAfterA = await ProductModel.findById(testProductId);
        expect(productAfterA?.averageRating).toBe(4);
        expect(productAfterA?.reviewCount).toBe(1);

        // Admin can moderate and delete Customer B's review
        const adminDelRes = await request(app)
            .delete(`/api/v1/reviews/${customerBReviewId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(adminDelRes.status).toBe(200);

        // Product rating now resets to 0 with 0 reviews
        const productAfterB = await ProductModel.findById(testProductId);
        expect(productAfterB?.averageRating).toBe(0);
        expect(productAfterB?.reviewCount).toBe(0);
    });
});
