import mongoose, { Schema, Document, Types } from "mongoose";
import { ReviewStatus } from "@ecommers/types";

export interface ReviewDocument extends Document {
    _id: Types.ObjectId;
    productId: Types.ObjectId;
    userId: Types.ObjectId;
    userName: string;
    rating: number;
    title?: string;
    comment: string;
    isVerifiedPurchase: boolean;
    helpfulVotes: number;
    votedUserIds: Types.ObjectId[];
    status: ReviewStatus;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDocument>(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        userName: {
            type: String,
            required: true,
            trim: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            index: true,
        },
        title: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 2000,
        },
        isVerifiedPurchase: {
            type: Boolean,
            default: true,
            required: true,
        },
        helpfulVotes: {
            type: Number,
            default: 0,
            min: 0,
        },
        votedUserIds: {
            type: [{ type: Schema.Types.ObjectId, ref: "User" }],
            default: [],
        },
        status: {
            type: String,
            enum: ["APPROVED", "FLAGGED", "REJECTED"],
            default: "APPROVED",
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "reviews",
    }
);

// One active review per customer per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
// Compound index for sorted product review listings
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, status: 1, helpfulVotes: -1 });

export const ReviewModel =
    (mongoose.models.Review as mongoose.Model<ReviewDocument>) ||
    mongoose.model<ReviewDocument>("Review", reviewSchema);
