import mongoose, { Schema, model, Model, Document } from "mongoose";
import { IEntitySeo, LocationSeoOverride, SeoEntityType, ISeoContentSection } from "@ecommers/types";

export interface EntitySeoDocument extends Omit<IEntitySeo, "id" | "_id">, Document {}

const ContentSectionSchema = new Schema<ISeoContentSection>(
    {
        title: { type: String, trim: true },
        value: { type: String },
    },
    { _id: false }
);

const LocationSeoSchema = new Schema<LocationSeoOverride>(
    {
        locationKey: { type: String, required: true, trim: true, lowercase: true },
        locationType: { type: String, enum: ["CITY", "COUNTRY", "ZONE"], required: true },
        locationName: { type: String, required: true, trim: true },
        currency: { type: String, uppercase: true, trim: true, default: "INR" },
        metaTitle: { type: String, trim: true },
        metaDescription: { type: String, trim: true },
        keywords: [{ type: String, trim: true }],
        deliveryHighlight: { type: String, trim: true },
        canonicalUrl: { type: String, trim: true },
        metaRobots: { type: String, trim: true },
        isIndexed: { type: Boolean, default: true },
        internalSection: { type: ContentSectionSchema, default: undefined },
        bottomSection: { type: ContentSectionSchema, default: undefined },
    },
    { _id: false }
);

const EntitySeoSchema = new Schema<EntitySeoDocument>(
    {
        entityType: {
            type: String,
            enum: ["PRODUCT", "CATEGORY", "BRAND", "COLLECTION", "PAGE", "COURSE"],
            required: true,
            index: true,
        },
        entityId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        entitySlug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        entityTitle: {
            type: String,
            trim: true,
        },
        global: {
            metaTitle: { type: String, trim: true },
            metaDescription: { type: String, trim: true },
            metaRobots: { type: String, default: "index, follow", trim: true },
            keywords: [{ type: String, trim: true }],
            canonicalUrl: { type: String, trim: true },
            ogTitle: { type: String, trim: true },
            ogDescription: { type: String, trim: true },
            ogImage: { type: String, trim: true },
            internalSection: { type: ContentSectionSchema, default: undefined },
            bottomSection: { type: ContentSectionSchema, default: undefined },
        },
        locations: {
            type: [LocationSeoSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for ultra-fast lookup
EntitySeoSchema.index({ entityType: 1, entityId: 1 }, { unique: true });
EntitySeoSchema.index({ entityType: 1, entitySlug: 1 });
EntitySeoSchema.index({ "locations.locationKey": 1 });

export const EntitySeoModel =
    (mongoose.models.EntitySeo as Model<EntitySeoDocument>) ||
    model<EntitySeoDocument>("EntitySeo", EntitySeoSchema);
