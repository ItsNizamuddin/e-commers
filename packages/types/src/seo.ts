export interface ISeoContentSection {
    title?: string;
    value?: string; // Rich HTML/Markdown content for SEO text blocks
}

export interface SeoMetadata {
    // Meta Head Attributes
    metaTitle?: string;
    metaDescription?: string;
    metaRobots?: string; // e.g. "index, follow" or "noindex, nofollow"
    keywords?: string[];
    canonicalUrl?: string;

    // Open Graph (Facebook, WhatsApp, LinkedIn, Slack social cards)
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string; // e.g. "website", "article", "product"

    // Twitter / X Cards
    twitterCard?: string; // e.g. "summary", "summary_large_image"
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;

    // Rich SEO Content Sections (for long-form SEO copy, FAQs, landing text)
    internalSection?: ISeoContentSection;
    bottomSection?: ISeoContentSection;

    // Custom JSON-LD / Schema.org Rich Snippets
    structuredData?: Record<string, unknown>;
}
