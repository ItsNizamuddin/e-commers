import { Schema } from "mongoose";
import { SeoMetadata } from "@shopsphere/types";

const ContentSectionSchema = new Schema(
    {
        title: { type: String, trim: true },
        value: { type: String },
    },
    { _id: false }
);

export const SeoSchema = new Schema<SeoMetadata>(
    {
        metaTitle: { type: String, trim: true },
        metaDescription: { type: String, trim: true },
        metaRobots: { type: String, default: "index, follow", trim: true },
        keywords: [{ type: String, trim: true }],
        canonicalUrl: { type: String, trim: true },
        ogTitle: { type: String, trim: true },
        ogDescription: { type: String, trim: true },
        ogImage: { type: String, trim: true },
        ogType: { type: String, default: "website" },
        twitterCard: { type: String, default: "summary_large_image" },
        twitterTitle: { type: String, trim: true },
        twitterDescription: { type: String, trim: true },
        twitterImage: { type: String, trim: true },
        internalSection: { type: ContentSectionSchema, default: undefined },
        bottomSection: { type: ContentSectionSchema, default: undefined },
        structuredData: { type: Schema.Types.Mixed, default: undefined },
    },
    { _id: false }
);
