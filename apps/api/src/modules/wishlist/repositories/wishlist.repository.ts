import { ClientSession, Types } from "mongoose";
import { WishlistModel, IWishlistDocument } from "../models/wishlist.model.js";

export class WishlistRepository {
    async findByUserId(
        userId: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<IWishlistDocument | null> {
        return await WishlistModel.findOne({ userId }).session(session ?? null).exec();
    }

    async findOrCreate(
        userId: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<IWishlistDocument> {
        const existing = await this.findByUserId(userId, session);
        if (existing) {
            return existing;
        }

        const created = await WishlistModel.findOneAndUpdate(
            { userId },
            {
                $setOnInsert: {
                    userId,
                    items: [],
                },
            },
            { upsert: true, returnDocument: "after", session: session ?? null }
        ).exec();

        return created!;
    }

    async addItem(
        userId: string | Types.ObjectId,
        productId: string | Types.ObjectId,
        variantId: string,
        session?: ClientSession
    ): Promise<IWishlistDocument> {
        // 1. Attempt to add item if variantId does not exist in items
        const updated = await WishlistModel.findOneAndUpdate(
            { userId, "items.variantId": { $nin: [variantId] } },
            {
                $push: {
                    items: {
                        productId: new Types.ObjectId(productId),
                        variantId,
                        addedAt: new Date(),
                    },
                },
            },
            { returnDocument: "after", session: session ?? null }
        ).exec();

        if (updated) {
            return updated;
        }

        // 2. If null, either wishlist doesn't exist or variantId is already present
        const existing = await this.findByUserId(userId, session);
        if (existing) {
            // Already present in wishlist; idempotent return without duplicating
            return existing;
        }

        // 3. Wishlist doesn't exist yet: upsert initial document with item
        const created = await WishlistModel.findOneAndUpdate(
            { userId },
            {
                $setOnInsert: {
                    userId,
                    items: [
                        {
                            productId: new Types.ObjectId(productId),
                            variantId,
                            addedAt: new Date(),
                        },
                    ],
                },
            },
            { upsert: true, returnDocument: "after", session: session ?? null }
        ).exec();

        return created!;
    }

    async removeItem(
        userId: string | Types.ObjectId,
        variantId: string,
        session?: ClientSession
    ): Promise<IWishlistDocument | null> {
        return await WishlistModel.findOneAndUpdate(
            { userId },
            {
                $pull: {
                    items: { variantId },
                },
            },
            { returnDocument: "after", session: session ?? null }
        ).exec();
    }

    async clearWishlist(
        userId: string | Types.ObjectId,
        session?: ClientSession
    ): Promise<IWishlistDocument | null> {
        return await WishlistModel.findOneAndUpdate(
            { userId },
            {
                $set: { items: [] },
            },
            { returnDocument: "after", session: session ?? null }
        ).exec();
    }
}

export const wishlistRepository = new WishlistRepository();
