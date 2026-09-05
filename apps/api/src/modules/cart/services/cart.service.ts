import { Types } from "mongoose";
import {
    AddToCartInput,
    CartItemAvailabilityStatus,
    CartItemResponse,
    CartResponse,
    MergeCartResultResponse,
    MergeStockIssue,
    UpdateCartItemQuantityInput,
} from "@shopsphere/types";
import { AppError } from "../../../utils/app-error.js";
import { withTransaction } from "../../../database/transaction.js";
import { ProductModel } from "../../products/product.model.js";
import {
    inventoryRepository,
    InventoryRepository,
} from "../../inventory/repositories/inventory.repository.js";
import {
    cartRepository,
    CartRepository,
} from "../repositories/cart.repository.js";
import {
    CartDocument,
    CartIdentity,
    ICartItem,
    ICartItemPriceSnapshot,
} from "../types/cart.types.js";

// In-memory idempotency cache for mutation safety (keyed by idempotency token, expires after 5 mins)
interface CachedIdempotency {
    response: CartResponse;
    expiresAt: number;
}
const idempotencyCache = new Map<string, CachedIdempotency>();

export class CartService {
    constructor(
        private readonly repo: CartRepository = cartRepository,
        private readonly inventoryRepo: InventoryRepository = inventoryRepository
    ) {}

    /* -------------------------------------------------------------------------- */
    /* Mapping Helpers                                                            */
    /* -------------------------------------------------------------------------- */

    async mapCartToResponse(cart: CartDocument): Promise<CartResponse> {
        const mappedItems: CartItemResponse[] = await Promise.all(
            cart.items.map(async (item) => {
                // Soft inventory availability check for UX status badge
                const inventories = await this.inventoryRepo.findByVariant(item.variantId);

                let totalOnHand = 0;
                let totalReserved = 0;
                let totalSafetyStock = 0;
                let allowBackorder = false;

                for (const inv of inventories) {
                    totalOnHand += inv.onHand;
                    totalReserved += inv.reserved;
                    totalSafetyStock += inv.safetyStock;
                    if (inv.allowBackorder) {
                        allowBackorder = true;
                    }
                }

                const available = Math.max(0, totalOnHand - totalReserved - totalSafetyStock);

                let availabilityStatus: CartItemAvailabilityStatus = "IN_STOCK";
                if (available >= item.quantity) {
                    availabilityStatus = "IN_STOCK";
                } else if (available === 0 && !allowBackorder) {
                    availabilityStatus = "OUT_OF_STOCK";
                } else if (available === 0 && allowBackorder) {
                    availabilityStatus = "BACKORDERED";
                } else {
                    availabilityStatus = "PARTIALLY_BACKORDERED";
                }

                const unitPrice = item.priceSnapshot.amount;
                const lineTotal = Number((unitPrice * item.quantity).toFixed(2));

                const itemResponse: CartItemResponse = {
                    id: item._id.toString(),
                    productId: item.productId.toString(),
                    variantId: item.variantId,
                    sku: item.sku,
                    title: item.title,
                    ...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
                    priceSnapshot: {
                        currency: item.priceSnapshot.currency,
                        amount: item.priceSnapshot.amount,
                        ...(item.priceSnapshot.compareAtAmount !== undefined
                            ? { compareAtAmount: item.priceSnapshot.compareAtAmount }
                            : {}),
                        capturedAt: item.priceSnapshot.capturedAt.toISOString(),
                    },
                    quantity: item.quantity,
                    lineTotal,
                    ...(item.attributes ? { attributes: item.attributes } : {}),
                    availabilityStatus,
                };

                return itemResponse;
            })
        );

        const isGuest = !cart.userId && Boolean(cart.sessionId);

        return {
            id: cart._id.toString(),
            ...(cart.userId ? { userId: cart.userId.toString() } : {}),
            // Note: sessionId is intentionally omitted from the response
            status: cart.status,
            currency: cart.currency,
            items: mappedItems,
            summary: {
                subtotal: cart.subtotal,
                itemCount: cart.itemCount,
                uniqueItemCount: cart.uniqueItemCount,
                currency: cart.currency,
            },
            version: cart.version,
            ...(cart.lockedAt ? { lockedAt: cart.lockedAt.toISOString() } : {}),
            expiresAt: isGuest && cart.expiresAt ? cart.expiresAt.toISOString() : null,
            createdAt: cart.createdAt.toISOString(),
            updatedAt: cart.updatedAt.toISOString(),
        };
    }

    /* -------------------------------------------------------------------------- */
    /* Read Operations (GET does NOT extend TTL)                                  */
    /* -------------------------------------------------------------------------- */

    async getCart(identity: CartIdentity): Promise<CartResponse> {
        let cart = await this.repo.findActiveByIdentity(identity);

        if (!cart) {
            cart = await this.repo.findOrCreateActiveCart(identity, "USD");
        }

        return await this.mapCartToResponse(cart);
    }

    /* -------------------------------------------------------------------------- */
    /* Write Mutations (Extends Guest TTL, Enforces State Machine & Checks)       */
    /* -------------------------------------------------------------------------- */

    async addItem(
        identity: CartIdentity,
        input: AddToCartInput,
        idempotencyKey?: string
    ): Promise<CartResponse> {
        // 1. Idempotency Check
        if (idempotencyKey) {
            const cached = idempotencyCache.get(idempotencyKey);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.response;
            }
        }

        // 2. Validate Product Existence & Status
        const product = await ProductModel.findById(input.productId);
        if (!product) {
            throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
        }
        if (product.status !== "PUBLISHED") {
            throw new AppError(
                `Cannot add product with status '${product.status}' to cart`,
                400,
                "PRODUCT_NOT_PUBLISHED"
            );
        }

        // 3. Find Variant
        const variant = product.variants.find(
            (v) => v.id === input.variantId || (v as any)._id?.toString() === input.variantId
        );
        if (!variant) {
            throw new AppError(`Variant with id '${input.variantId}' not found`, 404, "VARIANT_NOT_FOUND");
        }
        if (variant.isActive === false) {
            throw new AppError(`Variant '${variant.sku}' is currently inactive`, 400, "VARIANT_INACTIVE");
        }

        // 4. Resolve Active Cart to Check Currency Invariant
        const initialCurrency = input.currency || product.baseCurrency || "USD";
        const cart = await this.repo.findOrCreateActiveCart(identity, initialCurrency);

        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }

        // 5. Verify Variant has Price in Cart Currency
        const variantPrice = variant.prices.find(
            (p) => p.currency.toUpperCase() === cart.currency.toUpperCase()
        );
        if (!variantPrice) {
            throw new AppError(
                `Variant '${variant.sku}' does not support cart currency '${cart.currency}'`,
                400,
                "CURRENCY_UNAVAILABLE"
            );
        }

        // 6. Soft Stock Check
        const inventories = await this.inventoryRepo.findByVariant(input.variantId);
        let totalOnHand = 0;
        let totalReserved = 0;
        let totalSafetyStock = 0;
        let allowBackorder = false;

        for (const inv of inventories) {
            totalOnHand += inv.onHand;
            totalReserved += inv.reserved;
            totalSafetyStock += inv.safetyStock;
            if (inv.allowBackorder) {
                allowBackorder = true;
            }
        }

        const available = Math.max(0, totalOnHand - totalReserved - totalSafetyStock);
        const existingItem = cart.items.find((i) => i.variantId === input.variantId);
        const totalRequested = (existingItem?.quantity ?? 0) + input.quantity;

        if (!allowBackorder && totalRequested > available) {
            throw new AppError(
                `Insufficient stock for item '${variant.sku}'. Requested: ${totalRequested}, Available: ${available}`,
                400,
                "INSUFFICIENT_STOCK"
            );
        }

        // 7. Price Display Snapshot
        const priceSnapshot: ICartItemPriceSnapshot = {
            currency: variantPrice.currency.toUpperCase(),
            amount: variantPrice.amount,
            ...(variantPrice.compareAtAmount !== undefined
                ? { compareAtAmount: variantPrice.compareAtAmount }
                : {}),
            capturedAt: new Date(),
        };

        const cartItemData: ICartItem = {
            productId: product._id as Types.ObjectId,
            variantId: input.variantId,
            sku: variant.sku,
            title: `${product.title} - ${variant.title}`,
            ...(product.thumbnail ? { thumbnail: product.thumbnail } : {}),
            priceSnapshot,
            quantity: input.quantity,
            ...(variant.attributes ? { attributes: variant.attributes } : {}),
        };

        const updatedCart = await this.repo.addItem(
            cart._id,
            cartItemData,
            input.expectedVersion
        );

        const response = await this.mapCartToResponse(updatedCart);

        // Cache Idempotency result for 5 minutes
        if (idempotencyKey) {
            idempotencyCache.set(idempotencyKey, {
                response,
                expiresAt: Date.now() + 5 * 60 * 1000,
            });
        }

        return response;
    }

    async updateItemQuantity(
        identity: CartIdentity,
        variantId: string,
        input: UpdateCartItemQuantityInput
    ): Promise<CartResponse> {
        const cart = await this.repo.findActiveByIdentity(identity);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }
        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }

        // If increasing quantity, perform soft stock check
        if (input.quantity > 0) {
            const inventories = await this.inventoryRepo.findByVariant(variantId);
            let totalOnHand = 0;
            let totalReserved = 0;
            let totalSafetyStock = 0;
            let allowBackorder = false;

            for (const inv of inventories) {
                totalOnHand += inv.onHand;
                totalReserved += inv.reserved;
                totalSafetyStock += inv.safetyStock;
                if (inv.allowBackorder) {
                    allowBackorder = true;
                }
            }

            const available = Math.max(0, totalOnHand - totalReserved - totalSafetyStock);
            if (!allowBackorder && input.quantity > available) {
                throw new AppError(
                    `Insufficient stock. Requested: ${input.quantity}, Available: ${available}`,
                    400,
                    "INSUFFICIENT_STOCK"
                );
            }
        }

        const updatedCart = await this.repo.updateItemQuantity(
            cart._id,
            variantId,
            input.quantity,
            input.expectedVersion
        );

        return await this.mapCartToResponse(updatedCart);
    }

    async removeItem(
        identity: CartIdentity,
        variantId: string,
        expectedVersion?: number
    ): Promise<CartResponse> {
        const cart = await this.repo.findActiveByIdentity(identity);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }
        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }

        const updatedCart = await this.repo.removeItem(cart._id, variantId, expectedVersion);
        return await this.mapCartToResponse(updatedCart);
    }

    async clearCart(
        identity: CartIdentity,
        expectedVersion?: number
    ): Promise<CartResponse> {
        const cart = await this.repo.findActiveByIdentity(identity);
        if (!cart) {
            throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
        }
        if (cart.status === "LOCKED") {
            throw new AppError("Cart is currently locked for checkout", 409, "CART_LOCKED");
        }

        const updatedCart = await this.repo.clearCart(cart._id, expectedVersion);
        return await this.mapCartToResponse(updatedCart);
    }

    /* -------------------------------------------------------------------------- */
    /* Guest Cart Merging (Atomic MongoDB Transaction)                           */
    /* -------------------------------------------------------------------------- */

    async mergeGuestCart(
        userId: string,
        guestSessionId: string
    ): Promise<MergeCartResultResponse> {
        return await withTransaction(async (session) => {
            const guestCart = await this.repo.findActiveBySessionId(guestSessionId, session);
            const userCart = await this.repo.findOrCreateActiveCart(
                { type: "AUTHENTICATED", userId },
                guestCart?.currency || "USD",
                session
            );

            if (!guestCart || guestCart.items.length === 0) {
                return {
                    cart: await this.mapCartToResponse(userCart),
                    merged: false,
                    issues: [],
                };
            }

            if (userCart.status === "LOCKED") {
                throw new AppError("User cart is locked for checkout", 409, "CART_LOCKED");
            }

            // Currency invariant check
            if (
                userCart.items.length > 0 &&
                userCart.currency.toUpperCase() !== guestCart.currency.toUpperCase()
            ) {
                throw new AppError(
                    `Cannot merge guest cart (${guestCart.currency}) into user cart (${userCart.currency}): currency mismatch`,
                    400,
                    "CURRENCY_MISMATCH"
                );
            }

            // If user cart was empty, adopt guest cart's currency
            if (userCart.items.length === 0) {
                userCart.currency = guestCart.currency.toUpperCase();
            }

            const issues: MergeStockIssue[] = [];

            for (const guestItem of guestCart.items) {
                // Check variant availability
                const inventories = await this.inventoryRepo.findByVariant(guestItem.variantId, session);
                let totalOnHand = 0;
                let totalReserved = 0;
                let totalSafetyStock = 0;
                let allowBackorder = false;

                for (const inv of inventories) {
                    totalOnHand += inv.onHand;
                    totalReserved += inv.reserved;
                    totalSafetyStock += inv.safetyStock;
                    if (inv.allowBackorder) {
                        allowBackorder = true;
                    }
                }

                const available = Math.max(0, totalOnHand - totalReserved - totalSafetyStock);

                // Check product & variant validity
                const product = await ProductModel.findById(guestItem.productId).session(session);
                const variant = product?.variants.find(
                    (v) => v.id === guestItem.variantId || (v as any)._id?.toString() === guestItem.variantId
                );

                if (!product || product.status !== "PUBLISHED") {
                    issues.push({
                        variantId: guestItem.variantId,
                        sku: guestItem.sku,
                        requested: guestItem.quantity,
                        resulting: 0,
                        available: 0,
                        reason: "PRODUCT_UNPUBLISHED",
                    });
                    continue;
                }

                if (!variant || variant.isActive === false) {
                    issues.push({
                        variantId: guestItem.variantId,
                        sku: guestItem.sku,
                        requested: guestItem.quantity,
                        resulting: 0,
                        available: 0,
                        reason: "VARIANT_INACTIVE",
                    });
                    continue;
                }

                const existingUserItem = userCart.items.find(
                    (i) => i.variantId === guestItem.variantId
                );
                const requested = (existingUserItem?.quantity ?? 0) + guestItem.quantity;

                if (!allowBackorder && requested > available) {
                    // Stock is insufficient: Cap resulting quantity at available and record issue
                    const resulting = Math.min(requested, available);

                    issues.push({
                        variantId: guestItem.variantId,
                        sku: guestItem.sku,
                        requested,
                        resulting,
                        available,
                        reason: resulting === 0 ? "OUT_OF_STOCK" : "INSUFFICIENT_STOCK",
                    });

                    if (resulting > 0) {
                        if (existingUserItem) {
                            existingUserItem.quantity = resulting;
                            existingUserItem.priceSnapshot = guestItem.priceSnapshot;
                        } else {
                            userCart.items.push({
                                productId: guestItem.productId,
                                variantId: guestItem.variantId,
                                sku: guestItem.sku,
                                title: guestItem.title,
                                ...(guestItem.thumbnail ? { thumbnail: guestItem.thumbnail } : {}),
                                priceSnapshot: guestItem.priceSnapshot,
                                quantity: resulting,
                                ...(guestItem.attributes ? { attributes: guestItem.attributes } : {}),
                            } as any);
                        }
                    } else if (existingUserItem && resulting === 0) {
                        // User cart had some but available is 0, remove item
                        const idx = userCart.items.findIndex(
                            (i) => i.variantId === guestItem.variantId
                        );
                        if (idx !== -1) userCart.items.splice(idx, 1);
                    }
                } else {
                    // Stock is sufficient or backorders allowed
                    if (existingUserItem) {
                        existingUserItem.quantity = requested;
                        existingUserItem.priceSnapshot = guestItem.priceSnapshot;
                    } else {
                        userCart.items.push({
                            productId: guestItem.productId,
                            variantId: guestItem.variantId,
                            sku: guestItem.sku,
                            title: guestItem.title,
                            ...(guestItem.thumbnail ? { thumbnail: guestItem.thumbnail } : {}),
                            priceSnapshot: guestItem.priceSnapshot,
                            quantity: requested,
                            ...(guestItem.attributes ? { attributes: guestItem.attributes } : {}),
                        } as any);
                    }
                }
            }

            // Save updated user cart
            userCart.version += 1;
            await userCart.save({ session });

            // Mark guest cart as merged (terminal state)
            guestCart.status = "MERGED";
            guestCart.version += 1;
            await guestCart.save({ session });

            return {
                cart: await this.mapCartToResponse(userCart),
                merged: true,
                issues,
            };
        });
    }
}

export const cartService = new CartService();
