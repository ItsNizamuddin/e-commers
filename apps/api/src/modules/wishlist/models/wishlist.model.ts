import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IWishlistItem {
    productId: Types.ObjectId;
    variantId: string;
    addedAt: Date;
}

export interface IWishlistDocument extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    items: IWishlistItem[];
    createdAt: Date;
    updatedAt: Date;
}

const wishlistItemSchema = new Schema<IWishlistItem>(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: String,
            required: true,
            trim: true,
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const wishlistSchema = new Schema<IWishlistDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: {
            type: [wishlistItemSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
wishlistSchema.index({ userId: 1 }, { unique: true });
wishlistSchema.index({ "items.productId": 1 });
wishlistSchema.index({ "items.variantId": 1 });

export const WishlistModel: Model<IWishlistDocument> =
    mongoose.models.Wishlist || mongoose.model<IWishlistDocument>("Wishlist", wishlistSchema);
