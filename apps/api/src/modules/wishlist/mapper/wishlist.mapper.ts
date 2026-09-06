import { Types } from "mongoose";
import { ProductModel } from "../../products/product.model.js";
import { InventoryModel } from "../../inventory/models/inventory.model.js";
import type { IWishlistDocument, IWishlistItem } from "../models/wishlist.model.js";
import type {
    WishlistResponse,
    WishlistItemResponse,
    WishlistItemPrice,
    WishlistItemInventory,
} from "@ecommers/types";

export class WishlistMapper {
    async mapToResponse(
        wishlist: IWishlistDocument,
        preferredCurrency: string = "USD"
    ): Promise<WishlistResponse> {
        if (!wishlist.items || wishlist.items.length === 0) {
            return {
                id: wishlist._id.toString(),
                userId: wishlist.userId.toString(),
                items: [],
                itemCount: 0,
                createdAt: wishlist.createdAt ? wishlist.createdAt.toISOString() : new Date().toISOString(),
                updatedAt: wishlist.updatedAt ? wishlist.updatedAt.toISOString() : new Date().toISOString(),
            };
        }

        // 1. Collect unique productIds and variantIds for batch querying
        const productIds = Array.from(new Set(wishlist.items.map((i) => i.productId.toString())));
        const variantIds = Array.from(new Set(wishlist.items.map((i) => i.variantId)));

        const validProductObjectIds = productIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));
        const validVariantObjectIds = variantIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));

        // 2. Batch fetch Products and Inventories
        const [products, inventories] = await Promise.all([
            ProductModel.find({ _id: { $in: validProductObjectIds } }).lean().exec(),
            InventoryModel.find({
                $or: [
                    { variantId: { $in: validVariantObjectIds } },
                    { variantId: { $in: variantIds } },
                ],
            }).lean().exec(),
        ]);

        const productMap = new Map<string, (typeof products)[0]>();
        for (const p of products) {
            productMap.set((p as any)._id.toString(), p);
        }

        // Group inventories by variantId to compute total available stock
        const inventoryMap = new Map<
            string,
            { totalOnHand: number; totalReserved: number; totalSafetyStock: number; allowBackorder: boolean }
        >();
        for (const inv of inventories) {
            const vId = (inv.variantId as any)?.toString?.() ?? String(inv.variantId);
            const current = inventoryMap.get(vId) || {
                totalOnHand: 0,
                totalReserved: 0,
                totalSafetyStock: 0,
                allowBackorder: false,
            };
            current.totalOnHand += inv.onHand || 0;
            current.totalReserved += inv.reserved || 0;
            current.totalSafetyStock += inv.safetyStock || 0;
            if (inv.allowBackorder) {
                current.allowBackorder = true;
            }
            inventoryMap.set(vId, current);
        }

        // 3. Map each item with dynamic real-time resolution
        const mappedItems: WishlistItemResponse[] = wishlist.items.map((item: IWishlistItem) => {
            const product = productMap.get(item.productId.toString());
            const variant = product?.variants?.find(
                (v: any) => v.id === item.variantId || v._id?.toString() === item.variantId
            );

            // Informational inventory calculation
            const invStats = inventoryMap.get(item.variantId);
            let inStock = false;
            let availableQuantity = 0;

            if (invStats) {
                availableQuantity = Math.max(
                    0,
                    invStats.totalOnHand - invStats.totalReserved - invStats.totalSafetyStock
                );
                inStock = availableQuantity > 0 || invStats.allowBackorder;
            }

            const inventory: WishlistItemInventory = {
                inStock,
                availableQuantity,
            };

            // Dynamic price resolution in requested or base currency
            let price: WishlistItemPrice | null = null;
            if (variant && Array.isArray(variant.prices) && variant.prices.length > 0) {
                const matchedPrice =
                    variant.prices.find(
                        (p: any) => p.currency?.toUpperCase() === preferredCurrency.toUpperCase()
                    ) ||
                    variant.prices.find(
                        (p: any) => p.currency?.toUpperCase() === product?.baseCurrency?.toUpperCase()
                    ) ||
                    variant.prices[0];

                if (matchedPrice) {
                    price = {
                        currency: matchedPrice.currency,
                        amount: matchedPrice.amount,
                        ...(matchedPrice.compareAtAmount !== undefined
                            ? { compareAtAmount: matchedPrice.compareAtAmount }
                            : {}),
                    };
                }
            }

            // Thumbnail resolution: explicit product thumbnail or first image
            const thumbnail = product?.thumbnail || product?.images?.[0];

            const itemResponse: WishlistItemResponse = {
                productId: item.productId.toString(),
                variantId: item.variantId,
                addedAt: item.addedAt ? item.addedAt.toISOString() : new Date().toISOString(),
                title: product?.title ?? "Product Unavailable",
                slug: product?.slug ?? "",
                sku: variant?.sku ?? "UNKNOWN",
                ...(variant?.title ? { variantTitle: variant.title } : {}),
                ...(thumbnail ? { thumbnail } : {}),
                status: (product?.status as any) ?? "ARCHIVED",
                isActive: variant?.isActive ?? false,
                price,
                inventory,
            };

            return itemResponse;
        });

        return {
            id: wishlist._id.toString(),
            userId: wishlist.userId.toString(),
            items: mappedItems,
            itemCount: mappedItems.length,
            createdAt: wishlist.createdAt ? wishlist.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: wishlist.updatedAt ? wishlist.updatedAt.toISOString() : new Date().toISOString(),
        };
    }
}

export const wishlistMapper = new WishlistMapper();
