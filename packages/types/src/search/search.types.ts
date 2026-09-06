export type SearchSortOption =
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "rating"
    | "newest";

export interface SearchPriceItem {
    currency: string;
    amount: number;
    compareAtAmount?: number | undefined;
}

export interface SearchProductItem {
    id: string;
    title: string;
    slug: string;
    brand?: string | undefined;
    categoryId: string;
    categoryName?: string | undefined;
    thumbnail?: string | undefined;
    price: SearchPriceItem | null;
    variantsCount: number;
    inStock: boolean;
    availableQuantity: number;
    averageRating: number;
    reviewCount: number;
    score?: number | undefined;
    createdAt: string;
}

export interface SearchFacetBrand {
    name: string;
    count: number;
}

export interface SearchFacetCategory {
    id: string;
    name: string;
    slug: string;
    count: number;
}

export interface SearchFacetPrice {
    min: number;
    max: number;
}

export interface SearchFacets {
    brands: SearchFacetBrand[];
    categories: SearchFacetCategory[];
    price: SearchFacetPrice;
}

export interface SearchPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface SearchResponse {
    items: SearchProductItem[];
    pagination: SearchPagination;
    facets: SearchFacets;
}

export interface SearchQueryInput {
    q?: string | undefined;
    categoryId?: string | undefined;
    brand?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    currency?: string | undefined;
    inStock?: boolean | undefined;
    minRating?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: SearchSortOption | undefined;
}
