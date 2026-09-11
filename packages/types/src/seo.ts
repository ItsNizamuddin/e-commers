export interface ISeoContentSection {
    title?: string | undefined;
    value?: string | undefined; // Rich HTML/Markdown content for SEO text blocks
}

export interface LocationSeoOverride {
    locationKey: string;          // e.g. "bangalore", "hyderabad", "us", "ae"
    locationType: "CITY" | "COUNTRY" | "ZONE";
    locationName: string;         // e.g. "Bangalore", "United States"
    currency?: string | undefined;            // e.g. "INR", "USD", "AED"
    metaTitle?: string | undefined;           // Localized Meta Title
    metaDescription?: string | undefined;     // Localized Meta Description
    keywords?: string[] | undefined;          // Localized keywords
    deliveryHighlight?: string | undefined;   // Local delivery badge text
    canonicalUrl?: string | undefined;        // Local canonical URL
    isIndexed?: boolean | undefined;          // Indexing flag
    metaRobots?: string | undefined;         // Local robots tag e.g. "index, follow"
    internalSection?: ISeoContentSection | undefined;
    bottomSection?: ISeoContentSection | undefined;
}

export interface SeoMetadata {
    // Meta Head Attributes
    metaTitle?: string | undefined;
    metaDescription?: string | undefined;
    metaRobots?: string | undefined; // e.g. "index, follow" or "noindex, nofollow"
    keywords?: string[] | undefined;
    canonicalUrl?: string | undefined;

    // Open Graph (Facebook, WhatsApp, LinkedIn, Slack social cards)
    ogTitle?: string | undefined;
    ogDescription?: string | undefined;
    ogImage?: string | undefined;
    ogType?: string | undefined; // e.g. "website", "article", "product"

    // Twitter / X Cards
    twitterCard?: string | undefined; // e.g. "summary", "summary_large_image"
    twitterTitle?: string | undefined;
    twitterDescription?: string | undefined;
    twitterImage?: string | undefined;

    // Rich SEO Content Sections (for long-form SEO copy, FAQs, landing text)
    internalSection?: ISeoContentSection | undefined;
    bottomSection?: ISeoContentSection | undefined;

    // Custom JSON-LD / Schema.org Rich Snippets
    structuredData?: Record<string, unknown> | undefined;

    // Location-Specific SEO Overrides (City & Country pages)
    locations?: LocationSeoOverride[] | undefined;
}

export type SeoEntityType = "PRODUCT" | "CATEGORY" | "BRAND" | "COLLECTION" | "PAGE" | "COURSE";

export interface IEntitySeo {
    id?: string | undefined;
    _id?: string | undefined;
    entityType: SeoEntityType;
    entityId: string;
    entitySlug: string;
    entityTitle?: string | undefined;
    global: {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        metaRobots?: string | undefined;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        ogTitle?: string | undefined;
        ogDescription?: string | undefined;
        ogImage?: string | undefined;
        internalSection?: ISeoContentSection | undefined;
        bottomSection?: ISeoContentSection | undefined;
    };
    locations: LocationSeoOverride[];
    createdAt?: string | Date | undefined;
    updatedAt?: string | Date | undefined;
}

export interface BulkSeoRow {
    entityType: SeoEntityType;
    entityIdentifier: string; // ID or Slug
    locationKey: string;      // "GLOBAL" or location code like "bangalore"
    metaTitle?: string | undefined;
    metaDescription?: string | undefined;
    keywords?: string | undefined;       // comma-separated or string[]
    deliveryHighlight?: string | undefined;
    canonicalUrl?: string | undefined;
    internalSectionTitle?: string | undefined;
    internalSectionValue?: string | undefined;
    bottomSectionTitle?: string | undefined;
    bottomSectionValue?: string | undefined;
}

export interface BulkSeoUploadResult {
    totalRows: number;
    updatedEntitiesCount: number;
    createdCount: number;
    errors: Array<{ row: number; identifier?: string; message: string }>;
}
