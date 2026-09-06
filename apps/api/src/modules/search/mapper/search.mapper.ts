import type {
    SearchProductItem,
    SearchPriceItem,
    SearchResponse,
    SearchFacets,
    SearchPagination,
} from "@ecommers/types";

export interface RawSearchProduct {
    _id: any;
    title: string;
    slug: string;
    brand?: string;
    categoryId: any;
    thumbnail?: string;
    images?: string[];
    variants: Array<{
        id: string;
        sku: string;
        title?: string;
        isActive?: boolean;
        prices: Array<{
            currency: string;
            amount: number;
            compareAtAmount?: number;
        }>;
    }>;
    averageRating?: number;
    reviewCount?: number;
    score?: number;
    createdAt: Date;
}

export class SearchMapper {
    mapProductToItem(
        product: RawSearchProduct,
        categoryNameMap: Map<string, string>,
        inventoryMap: Map<string, { availableQuantity: number; inStock: boolean }>,
        targetCurrency: string
    ): SearchProductItem {
        const catId = product.categoryId?.toString?.() ?? String(product.categoryId);
        const categoryName = categoryNameMap.get(catId);

        // Find best active price in requested currency
        let resolvedPrice: SearchPriceItem | null = null;
        let lowestAmount = Infinity;

        const activeVariants = product.variants?.filter((v) => v.isActive !== false) ?? [];

        for (const variant of activeVariants) {
            const price = variant.prices?.find(
                (p) => p.currency.toUpperCase() === targetCurrency.toUpperCase()
            );
            if (price && price.amount < lowestAmount) {
                lowestAmount = price.amount;
                resolvedPrice = {
                    currency: price.currency,
                    amount: price.amount,
                    ...(price.compareAtAmount !== undefined
                        ? { compareAtAmount: price.compareAtAmount }
                        : {}),
                };
            }
        }

        // Calculate aggregated product-level stock availability
        let totalAvailable = 0;
        let isProductInStock = false;

        for (const variant of activeVariants) {
            const vId = variant.id || (variant as any)._id?.toString();
            const inv = inventoryMap.get(vId);
            if (inv) {
                totalAvailable += inv.availableQuantity;
                if (inv.inStock) {
                    isProductInStock = true;
                }
            }
        }

        const thumbnail = product.thumbnail || product.images?.[0];

        return {
            id: product._id.toString(),
            title: product.title,
            slug: product.slug,
            ...(product.brand ? { brand: product.brand } : {}),
            categoryId: catId,
            ...(categoryName ? { categoryName } : {}),
            ...(thumbnail ? { thumbnail } : {}),
            price: resolvedPrice,
            variantsCount: product.variants?.length ?? 0,
            inStock: isProductInStock,
            availableQuantity: totalAvailable,
            averageRating: product.averageRating ?? 0,
            reviewCount: product.reviewCount ?? 0,
            ...(product.score !== undefined ? { score: product.score } : {}),
            createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
        };
    }

    buildSearchResponse(
        items: SearchProductItem[],
        pagination: SearchPagination,
        facets: SearchFacets
    ): SearchResponse {
        return {
            items,
            pagination,
            facets,
        };
    }
}

export const searchMapper = new SearchMapper();
