import { Types } from "mongoose";
import { AppError } from "../../../utils/app-error.js";
import { ProductModel } from "../../products/product.model.js";
import { cartService, CartService } from "../../cart/services/cart.service.js";
import { wishlistRepository, WishlistRepository } from "../repositories/wishlist.repository.js";
import { wishlistMapper, WishlistMapper } from "../mapper/wishlist.mapper.js";
import type {
    WishlistResponse,
    AddToWishlistInput,
    MoveWishlistItemToCartInput,
    MoveWishlistItemToCartResponse,
} from "@shopsphere/types";

export class WishlistService {
    constructor(
        private readonly repo: WishlistRepository = wishlistRepository,
        private readonly mapper: WishlistMapper = wishlistMapper,
        private readonly cartSvc: CartService = cartService
    ) {}

    /**
     * Retrieve current authenticated customer's wishlist with dynamically resolved
     * product catalog details, current pricing, and informational inventory.
     */
    async getWishlist(userId: string, preferredCurrency: string = "USD"): Promise<WishlistResponse> {
        const wishlist = await this.repo.findOrCreate(userId);
        return await this.mapper.mapToResponse(wishlist, preferredCurrency);
    }

    /**
     * Add an item to the wishlist with duplicate protection at both service
     * and atomic database levels.
     */
    async addItem(
        userId: string,
        input: AddToWishlistInput,
        preferredCurrency: string = "USD"
    ): Promise<WishlistResponse> {
        if (!Types.ObjectId.isValid(input.productId)) {
            throw new AppError("Invalid product ID format", 400, "INVALID_PRODUCT_ID");
        }

        // 1. Verify that product exists
        const product = await ProductModel.findById(input.productId).lean().exec();
        if (!product) {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }

        // 2. Verify that specified variant belongs to the product
        const variant = product.variants?.find(
            (v: any) => v.id === input.variantId || v._id?.toString() === input.variantId
        );
        if (!variant) {
            throw new AppError(
                `Variant '${input.variantId}' does not belong to product '${product.title}'`,
                404,
                "VARIANT_NOT_FOUND"
            );
        }

        // 3. Atomically add item (idempotent; ignores if already present)
        const updatedWishlist = await this.repo.addItem(userId, input.productId, input.variantId);
        return await this.mapper.mapToResponse(updatedWishlist, preferredCurrency);
    }

    /**
     * Remove a single item from the customer's wishlist by variantId.
     */
    async removeItem(
        userId: string,
        variantId: string,
        preferredCurrency: string = "USD"
    ): Promise<WishlistResponse> {
        const updatedWishlist = await this.repo.removeItem(userId, variantId);
        const resolved = updatedWishlist ?? (await this.repo.findOrCreate(userId));
        return await this.mapper.mapToResponse(resolved, preferredCurrency);
    }

    /**
     * Clear all items from customer's wishlist.
     */
    async clearWishlist(userId: string, preferredCurrency: string = "USD"): Promise<WishlistResponse> {
        const updatedWishlist = await this.repo.clearWishlist(userId);
        const resolved = updatedWishlist ?? (await this.repo.findOrCreate(userId));
        return await this.mapper.mapToResponse(resolved, preferredCurrency);
    }

    /**
     * Coordinates moving an item from the customer's wishlist to their active cart.
     * Delegates cart validation and mutation directly to CartService.
     * Removes the item from wishlist only when CartService successfully adds it.
     */
    async moveItemToCart(
        userId: string,
        variantId: string,
        options: MoveWishlistItemToCartInput = {}
    ): Promise<MoveWishlistItemToCartResponse> {
        // 1. Check if user has this item in wishlist
        const wishlist = await this.repo.findByUserId(userId);
        if (!wishlist) {
            throw new AppError("Wishlist not found", 404, "WISHLIST_NOT_FOUND");
        }

        const wishlistItem = wishlist.items.find((i) => i.variantId === variantId);
        if (!wishlistItem) {
            throw new AppError(
                `Item with variantId '${variantId}' not found in wishlist`,
                404,
                "WISHLIST_ITEM_NOT_FOUND"
            );
        }

        // 2. Delegate addition to CartService
        const cartResponse = await this.cartSvc.addItem(
            { type: "AUTHENTICATED", userId },
            {
                productId: wishlistItem.productId.toString(),
                variantId: wishlistItem.variantId,
                quantity: options.quantity ?? 1,
                ...(options.currency ? { currency: options.currency } : {}),
            }
        );

        // 3. On successful cart addition, remove the item from customer's wishlist
        const updatedWishlist = await this.repo.removeItem(userId, variantId);
        const resolvedWishlist = updatedWishlist ?? (await this.repo.findOrCreate(userId));
        const mappedWishlist = await this.mapper.mapToResponse(
            resolvedWishlist,
            options.currency || cartResponse.currency
        );

        return {
            cart: cartResponse,
            wishlist: mappedWishlist,
            movedVariantId: variantId,
        };
    }
}

export const wishlistService = new WishlistService();
