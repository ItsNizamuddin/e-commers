import { Types } from "mongoose";
import { ProductModel } from "../../products/product.model.js";
import { CategoryModel } from "../../categories/category.model.js";
import { InventoryModel } from "../../inventory/models/inventory.model.js";
import { searchMapper, SearchMapper, RawSearchProduct } from "../mapper/search.mapper.js";
import type {
    SearchQueryInput,
    SearchResponse,
    SearchFacetBrand,
    SearchFacetCategory,
    SearchFacetPrice,
    SearchPagination,
} from "@shopsphere/types";

function escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export class SearchService {
    constructor(private readonly mapper: SearchMapper = searchMapper) {}

    async searchCatalog(query: SearchQueryInput): Promise<SearchResponse> {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
        const currency = (query.currency || "USD").toUpperCase();
        const sortBy = query.sortBy || (query.q ? "relevance" : "newest");

        // 1. Resolve Category and Subcategory IDs if categoryId is provided
        let targetCategoryIds: Types.ObjectId[] = [];
        if (query.categoryId && Types.ObjectId.isValid(query.categoryId)) {
            const catObjId = new Types.ObjectId(query.categoryId);
            const descendantCategories = await CategoryModel.find({
                $or: [{ _id: catObjId }, { ancestors: catObjId }],
                isActive: true,
            })
                .select("_id")
                .lean()
                .exec();

            targetCategoryIds = descendantCategories.map((c: any) => c._id);
            if (targetCategoryIds.length === 0) {
                targetCategoryIds = [catObjId];
            }
        }

        // 2. Resolve In-Stock Product IDs if inStock filter is specified
        let inStockProductIds: Types.ObjectId[] | null = null;
        const isInStock =
            query.inStock !== undefined
                ? query.inStock === true || String(query.inStock) === "true"
                : null;

        if (isInStock !== null) {
            const inStockResults = await InventoryModel.aggregate([
                {
                    $match: {
                        $or: [
                            { allowBackorder: true },
                            { $expr: { $gt: ["$onHand", { $add: ["$reserved", "$safetyStock"] }] } },
                        ],
                    },
                },
                {
                    $group: { _id: "$productId" },
                },
            ]).exec();

            inStockProductIds = inStockResults.map((r: any) => new Types.ObjectId(r._id));
        }

        // 3. Build MongoDB Base Query Filter
        const baseMatch: Record<string, any> = {
            status: "PUBLISHED",
        };

        if (query.q && query.q.trim()) {
            baseMatch.$text = { $search: query.q.trim() };
        }

        if (targetCategoryIds.length > 0) {
            baseMatch.categoryId = { $in: targetCategoryIds };
        }

        if (query.brand && query.brand.trim()) {
            baseMatch.brand = { $regex: new RegExp(`^${escapeRegex(query.brand.trim())}$`, "i") };
        }

        if (query.minRating !== undefined && query.minRating > 0) {
            baseMatch.averageRating = { $gte: Number(query.minRating) };
        }

        // Explicit currency-aware price bounds
        if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            const priceCondition: Record<string, any> = {
                currency,
            };
            if (query.minPrice !== undefined) {
                priceCondition.amount = { ...priceCondition.amount, $gte: Number(query.minPrice) };
            }
            if (query.maxPrice !== undefined) {
                priceCondition.amount = { ...priceCondition.amount, $lte: Number(query.maxPrice) };
            }

            baseMatch.variants = {
                $elemMatch: {
                    isActive: { $ne: false },
                    prices: { $elemMatch: priceCondition },
                },
            };
        }

        // In-stock filtering
        if (inStockProductIds !== null && isInStock !== null) {
            if (isInStock) {
                baseMatch._id = { $in: inStockProductIds };
            } else {
                baseMatch._id = { $nin: inStockProductIds };
            }
        }

        // 4. Resolve Sorting Stage
        let sortStage: Record<string, any> = { createdAt: -1 };
        if (sortBy === "relevance" && query.q) {
            sortStage = { score: { $meta: "textScore" }, createdAt: -1 };
        } else if (sortBy === "price_asc") {
            sortStage = { "variants.prices.amount": 1, createdAt: -1 };
        } else if (sortBy === "price_desc") {
            sortStage = { "variants.prices.amount": -1, createdAt: -1 };
        } else if (sortBy === "rating") {
            sortStage = { averageRating: -1, reviewCount: -1, createdAt: -1 };
        } else if (sortBy === "newest") {
            sortStage = { createdAt: -1 };
        }

        // 5. Faceted Aggregation Execution
        const [aggregationResult] = await ProductModel.aggregate([
            { $match: baseMatch },
            {
                $facet: {
                    items: [
                        ...(query.q && sortBy === "relevance"
                            ? [{ $addFields: { score: { $meta: "textScore" } } }]
                            : []),
                        { $sort: sortStage },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                    ],
                    totalCount: [{ $count: "count" }],
                    brands: [
                        { $match: { brand: { $exists: true, $ne: null } } },
                        { $match: { brand: { $ne: "" } } },
                        { $group: { _id: "$brand", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 20 },
                    ],
                    categories: [
                        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 20 },
                    ],
                    priceRange: [
                        { $unwind: "$variants" },
                        { $match: { "variants.isActive": { $ne: false } } },
                        { $unwind: "$variants.prices" },
                        { $match: { "variants.prices.currency": currency } },
                        {
                            $group: {
                                _id: null,
                                min: { $min: "$variants.prices.amount" },
                                max: { $max: "$variants.prices.amount" },
                            },
                        },
                    ],
                },
            },
        ]).exec();

        const rawItems: RawSearchProduct[] = aggregationResult?.items || [];
        const total = aggregationResult?.totalCount?.[0]?.count || 0;
        const totalPages = Math.ceil(total / limit);

        // 6. Batch Resolve Category Names & Inventories for Returned Items
        const categoryIdsToFetch = Array.from(
            new Set([
                ...rawItems.map((item) => item.categoryId?.toString()),
                ...(aggregationResult?.categories || []).map((c: any) => c._id?.toString()),
            ].filter(Boolean))
        );

        const categories = await CategoryModel.find({ _id: { $in: categoryIdsToFetch } })
            .select("_id name slug")
            .lean()
            .exec();

        const categoryNameMap = new Map<string, string>();
        const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
        for (const cat of categories) {
            const catId = (cat as any)._id.toString();
            categoryNameMap.set(catId, cat.name);
            categoryMap.set(catId, {
                id: catId,
                name: cat.name,
                slug: cat.slug,
            });
        }

        // Batch resolve inventories for returned items' variants
        const variantIds: string[] = [];
        for (const item of rawItems) {
            for (const v of item.variants || []) {
                const vid = v.id || (v as any)._id?.toString();
                if (vid) variantIds.push(vid);
            }
        }

        const validVariantObjectIds = variantIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));

        const inventories = await InventoryModel.find({
            $or: [
                { variantId: { $in: validVariantObjectIds } },
                { variantId: { $in: variantIds } },
            ],
        })
            .lean()
            .exec();

        const inventoryMap = new Map<string, { availableQuantity: number; inStock: boolean }>();
        for (const inv of inventories) {
            const vId = (inv.variantId as any)?.toString?.() ?? String(inv.variantId);
            const current = inventoryMap.get(vId) || { availableQuantity: 0, inStock: false };
            const available = Math.max(0, inv.onHand - inv.reserved - inv.safetyStock);
            current.availableQuantity += available;
            if (available > 0 || inv.allowBackorder) {
                current.inStock = true;
            }
            inventoryMap.set(vId, current);
        }

        // 7. Format Facets
        const brandFacets: SearchFacetBrand[] = (aggregationResult?.brands || []).map((b: any) => ({
            name: b._id,
            count: b.count,
        }));

        const categoryFacets: SearchFacetCategory[] = (aggregationResult?.categories || [])
            .map((c: any) => {
                const catInfo = categoryMap.get(c._id?.toString());
                return {
                    id: c._id?.toString(),
                    name: catInfo?.name || "Unknown",
                    slug: catInfo?.slug || "",
                    count: c.count,
                };
            })
            .filter((c: SearchFacetCategory) => c.name !== "Unknown");

        const priceMin = aggregationResult?.priceRange?.[0]?.min ?? 0;
        const priceMax = aggregationResult?.priceRange?.[0]?.max ?? 0;
        const priceFacet: SearchFacetPrice = {
            min: Number(priceMin.toFixed(2)),
            max: Number(priceMax.toFixed(2)),
        };

        const mappedItems = rawItems.map((item) =>
            this.mapper.mapProductToItem(item, categoryNameMap, inventoryMap, currency)
        );

        const pagination: SearchPagination = {
            page,
            limit,
            total,
            totalPages,
        };

        return this.mapper.buildSearchResponse(mappedItems, pagination, {
            brands: brandFacets,
            categories: categoryFacets,
            price: priceFacet,
        });
    }
}

export const searchService = new SearchService();
